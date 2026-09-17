import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
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
  // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
  const pagina = await apiFetchColeccion<SectorApi>("/sectores?limite=200", { token });
  return pagina.datos;
}

export async function listSectoresPorLocalidad(localidadId: string): Promise<SectorApi[]> {
  const sectores = await listSectores();
  return sectores.filter((s) => s.localidadId === localidadId);
}

// 2026-09-17 (sección 27.1 del plan de integración) — mismo patrón que
// `listLocalidadesSeguro()`: pantallas como Seguimiento solo usan esto para
// un selector ("Corregir sector"), no como precondición dura de la
// pantalla. Con esto un 403 (rol sin el permiso de geografía correspondiente)
// deja el selector vacío en vez de tirar abajo toda la pantalla.
export async function listSectoresSeguro(): Promise<SectorApi[]> {
  try {
    return await listSectores();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /sectores (la pantalla sigue funcionando, pero sin selector de sector donde corresponda):",
      err
    );
    return [];
  }
}

// createSector/updateSector: confirmado en vivo el 2026-09-16 (ver sección
// 20 del plan de integración) — el backend real SÍ tiene POST/PATCH
// /sectores, mismo patrón nombre + localidadId que Localidades. No se
// manda `zonaId`: no hay pantalla ni concepto propio de "zona" todavía del
// lado del frontend (ver el comentario de geografia-view.tsx).
export async function createSector(data: {
  nombre: string;
  localidadId: string;
}): Promise<SectorApi> {
  const token = await requireToken();
  return apiFetch<SectorApi>("/sectores", { method: "POST", token, body: data });
}

export async function updateSector(
  id: string,
  patch: { nombre?: string; localidadId?: string }
): Promise<SectorApi> {
  const token = await requireToken();
  return apiFetch<SectorApi>(`/sectores/${id}`, { method: "PATCH", token, body: patch });
}
