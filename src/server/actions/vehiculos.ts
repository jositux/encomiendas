"use server";

import * as vehiculosService from "../services/vehiculos";
import { comoResultado } from "./shared";

// -- Vehículos ------------------------------------------------------------------
// Real (src/server/services/vehiculos.ts).
//
// 2026-09-17: se sacó `listUsuariosAction` de acá — no tenía ningún caller.
// Las pantallas que necesitan usuarios llaman directo a
// `listUsuariosSeguro()` del servicio desde el Server Component, sin pasar
// por una Server Action, porque es una lectura, no una mutación.

export async function createVehiculoAction(data: {
  nombre: string;
  tipo: string;
  patente?: string | null;
}) {
  return comoResultado(() => vehiculosService.createVehiculo(data));
}
export async function updateVehiculoAction(
  id: string,
  patch: { nombre?: string; tipo?: string; patente?: string | null; activo?: boolean }
) {
  return comoResultado(() => vehiculosService.updateVehiculo(id, patch));
}
export async function removeVehiculoAction(id: string) {
  return comoResultado(() => vehiculosService.updateVehiculo(id, { activo: false }));
}
