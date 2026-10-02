import "server-only";

import { apiFetch, apiFetchColeccion, nuevoClientUuid } from "../api-client";
import { requireToken } from "./shared";
import type { EnvioApi } from "./envios";

// "Seguimiento de envío": pantalla nueva pedida por el usuario a partir de
// un prompt/contrato entregado por el equipo de backend (ver
// claude/plan-integracion-backend.md). El contrato entero (GET
// /envios/{numero}/seguimiento, la búsqueda por guía diaria, y las 6
// acciones de la tabla de abajo) se confirmó EN VIVO contra el servidor real
// el 2026-09-11 con una página de debug temporal (`/debug-seguimiento`,
// volcando la respuesta cruda, borrada después de confirmar) — coincide
// exactamente con lo que describe el prompt, incluido un envío de prueba
// (000000001-7 / guía "E1") ya sembrado con una historia completa de
// eventos (alta → carga → recepción → carga → intento fallido → entrega →
// confirmación), aparentemente sembrado a propósito por el backend junto
// con este endpoint nuevo.
//
// `envio` es el mismo `EnvioApi` ya usado en Nueva Encomienda/Custodia, más
// `etiquetas: string[]` (una por bulto, ej. "000000123-6/1"), que no venía
// en las pantallas ya conectadas.
export interface EventoResponsable {
  id: string;
  nombre: string;
}

export interface EventoPunto {
  id: string;
  nombre: string;
}

export interface EventoPlanilla {
  id: string;
  codigoQr: string;
  codigoCorto: string;
}

export type TipoEvento =
  | "alta"
  | "carga"
  | "recepcion"
  | "entrega"
  | "intento_fallido"
  | "incidencia"
  | "confirmacion"
  | "anulacion"
  | "correccion_sector"
  | "reversion_entrega"
  // Nuevo (changelog backend 2026-09-15): cada PATCH /envios/:id que
  // cambia algo deja uno de estos en el ledger (append-only, sin
  // UPDATE/DELETE posible ni para el backend). No transiciona estado ni
  // custodia. `detalle.cambios` viene como
  // { columna: { antes, despues }, ... } (valores numeric como string,
  // nunca float) — la propia `evento.frase` ya trae la oración armada
  // ("Flete corregido de $ 10.000 a $ 8.000 por Ana. Motivo: …", con los
  // importes ya formateados desde el 2026-10-01), así que no hace falta
  // reconstruir nada a mano para el resumen de una línea. `detalle` trae
  // además `motivo`. Las claves de `cambios` son la columna en snake_case
  // (`flete_importe`) y los valores van crudos ("10000.00"): el detalle
  // desplegado los traduce y formatea en seguimiento-view.tsx. Lo generan
  // el panel "Modificar datos" de Seguimiento y el "Editar" de Carga
  // rápida.
  | "modificacion";

export interface EventoSeguimiento {
  id: string;
  tipo: TipoEvento;
  frase: string;
  occurredAt: string;
  recordedAt: string;
  relojSospechoso: boolean;
  responsable: EventoResponsable | null;
  registradoPor: EventoResponsable | null;
  punto: EventoPunto | null;
  planilla: EventoPlanilla | null;
  // Objeto libre: recibidoPor/documento/observacion (entregas), motivo
  // (intentos, incidencias, anulaciones, reversiones, correcciones),
  // bultoNumero/detalle (incidencias), sectorNuevo/de/a (corrección de
  // sector), planillaDe (movimiento entre planillas) — mostrar las claves
  // que existan, no asumir un formulario fijo.
  detalle: Record<string, unknown>;
}

// 2026-10-01 (modificar desde Seguimiento): si el usuario que consulta puede
// modificar los datos del envio lo decide el backend, y lo informa aca. El
// frontend NO recalcula la regla: `permitida` muestra el boton "Modificar
// datos"; `bloqueo` muestra su `mensaje` (escrito por el backend) como aviso
// en lugar del boton; sin ninguno de los dos no se muestra nada (p. ej. un
// chofer, que no tiene el permiso). Codigos de bloqueo: ENVIO_EN_PLANILLA,
// ENVIO_EN_CUSTODIA, FUERA_DE_ALCANCE, ENVIO_CERRADO.
//
// 2026-10-02 (modificar en custodia): `campos` dice QUÉ puede modificar.
// "todos" son los 22 campos del PATCH; "sin_importes" deja afuera los siete
// que definen qué se cobra y cómo (flete, contrarreembolso, gasto, valor
// declarado, tipo, lugar y forma de pago) -- es el caso de quien tiene el
// envío en custodia fuera de su origen. null cuando no está permitida.
// Opcional: un backend anterior no lo manda, y eso equivale a "todos".
export type CamposEditables = "todos" | "sin_importes";

