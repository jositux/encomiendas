"use server";

import * as puntosService from "../services/puntos";
import { comoResultado } from "./shared";

// -- Sucursales / Puntos ---------------------------------------------------------
// Real (src/server/services/puntos.ts). El nombre de pantalla sigue siendo
// "Sucursales" en partes de la UI legacy, pero del lado del backend es la
// entidad `punto`.

export async function updateSucursalAction(
  id: string,
  patch: { nombre?: string; localidadId?: string; tipo?: "base" | "deposito"; activo?: boolean }
) {
  return comoResultado(() => puntosService.updatePunto(id, patch));
}
export async function createSucursalAction(data: {
  nombre: string;
  localidadId: string;
  tipo: "base" | "deposito";
}) {
  return comoResultado(() => puntosService.createPunto(data));
}
