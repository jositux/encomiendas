import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";

// Refleja 1:1 GET /provincias del backend real. Hoy el backend solo tiene
// "Misiones" sembrada (el frontend legacy asumía Misiones/Corrientes/Chaco
// fijas) — por eso el combo de provincia en Localidades pasa a poblarse con
// esto en vez de una lista fija, y no con el enum `Provincia` que usa el
// resto de la app (encomiendas, clientes), que queda sin tocar.
export interface ProvinciaApi {
  id: string;
  nombre: string;
}

export async function listProvincias(): Promise<ProvinciaApi[]> {
  const token = await requireToken();
  return apiFetch<ProvinciaApi[]>("/provincias", { token });
}

// createProvincia/updateProvincia: confirmado en vivo el 2026-09-16 (ver
// sección 20 del plan de integración) — el backend real SÍ tiene
// POST/PATCH /provincias, mismo shape que Localidades ({ nombre }).
export async function createProvincia(data: { nombre: string }): Promise<ProvinciaApi> {
  const token = await requireToken();
  return apiFetch<ProvinciaApi>("/provincias", { method: "POST", token, body: data });
}

export async function updateProvincia(
  id: string,
  patch: { nombre: string }
): Promise<ProvinciaApi> {
  const token = await requireToken();
  return apiFetch<ProvinciaApi>(`/provincias/${id}`, { method: "PATCH", token, body: patch });
}