export interface EdicionEnvio {
  permitida: boolean;
  bloqueo: { codigo: string; mensaje: string } | null;
  campos?: CamposEditables | null;
}

export interface SeguimientoResponse {
  envio: EnvioApi & { etiquetas: string[] };
  custodiaActual: {
    usuario: EventoResponsable | null;
    punto: EventoPunto | null;
  };
  eventos: EventoSeguimiento[];
  // Opcional: un backend anterior al 2026-10-01 no lo manda, y eso se trata
  // igual que "sin permiso" (no se muestra ni boton ni aviso).
  edicion?: EdicionEnvio;
}

export async function getSeguimiento(numero: string): Promise<SeguimientoResponse> {
  const token = await requireToken();
  return apiFetch<SeguimientoResponse>(
    `/envios/${encodeURIComponent(numero)}/seguimiento`,
    { token }
  );
}

// Búsqueda por guía diaria ("A17": letra del día + correlativo por base).
// Confirmado en vivo: acotada a la base del usuario que pregunta (un
// operador en una base no encuentra por este camino la guía de otra base,
// aunque tenga alcance global — buscar por número/remito con
// getSeguimiento() no tiene esa restricción). `fecha` es opcional
// (YYYY-MM-DD, hoy por defecto en el backend).
export async function buscarEnvioPorGuia(
  guia: string,
  fecha?: string
): Promise<EnvioApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams({ guia });
  if (fecha) qs.set("fecha", fecha);
  const pagina = await apiFetchColeccion<EnvioApi>(`/envios?${qs.toString()}`, { token });
  return pagina.datos;
}

// -- Acciones contextuales --------------------------------------------------
// Las 6 acciones de la tabla del contrato. Todas idempotentes por
// `clientUuid` (generado acá, uno por intento — el backend responde 201 la
// primera vez y 200 si es un reintento de la misma acción, nunca duplica).
// Las de "calle" (entregar, intento fallido, incidencia) las hace el chofer
// desde su pantalla móvil — no existen en este tablero a propósito.

export async function anularEnvio(envioId: string, motivo: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/envios/${envioId}/anular`, {
    method: "POST",
    token,
    body: { motivo, clientUuid: nuevoClientUuid() },
  });
}

export async function corregirSectorEnvio(
  envioId: string,
  sectorId: string,
  motivo: string
): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/envios/${envioId}/sector`, {
    method: "PATCH",
    token,
    body: { sectorId, motivo, clientUuid: nuevoClientUuid() },
  });
}

export async function moverEnvioDePlanilla(
  envioId: string,
  sectorId: string,
  motivo: string
): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/envios/${envioId}/mover`, {
    method: "POST",
    token,
    body: { sectorId, motivo, clientUuid: nuevoClientUuid() },
  });
}

export async function confirmarEnvio(envioNumero: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/confirmaciones`, {
    method: "POST",
    token,
    body: { envioNumero, clientUuid: nuevoClientUuid() },
  });
}

export async function confirmarEnvioConEntrega(data: {
  envioNumero: string;
  choferId: string;
  recibidoPor?: string;
  documento?: string;
  observacion?: string;
}): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/confirmaciones/con-entrega`, {
    method: "POST",
    token,
    body: { ...data, clientUuid: nuevoClientUuid(), occurredAt: new Date().toISOString() },
  });
}

export async function revertirEntregaEnvio(
  envioNumero: string,
  motivo: string
): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/entregas/reversiones`, {
    method: "POST",
    token,
    body: {
      envioNumero,
      motivo,
      clientUuid: nuevoClientUuid(),
      occurredAt: new Date().toISOString(),
    },
  });
}
