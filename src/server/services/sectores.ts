import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";

// Sector = atomo de ruteo real del backend (una localidad puede tener mas de
// uno). Se comparte entre Recorridos (paradas de un recorrido) y Nueva
// Encomienda (el destinatario necesita indicar un sector puntual dentro de
// su localidad) — ver obsidian_vault/wiki/entities/modelo-geografico.md del
// backend.
export interface SectorApi {
  id: string;
  nombre: string;
  localidadId: string;
  zonaId: string | null;
  recorridoId: string | null;
}

export async function listSectores(): Promise<SectorApi[]> {
  const token = await requireToken();
  return apiFetch<SectorApi[]>("/sectores", { token });
}

export async function listSectoresPorLocalidad(localidadId: string): Promise<SectorApi[]> {
  const sectores = await listSectores();
  return sectores.filter((s) => s.localidadId === localidadId);
}
