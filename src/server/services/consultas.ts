import "server-only";

import { apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";
import type { EnvioApi } from "./envios";

// Pantalla real de Depósito (reemplaza a /deposito, 100% mock) — contrato
// completo pasado por el equipo de backend el 2026-09-18 ("Nota 1 —
// Pantalla de Depósito"), ver claude/plan-integracion-backend.md sección
// 35. Un solo endpoint alimenta la pantalla entera: GET /consultas/envios,
// con `estado`+`ubicacion` (NO un estado propio inventado del lado del
// cliente) armando las pestañas. Verificado contra el OpenAPI real
// (/docs-json): la fila que devuelve (`EnvioFilaDto`) es esencialmente el
// mismo `EnvioApi` que ya usan Nueva Encomienda/Seguimiento/Custodia (con
// algunos campos de domicilio del remitente de más, cubiertos por el
// `[key: string]: unknown` que ya tiene `EnvioApi`) — se reutiliza el tipo
// en vez de duplicarlo.
export type EstadoEnvio =
  | "ALTA_INCOMPLETA"
  | "REGISTRADO"
  | "EN_CUSTODIA"
  | "ENTREGADO"
  | "CONFIRMADO"
  | "ANULADO";

// Etiqueta derivada que combina estado + dónde está físicamente el envío
// (quién lo tiene, en qué tramo) — la fuente de verdad para agrupar/pintar
// la pantalla, según el contrato. No es un estado propio: es dato que ya
// viene calculado en cada fila.
export type UbicacionEnvio =
  | "en_origen"
  | "en_transito"
  | "en_deposito"
  | "en_base_destino"
  | "en_reparto"
  | "entregado"
  | "confirmado"
  | "anulado"
  | "alta_incompleta";

export interface FiltroConsultaEnvios {
  estado?: EstadoEnvio;
  puntoAltaId?: string;
  localidadOrigenId?: string;
  localidadDestinoId?: string;
  numero?: string;
  guia?: string;
  fecha?: string;
  desde?: string;
  hasta?: string;
  limite?: number;
  offset?: number;
}

export interface PaginaEnvios {
  datos: EnvioApi[];
  total: number;
  limite: number;
  offset: number;
}

export async function listConsultaEnvios(filtro: FiltroConsultaEnvios): Promise<PaginaEnvios> {
  const token = await requireToken();
  const qs = new URLSearchParams();
  qs.set("limite", String(filtro.limite ?? 200));
  if (filtro.offset) qs.set("offset", String(filtro.offset));
  if (filtro.estado) qs.set("estado", filtro.estado);
  if (filtro.puntoAltaId) qs.set("puntoAltaId", filtro.puntoAltaId);
  if (filtro.localidadOrigenId) qs.set("localidadOrigenId", filtro.localidadOrigenId);
  if (filtro.localidadDestinoId) qs.set("localidadDestinoId", filtro.localidadDestinoId);
  if (filtro.numero) qs.set("numero", filtro.numero);
  if (filtro.guia) qs.set("guia", filtro.guia);
  if (filtro.fecha) qs.set("fecha", filtro.fecha);
  if (filtro.desde) qs.set("desde", filtro.desde);
  if (filtro.hasta) qs.set("hasta", filtro.hasta);
  const pagina = await apiFetchColeccion<EnvioApi>(`/consultas/envios?${qs.toString()}`, {
    token,
  });
  return pagina;
}

// GET /consultas/fallidos — envíos EN_CUSTODIA con intentos de entrega
// fallidos, para que no se acumulen en silencio (nota explícita del
// contrato). `minimo` filtra por cantidad mínima de intentos (default 1).
export interface EnvioConFallidosApi {
  id: string;
  numero: string;
  localidadDestinoId: string;
  cantidadIntentos: number;
  ultimoMotivo: string;
  ultimoIntentoEn: string;
}

export async function listFallidos(filtro: {
  minimo?: number;
  localidadDestinoId?: string;
}): Promise<EnvioConFallidosApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams({ limite: "200" });
  if (filtro.minimo) qs.set("minimo", String(filtro.minimo));
  if (filtro.localidadDestinoId) qs.set("localidadDestinoId", filtro.localidadDestinoId);
  const pagina = await apiFetchColeccion<EnvioConFallidosApi>(
    `/consultas/fallidos?${qs.toString()}`,
    { token }
  );
  return pagina.datos;
}

// GET /confirmaciones/pendientes — entregas del día sin confirmar, mismo
// motivo (no acumular en silencio). `fecha` es opcional (hoy por defecto).
export interface PendienteConfirmacionApi {
  envioId: string;
  numero: string;
  destinatarioNombre: string;
  recibidoPor: string | null;
  entregadoEn: string;
  choferId: string;
  choferNombre: string;
}

export async function listConfirmacionesPendientes(filtro: {
  fecha?: string;
  choferId?: string;
}): Promise<PendienteConfirmacionApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams({ limite: "200" });
  if (filtro.fecha) qs.set("fecha", filtro.fecha);
  if (filtro.choferId) qs.set("choferId", filtro.choferId);
  const pagina = await apiFetchColeccion<PendienteConfirmacionApi>(
    `/confirmaciones/pendientes?${qs.toString()}`,
    { token }
  );
  return pagina.datos;
}
