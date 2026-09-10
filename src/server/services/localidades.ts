import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";
import { listProvincias } from "./provincias";
import type { LocalidadBackend } from "@/types";

// Forma cruda que devuelve GET/POST/PATCH /localidades del backend real.
interface LocalidadApi {
  id: string;
  nombre: string;
  provinciaId: string;
}

// El backend real NO tiene `corte` ni `despachaSabados` en `localidad` — no es
// que falten mapear, no existen como concepto ahí. Según
// obsidian_vault/wiki/entities/modelo-geografico.md del backend: el "corte" es
// una propiedad de un PAR de localidades (`servicio_par.tiene_corte`), no de
// una localidad sola, y "despacha sábados" no es configurable por localidad:
// es una regla fija de toda la empresa (lunes a viernes en todos lados,
// sábado un solo camión). Por eso el tipo `Localidad` del frontend se ajustó
// para reflejar lo que el backend realmente tiene, y la pantalla de
// Localidades ya no muestra esos dos switches.
function toLocalidad(item: LocalidadApi, provincias: Map<string, string>): LocalidadBackend {
  return {
    id: item.id,
    nombre: item.nombre,
    provinciaId: item.provinciaId,
    provinciaNombre: provincias.get(item.provinciaId) ?? "—",
  };
}

async function provinciaMap(): Promise<Map<string, string>> {
  const provincias = await listProvincias();
  return new Map(provincias.map((p) => [p.id, p.nombre]));
}

export async function listLocalidades(): Promise<LocalidadBackend[]> {
  const token = await requireToken();
  const [items, provincias] = await Promise.all([
    apiFetch<LocalidadApi[]>("/localidades", { token }),
    provinciaMap(),
  ]);
  return items.map((item) => toLocalidad(item, provincias));
}

export async function createLocalidad(data: {
  nombre: string;
  provinciaId: string;
}): Promise<LocalidadBackend> {
  const token = await requireToken();
  const [item, provincias] = await Promise.all([
    apiFetch<LocalidadApi>("/localidades", {
      method: "POST",
      token,
      body: { nombre: data.nombre, provinciaId: data.provinciaId },
    }),
    provinciaMap(),
  ]);
  return toLocalidad(item, provincias);
}

export async function updateLocalidad(
  id: string,
  patch: { nombre?: string; provinciaId?: string }
): Promise<LocalidadBackend> {
  const token = await requireToken();
  const [item, provincias] = await Promise.all([
    apiFetch<LocalidadApi>(`/localidades/${id}`, {
      method: "PATCH",
      token,
      body: patch,
    }),
    provinciaMap(),
  ]);
  return toLocalidad(item, provincias);
}
