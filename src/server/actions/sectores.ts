"use server";

import * as sectoresService from "../services/sectores";
import { comoResultado } from "./shared";

// -- Sectores ---------------------------------------------------------------------
// Real (src/server/services/sectores.ts).

export async function createSectorAction(data: { nombre: string; localidadId: string }) {
  return comoResultado(() => sectoresService.createSector(data));
}

export async function updateSectorAction(
  id: string,
  patch: { nombre?: string; localidadId?: string }
) {
  return comoResultado(() => sectoresService.updateSector(id, patch));
}
