"use server";

import * as recorridosService from "../services/recorridos";
import { comoResultado, comoAccionResultado } from "./shared";

// -- Rutas ------------------------------------------------------------------------
// Real (src/server/services/recorridos.ts). "Rutas"/"Recorridos" son el
// mismo concepto — el nombre de pantalla es "Rutas", el del backend
// `recorrido`.

export async function createRutaAction(data: { nombre: string; baseId: string }) {
  return comoResultado(() => recorridosService.createRecorrido(data));
}
export async function updateRutaAction(
  id: string,
  patch: {
    nombre?: string;
    baseId?: string;
    choferPredeterminadoId?: string | null;
    vehiculoPredeterminadoId?: string | null;
    horaCorte?: string | null;
    activo?: boolean;
  }
) {
  return comoResultado(() => recorridosService.updateRecorrido(id, patch));
}
export async function removeRutaAction(id: string) {
  return comoAccionResultado(() => recorridosService.removeRecorrido(id));
}
export async function setLocalidadesRutaAction(id: string, localidadIds: string[]) {
  return comoAccionResultado(() => recorridosService.setLocalidadesRecorrido(id, localidadIds));
}
