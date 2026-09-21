import "server-only";

import { apiFetch, apiFetchColeccion, nuevoClientUuid } from "../api-client";
import { requireToken } from "./shared";

// DTOs tomados del OpenAPI real (GET /docs-json), no documentados con tanto
// detalle en Swagger UI en texto libre. AltaDto no tiene remito/letraDia: el
// backend asigna la "guia" solo. Tampoco tiene observaciones, rutaId ni
// esSobre — no existen en la etapa 1 del backend (ver notas en
// claude/plan-integracion-backend.md del proyecto).
export type TipoEnvioApi = "paqueteria" | "efectivo" | "tramite" | "interno";
export type LugarPagoApi = "origen" | "destino" | "regreso";
export type FormaPagoApi = "contado" | "cuenta_corriente";

export interface RemitenteInput {
  nombre: string;
  telefono: string;
  clienteId?: string;
  // Domicilio de origen y localidad propia del remitente — changelog
  // 2026-09-15: AltaDto (y ahora tambien el PATCH) los acepta inline,
  // espejando a destinatario. Opcionales: antes de este changelog el alta
  // no pedia domicilio del remitente, asi que sigue andando sin ellos.
  calle?: string;
  numero?: string;
  piso?: string;
  referencia?: string;
  localidadId?: string;
}

export interface DestinatarioInput {
  nombre: string;
  telefono: string;
  calle: string;
  numero?: string;
  piso?: string;
  referencia?: string;
  localidadId: string;
  sectorId: string;
  clienteId?: string;
  domicilioId?: string;
}

export interface CrearEnvioInput {
  remitente: RemitenteInput;
  destinatario: DestinatarioInput;
  cantidadBultos: number;
  fleteImporte: number;
  tipo: TipoEnvioApi;
  lugarPago: LugarPagoApi;
  formaPago: FormaPagoApi;
  contrarreembolsoImporte?: number;
  remitoManualNumero?: string;
  // Campos nuevos del changelog 2026-09-15 — confirmados por nombre real
  // porque ya aparecen tal cual en GET /envios/:numero/remito (RemitoApi,
  // mas abajo). `gasto` mantiene el nombre viejo del backend: en la
  // practica es el monto cobrado por billetera virtual/digital, no un
  // "gasto" en el sentido contable.
  valorDeclarado?: number;
  gasto?: number;
  observaciones?: string;
}

// Misma forma "de negocio" que CrearEnvioInput (nested remitente/
// destinatario) pero todo opcional — es lo que arma la UI. El wire format
// real que espera PATCH /envios/:id es DISTINTO: confirmado en vivo
// (2026-09-15, ver claude/plan-integracion-backend.md seccion 14) que el
// backend rechaza los objetos anidados con 400 "property remitente should
// not exist; property destinatario should not exist" — a diferencia de
// POST /envios (AltaDto), el PATCH quiere columnas planas (mismo naming que
// devuelve EnvioApi: remitenteNombre, destinatarioCalle, etc.). Todos los
// demas campos (cantidadBultos, fleteImporte, tipo, lugarPago, formaPago,
// contrarreembolsoImporte, remitoManualNumero, valorDeclarado, gasto,
// observaciones) SI se confirmaron aceptados tal cual, sin aplanar.
// actualizarEnvio() hace la conversion antes de mandar el PATCH para que el
// resto de la app no tenga que conocer esta diferencia.
export interface ActualizarEnvioInput {
  remitente?: Partial<RemitenteInput>;
  destinatario?: Partial<DestinatarioInput>;
  cantidadBultos?: number;
  fleteImporte?: number;
  tipo?: TipoEnvioApi;
  lugarPago?: LugarPagoApi;
  formaPago?: FormaPagoApi;
  contrarreembolsoImporte?: number;
  remitoManualNumero?: string;
  valorDeclarado?: number;
  gasto?: number;
  observaciones?: string;
}

