"use server";

import * as localidadesService from "../services/localidades";
import { comoResultado } from "./shared";

// -- Localidades ----------------------------------------------------------------
// Real (src/server/services/localidades.ts).

export async function updateLocalidadAction(
  id: string,
  patch: { nombre?: string; provinciaId?: string }
) {
  return comoResultado(() => localidadesService.updateLocalidad(id, patch));
}
export async function createLocalidadAction(data: { nombre: string; provinciaId: string }) {
  return comoResultado(() => localidadesService.createLocalidad(data));
}
