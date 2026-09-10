import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";
import type { VehiculoBackend } from "@/types";

// Forma cruda de GET/POST/PATCH /vehiculos. El backend etapa 1 solo modela
// identidad para despacho: no tiene marca/modelo/año/estado (ficha de
// vehículo, fuera de alcance hoy) ni choferId (el chofer se asigna al
// despacho/recorrido, no al vehículo — simplificación aplicada a propósito,
// ver obsidian_vault/wiki/syntheses/simplificaciones-del-dominio.md #3 del
// backend).
interface VehiculoApi {
  id: string;
  nombre: string;
  tipo: string;
  patente: string | null;
  activo: boolean;
}

function toVehiculo(item: VehiculoApi): VehiculoBackend {
  return {
    id: item.id,
    nombre: item.nombre,
    tipo: item.tipo,
    patente: item.patente,
    activo: item.activo,
  };
}

export async function listVehiculos(): Promise<VehiculoBackend[]> {
  const token = await requireToken();
  const items = await apiFetch<VehiculoApi[]>("/vehiculos", { token });
  return items.map(toVehiculo);
}

export async function createVehiculo(data: {
  nombre: string;
  tipo: string;
  patente?: string | null;
}): Promise<VehiculoBackend> {
  const token = await requireToken();
  const item = await apiFetch<VehiculoApi>("/vehiculos", { method: "POST", token, body: data });
  return toVehiculo(item);
}

export async function updateVehiculo(
  id: string,
  patch: { nombre?: string; tipo?: string; patente?: string | null; activo?: boolean }
): Promise<VehiculoBackend> {
  const token = await requireToken();
  const item = await apiFetch<VehiculoApi>(`/vehiculos/${id}`, {
    method: "PATCH",
    token,
    body: patch,
  });
  return toVehiculo(item);
}
