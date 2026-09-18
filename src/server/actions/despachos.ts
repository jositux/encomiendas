"use server";

import * as custodiaService from "../services/custodia";
import { comoResultado } from "./shared";
import type { ResultadoConDato } from "./shared";
import type { RespuestaDespacho } from "../services/custodia";

// -- Despachos (Corte: Recorrido -> Despacho -> Planillas por sector) -------
// Ver src/server/services/custodia.ts (crearDespacho) y la sección 32 del
// plan de integración. Distinta de chofer.ts (que es del lado de quien
// RECIBE/entrega una planilla ya cortada) — esta es la acción de oficina
// que la GENERA, típicamente operador/supervisor de una base.

export async function crearDespachoAction(data: {
  recorridoId: string;
  vehiculoId?: string;
  choferId?: string;
}): Promise<ResultadoConDato<RespuestaDespacho>> {
  return comoResultado(() => custodiaService.crearDespacho(data));
}
