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
  // mas abajo). `gasto` es un cargo al cliente que cobra quien entrega
  // (el legacy lo asienta como GASTO COBRADO) -- NO es el pago por
  // billetera virtual/digital, como decia este comentario hasta el
  // 2026-10-01.
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

// Wire format real de PATCH /envios/:id — columnas planas, las 22 que
// declara `ModificarEnvioDto` en el contrato del backend (api/openapi.json,
// verificado el 2026-10-01). El backend rechaza con 400 cualquier propiedad
// que no este en esa lista, asi que este tipo es tambien la lista de lo que
// se puede mandar:
// - Los campos de domicilio del remitente (remitenteCalle/Numero/Piso/
//   Referencia) estaban anotados aca como "inferidos": el contrato los
//   declara con esos nombres.
// - `clienteRemitenteId` / `clienteDestinatarioId` NO estan en el contrato:
//   se mandaban desde Carga rapida cuando la fila tenia un cliente
//   vinculado, y eso era un 400. La cuenta de cliente no se modifica por
//   esta via.
// `null` en un campo nullable lo borra; un campo ausente no se toca.
export interface CamposModificablesEnvio {
  remitenteNombre?: string;
  remitenteTelefono?: string;
  remitenteCalle?: string | null;
  remitenteNumero?: string | null;
  remitentePiso?: string | null;
  remitenteReferencia?: string | null;
  destinatarioNombre?: string;
  destinatarioTelefono?: string;
  destinatarioCalle?: string;
  destinatarioNumero?: string | null;
  destinatarioPiso?: string | null;
  destinatarioReferencia?: string | null;
  cantidadBultos?: number;
  fleteImporte?: number;
  tipo?: TipoEnvioApi;
  lugarPago?: LugarPagoApi;
  formaPago?: FormaPagoApi;
  contrarreembolsoImporte?: number | null;
  remitoManualNumero?: string | null;
  valorDeclarado?: number | null;
  gasto?: number;
  observaciones?: string | null;
}

