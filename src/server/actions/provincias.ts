"use server";

import * as provinciasService from "../services/provincias";
import { comoResultado } from "./shared";

// -- Provincias -------------------------------------------------------------------
// Real (src/server/services/provincias.ts).

export async function createProvinciaAction(data: { nombre: string }) {
  return comoResultado(() => provinciasService.createProvincia(data));
}

export async function updateProvinciaAction(id: string, patch: { nombre: string }) {
  return comoResultado(() => provinciasService.updateProvincia(id, patch));
}
