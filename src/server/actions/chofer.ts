"use server";

import * as custodiaService from "../services/custodia";
import { comoAccionResultado } from "./shared";
import type { AccionResultado } from "./shared";
import { ApiError } from "../api-client";
import type { DespachoApi, PlanillaApi } from "../services/custodia";

// -- Chofer (Despacho -> Planilla -> Custodia/Entrega) -----------------------
// Real (src/server/services/custodia.ts). Ver esa sección de
// claude/plan-integracion-backend.md: las lecturas (listDespachos,
// listPlanillas, getPlanillaPorCodigo) y las 5 escrituras (carga/recepción/
// entrega/intento/incidencia) ya están confirmadas en vivo.

export async function listDespachosAction(): Promise<DespachoApi[]> {
  return custodiaService.listDespachos();
}

export async function listPlanillasAction(
  despachoId: string,
  filtro: { localidadId?: string; sectorId?: string }
): Promise<PlanillaApi[]> {
  return custodiaService.listPlanillas(despachoId, filtro);
}

// Punto de entrada principal de /chofer (ver custodia.ts): busca una
// planilla por código, sin necesitar despachos:leer/planillas:imprimir.
export async function buscarPlanillaPorCodigoAction(
  codigo: string
): Promise<AccionResultado & { data?: PlanillaApi }> {
  try {
    const data = await custodiaService.getPlanillaPorCodigo(codigo);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, title: err.title, message: err.message };
    }
    throw err;
  }
}

export async function cargarPlanillaAction(planillaId: string): Promise<AccionResultado> {
  return comoAccionResultado(() => custodiaService.cargarPlanilla(planillaId));
}

export async function recibirPlanillaAction(planillaId: string): Promise<AccionResultado> {
  return comoAccionResultado(() => custodiaService.recibirPlanilla(planillaId));
}

export async function entregarEnvioAction(
  envioNumero: string,
  data: { recibidoPor?: string; documento?: string; observacion?: string }
): Promise<AccionResultado> {
  return comoAccionResultado(() => custodiaService.entregarEnvio(envioNumero, data));
}

export async function registrarIntentoFallidoAction(
  envioNumero: string,
  motivo: string
): Promise<AccionResultado> {
  return comoAccionResultado(() => custodiaService.registrarIntentoFallido(envioNumero, motivo));
}

export async function registrarIncidenciaAction(
  envioNumero: string,
  data: { motivo: string; bultoNumero?: number; detalle?: string }
): Promise<AccionResultado> {
  return comoAccionResultado(() => custodiaService.registrarIncidencia(envioNumero, data));
}