// Wire format real de PATCH /envios/:id — columnas planas. Nombres tomados
// de EnvioApi (la forma ya confirmada en vivo de la respuesta del backend
// para este mismo recurso), asumiendo que el DTO de edicion los espeja.
// remitenteCalle/Numero/Piso/Referencia son una inferencia razonable por
// simetria con destinatarioCalle/etc (no estan en EnvioApi porque, antes de
// este changelog, el remitente no tenia domicilio) — si el backend los
// rechaza algun dia, va a ser con el mismo tipo de error 400 explicito que
// ya vimos, facil de diagnosticar.
interface PatchEnvioWire {
  remitenteNombre?: string;
  remitenteTelefono?: string;
  clienteRemitenteId?: string;
  remitenteCalle?: string;
  remitenteNumero?: string;
  remitentePiso?: string;
  remitenteReferencia?: string;
  destinatarioNombre?: string;
  destinatarioTelefono?: string;
  destinatarioCalle?: string;
  destinatarioNumero?: string;
  destinatarioPiso?: string;
  destinatarioReferencia?: string;
  clienteDestinatarioId?: string;
  cantidadBultos?: number;
  fleteImporte?: number;
  tipo?: TipoEnvioApi;
  lugarPago?: LugarPagoApi;
  formaPago?: FormaPagoApi;
  contrarreembolsoImporte?: number;
  remitoManualNumero?: string;
  valorDeclarado?: number;
  gasto?: number;
  observaciones?: string;
  clientUuid: string;
}

function aplanarParaPatch(data: ActualizarEnvioInput, clientUuid: string): PatchEnvioWire {
  const { remitente, destinatario, ...resto } = data;
  const wire: PatchEnvioWire = { ...resto, clientUuid };
  if (remitente) {
    if (remitente.nombre !== undefined) wire.remitenteNombre = remitente.nombre;
    if (remitente.telefono !== undefined) wire.remitenteTelefono = remitente.telefono;
    if (remitente.clienteId !== undefined) wire.clienteRemitenteId = remitente.clienteId;
    if (remitente.calle !== undefined) wire.remitenteCalle = remitente.calle;
    if (remitente.numero !== undefined) wire.remitenteNumero = remitente.numero;
    if (remitente.piso !== undefined) wire.remitentePiso = remitente.piso;
    if (remitente.referencia !== undefined) wire.remitenteReferencia = remitente.referencia;
    // remitente.localidadId NO se manda: confirmado en vivo (2026-09-15) que
    // el backend rechaza `localidadOrigenId` en el PATCH con 400 "property
    // localidadOrigenId should not exist" — a diferencia de lo que decia el
    // changelog textual, la localidad de origen NO es editable por esta via
    // una vez creado el envio (solo lo es en el alta, POST /envios). Ver
    // claude/plan-integracion-backend.md, seccion 14.
  }
  if (destinatario) {
    if (destinatario.nombre !== undefined) wire.destinatarioNombre = destinatario.nombre;
    if (destinatario.telefono !== undefined) wire.destinatarioTelefono = destinatario.telefono;
    if (destinatario.calle !== undefined) wire.destinatarioCalle = destinatario.calle;
    if (destinatario.numero !== undefined) wire.destinatarioNumero = destinatario.numero;
    if (destinatario.piso !== undefined) wire.destinatarioPiso = destinatario.piso;
    if (destinatario.referencia !== undefined) wire.destinatarioReferencia = destinatario.referencia;
    if (destinatario.clienteId !== undefined) wire.clienteDestinatarioId = destinatario.clienteId;
    // destinatario.localidadId / .sectorId NO se mandan: mismo hallazgo que
    // remitente arriba, confirmado en vivo — `localidadDestinoId` y
    // `sectorDestinoId` tambien vienen rechazados con "should not exist" en
    // el PATCH. Localidad/sector de destino tampoco son editables una vez
    // creado el envio, al menos con este DTO.
  }
  return wire;
}

// Shape real confirmado probando en vivo (POST /envios y GET /envios no
// vienen tipados en el OpenAPI, schema "object" generico). A diferencia de
// lo que se había supuesto: la respuesta es un objeto PLANO (no anida
// remitente/destinatario), los importes vienen como STRING decimal
// ("3500.00", no number), y la "guía" real que usa el negocio (letra+numero,
// ej. "C1") está en `guiaDiaria` — no en un campo "guia" ni en `numero`
// (que es un número de secuencia interno tipo "000000001-7", útil como id
// legible pero no es la guía que se imprime/dice en mostrador).
export interface EnvioApi {
  id: string;
  numero: string;
  remitoManualNumero: string | null;
  remitenteNombre: string;
  remitenteTelefono: string;
  clienteRemitenteId: string | null;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioCalle: string;
  destinatarioNumero: string | null;
  destinatarioPiso: string | null;
  destinatarioReferencia: string | null;
  clienteDestinatarioId: string | null;
  localidadOrigenId: string;
  localidadDestinoId: string;
  sectorDestinoId: string;
  recorridoId: string | null;
  puntoAltaId: string;
  cantidadBultos: number;
  fleteImporte: string;
  tipo: TipoEnvioApi;
  lugarPago: LugarPagoApi;
  formaPago: FormaPagoApi;
  contrarreembolsoImporte: string | null;
  camino: string;
  guiaDiariaNumero: number;
  estadoActual: string;
  custodiaActualUsuarioId: string | null;
  custodiaActualPuntoId: string | null;
  planillaActualId: string | null;
  creadoEn: string;
  guiaDiaria: string;
  ubicacion: string;
  [key: string]: unknown;
}

