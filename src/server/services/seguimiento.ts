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
  // ("Flete corregido de 10000.00 a 8000.00 por Ana"), así que no hace
  // falta reconstruir nada a mano para el resumen de una línea. Todavía
  // no hay forma de generar uno de estos en vivo desde este frontend: el
  // único PATCH /envios/:id real lo va a hacer la futura edición real vía
  // Carga rápida (bug 10 punto 5 / changelog en el plan de integración),
  // que a la fecha de este comentario sigue sin implementarse.
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

export interface SeguimientoResponse {
  envio: EnvioApi & { etiquetas: string[] };
  custodiaActual: {
    usuario: EventoResponsable | null;
    punto: EventoPunto | null;
  };
  eventos: EventoSeguimiento[];
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
