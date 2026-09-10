import "server-only";

import { apiFetch, nuevoClientUuid } from "../api-client";
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

export async function crearEnvio(data: CrearEnvioInput): Promise<EnvioApi> {
  const token = await requireToken();
  return apiFetch<EnvioApi>("/envios", {
    method: "POST",
    token,
    body: { ...data, clientUuid: nuevoClientUuid() },
  });
}

export async function listEnvios(params?: {
  estado?: string;
  limite?: number;
}): Promise<EnvioApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams();
  if (params?.estado) qs.set("estado", params.estado);
  qs.set("limite", String(params?.limite ?? 50));
  return apiFetch<EnvioApi[]>(`/envios?${qs.toString()}`, { token });
}