export async function crearEnvio(data: CrearEnvioInput, clientUuid?: string): Promise<EnvioApi> {
  const token = await requireToken();
  return apiFetch<EnvioApi>("/envios", {
    method: "POST",
    token,
    // Protocolo cc-relay, NOTA-2026-09-21-01, REQ-RM-11: si el caller ya
    // tiene un clientUuid de un intento anterior (rechazado, no consumido
    // por el backend), lo reusa en vez de generar uno nuevo — asi un
    // reintento tras corregir REMITO_EN_USO es idempotente de punta a punta.
    body: { ...data, clientUuid: clientUuid ?? nuevoClientUuid() },
  });
}

// PATCH /envios/:id — changelog 2026-09-15: ahora exige `clientUuid` en el
// body (como todo acto de custodia). Sin el, 400. Reintentar con el mismo
// clientUuid da 200 y un solo evento en el ledger (idempotencia); reusarlo
// en otro envio da 409 CLIENT_UUID_REUTILIZADO. Cada correccion real deja
// un evento "modificacion" en el ledger de custodia, visible en
// /seguimiento (ver seguimiento.ts, TipoEvento). Un PATCH que no cambia
// nada no escribe ni fila ni evento.
export async function actualizarEnvio(
  id: string,
  data: ActualizarEnvioInput
): Promise<EnvioApi> {
  const token = await requireToken();
  return apiFetch<EnvioApi>(`/envios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: aplanarParaPatch(data, nuevoClientUuid()),
  });
}

export async function listEnvios(params?: {
  estado?: string;
  limite?: number;
  // Changelog backend 2026-09-16: GET /envios ahora tambien acepta offset
  // (pagina real, no solo el tope `limite`). Opcional: quien no lo necesita
  // sigue trayendo desde el principio, igual que antes.
  offset?: number;
}): Promise<EnvioApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams();
  if (params?.estado) qs.set("estado", params.estado);
  qs.set("limite", String(params?.limite ?? 50));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const pagina = await apiFetchColeccion<EnvioApi>(`/envios?${qs.toString()}`, { token });
  return pagina.datos;
}

// GET /envios/{numero}/remito — nuevo endpoint del backend (changelog
// 2026-09-15), confirmado en vivo contra el backend real con una página de
// debug temporal (ver claude/plan-integracion-backend.md). A diferencia de
// EnvioApi, esta respuesta viene YA resuelta para imprimir: domicilios de
// remitente/destinatario como un solo string formateado (no calle/numero
// sueltos), localidades de origen/destino ya resueltas a nombre, montos
// COBRADO/A COBRAR/TOTAL ya calculados, y el propio encabezado de "empresa"
// (nombre/telefono/direccion del punto marcado como casa central) — no hace
// falta pegarle a /puntos por separado para armar el remito.
export interface RemitoApi {
  empresa: {
    nombre: string;
    telefono: string;
    direccion: string;
  };
  numero: string;
  // Numero de envio SIN el guion, ya formateado por el backend para
  // codificar directo en el codigo de barras (Code 39).
  codigoBarras: string;
  fechaAlta: string;
  guiaDiaria: string;
  remitoManualNumero: string | null;
  origen: { localidad: string };
  destino: { localidad: string };
  remitente: { nombre: string; telefono: string; domicilio: string };
  destinatario: { nombre: string; telefono: string; domicilio: string };
  cantidadBultos: number;
  tipo: TipoEnvioApi;
  observaciones: string | null;
  valorDeclarado: string | null;
  flete: string;
  contrarreembolso: string | null;
  gasto: string;
  pagoServicio: { lugar: LugarPagoApi; forma: FormaPagoApi };
  importes: { cobrado: string; aCobrar: string; total: string };
  levanto: string;
}

export async function getRemito(numero: string): Promise<RemitoApi> {
  const token = await requireToken();
  return apiFetch<RemitoApi>(`/envios/${encodeURIComponent(numero)}/remito`, { token });
}