function aplanarParaPatch(data: ActualizarEnvioInput): CamposModificablesEnvio {
  const { remitente, destinatario, ...resto } = data;
  const wire: CamposModificablesEnvio = { ...resto };
  if (remitente) {
    if (remitente.nombre !== undefined) wire.remitenteNombre = remitente.nombre;
    if (remitente.telefono !== undefined) wire.remitenteTelefono = remitente.telefono;
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
    // remitente.clienteId tampoco: ver CamposModificablesEnvio.
  }
  if (destinatario) {
    if (destinatario.nombre !== undefined) wire.destinatarioNombre = destinatario.nombre;
    if (destinatario.telefono !== undefined) wire.destinatarioTelefono = destinatario.telefono;
    if (destinatario.calle !== undefined) wire.destinatarioCalle = destinatario.calle;
    if (destinatario.numero !== undefined) wire.destinatarioNumero = destinatario.numero;
    if (destinatario.piso !== undefined) wire.destinatarioPiso = destinatario.piso;
    if (destinatario.referencia !== undefined) wire.destinatarioReferencia = destinatario.referencia;
    // destinatario.localidadId / .sectorId NO se mandan: mismo hallazgo que
    // remitente arriba, confirmado en vivo — `localidadDestinoId` y
    // `sectorDestinoId` tambien vienen rechazados con "should not exist" en
    // el PATCH. Localidad/sector de destino tampoco son editables una vez
    // creado el envio, al menos con este DTO.
    // destinatario.clienteId / .domicilioId tampoco: ver
    // CamposModificablesEnvio.
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
  // Domicilio del remitente: en el contrato (EnvioFilaDto /
  // EnvioDelSeguimientoDto) desde el changelog 2026-09-15. Hasta el
  // 2026-10-01 este tipo no los declaraba y llegaban sin tipar por un
  // index signature (`[key: string]: unknown`), que se sacó ese día: el
  // contrato ya documenta todos los campos.
  remitenteCalle: string | null;
  remitenteNumero: string | null;
  remitentePiso: string | null;
  remitenteReferencia: string | null;
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
  // Mismo caso que el domicilio del remitente.
  valorDeclarado: string | null;
  gasto: string;
  observaciones: string | null;
  camino: string;
  guiaDiariaNumero: number;
  estadoActual: string;
  custodiaActualUsuarioId: string | null;
  custodiaActualPuntoId: string | null;
  planillaActualId: string | null;
  creadoEn: string;
  // null en un envio que todavia no tiene guia asignada (contrato:
  // EnvioFilaDto / EnvioDelSeguimientoDto). Quien la muestra cae al
  // `numero` en ese caso, nunca imprime "#null".
  guiaDiaria: string | null;
  ubicacion: string;
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

// PATCH /envios/:id — changelog 2026-09-15: exige `clientUuid` en el body
// (como todo acto de custodia). Sin el, 400. Reintentar con el mismo
// clientUuid da 200 y un solo evento en el ledger (idempotencia); reusarlo
// en otro envio da 409 CLIENT_UUID_REUTILIZADO. Cada correccion real deja
// un evento "modificacion" en el ledger de custodia, visible en
// /seguimiento (ver seguimiento.ts, TipoEvento). Un PATCH que no cambia
// nada no escribe ni fila ni evento.
//
// 2026-10-01 (modificar desde Seguimiento): el PATCH exige ademas `motivo`
// (3 a 200 caracteres), que queda en el evento. El `clientUuid` lo pone
// quien llama: el panel de Seguimiento genera uno al abrirse y lo reusa en
// cada reintento, para que reintentar sea idempotente.
export async function modificarEnvio(
  id: string,
  cambios: CamposModificablesEnvio,
  opciones: { motivo: string; clientUuid: string }
): Promise<EnvioApi> {
  const token = await requireToken();
  return apiFetch<EnvioApi>(`/envios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: { ...cambios, motivo: opciones.motivo, clientUuid: opciones.clientUuid },
  });
}

// Misma operacion que modificarEnvio(), con la forma anidada que arma el
// alta (ActualizarEnvioInput) — la usa el "Editar" de Carga rapida.
export async function actualizarEnvio(
  id: string,
  data: ActualizarEnvioInput,
  motivo: string
): Promise<EnvioApi> {
  return modificarEnvio(id, aplanarParaPatch(data), { motivo, clientUuid: nuevoClientUuid() });
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
  // Id (uuid) del envio. El remito se pide por `numero`, pero registrar su
  // impresion va por id: POST /envios/{envioId}/impresiones-remito.
  envioId: string;
  numero: string;
  // Numero de envio SIN el guion, ya formateado por el backend para
  // codificar directo en el codigo de barras (Code 39).
  codigoBarras: string;
  fechaAlta: string;
  // Nullable en el contrato (RemitoDeEnvioDto), igual que en EnvioApi.
  guiaDiaria: string | null;
  remitoManualNumero: string | null;
  origen: { localidad: string };
  destino: { localidad: string };
  remitente: { nombre: string; telefono: string; domicilio: string };
  // `referencia` (del domicilio, solo destinatario): opcional hasta que el
  // backend que la manda este desplegado -- despues viene siempre, string
  // o null. El remitente no la tiene.
  destinatario: {
    nombre: string;
    telefono: string;
    domicilio: string;
    referencia?: string | null;
  };
  cantidadBultos: number;
  tipo: TipoEnvioApi;
  observaciones: string | null;
  valorDeclarado: string | null;
  flete: string;
  contrarreembolso: string | null;
  gasto: string;
  // CONTRATO-2026-09-24-01 (Sebastian, 2026-09-24): pagoServicio pasa a
  // nullable (null solo con tipo "interno"), e importes.* ahora puede venir
  // null (= renglon en blanco en el papel del legacy) en vez de siempre
  // traer un string. Ver remito-view.tsx (money() y el bloque de "Pago:").
  // Regla de importes desde el 2026-10-01 (backend main a9c2e6f, ver
  // api/openapi.json de ese repo) -- el gasto lo cobra quien entrega, no
  // el mostrador de origen:
  //   destino -> cobrado null,  aCobrar = total = flete + gasto + CRR
  //   origen  -> cobrado flete, aCobrar = gasto + CRR, total = flete + gasto + CRR
  //   regreso -> cobrado null,  aCobrar = total = gasto + CRR
  //   interno -> los tres null (y pagoServicio null)
  // El frontend no calcula nada de esto: pinta los tres tal como llegan.
  pagoServicio: { lugar: LugarPagoApi; forma: FormaPagoApi } | null;
  importes: { cobrado: string | null; aCobrar: string | null; total: string | null };
  levanto: string;
  // 2026-10-02 (registro de impresion): si este remito se puede imprimir lo
  // decide el backend segun el estado del envio, y lo informa aca. Un
  // anulado (ENVIO_ANULADO) o un alta incompleta (ALTA_INCOMPLETA) se ven en
  // pantalla pero no se imprimen: `bloqueo.mensaje` se muestra tal cual.
  impresion: ImpresionDelRemito;
}

export interface ImpresionDelRemito {
  permitida: boolean;
  bloqueo: { codigo: string; mensaje: string } | null;
}

// Respuesta de POST /envios/{envioId}/impresiones-remito: la impresion que
// quedo en el historial del envio. `numero` es su ordinal (1 = primera; de
// 2 en adelante es una reimpresion y el papel lo dice).
export interface ImpresionRegistradaApi {
  numero: number;
  impresoEn: string;
  impresoPor: { id: string; nombre: string };
}

export async function getRemito(numero: string): Promise<RemitoApi> {
  const token = await requireToken();
  return apiFetch<RemitoApi>(`/envios/${encodeURIComponent(numero)}/remito`, { token });
}

// POST /envios/{envioId}/impresiones-remito (2026-10-02): deja en el
// historial del envio el evento `impresion_remito`. La pagina del remito lo
// llama ANTES de abrir el dialogo de impresion: sin registro no se imprime.
// Idempotente por `clientUuid` (201 la primera vez, 200 con la misma
// impresion en un reintento). 409 ENVIO_ANULADO / ALTA_INCOMPLETA si el
// envio no se puede imprimir, con el mensaje en `detail`. `motivo` existe
// en el contrato pero todavia no se manda.
export async function registrarImpresionRemito(
  envioId: string,
  clientUuid: string
): Promise<ImpresionRegistradaApi> {
  const token = await requireToken();
  return apiFetch<ImpresionRegistradaApi>(
    `/envios/${encodeURIComponent(envioId)}/impresiones-remito`,
    { method: "POST", token, body: { clientUuid } }
  );
}
