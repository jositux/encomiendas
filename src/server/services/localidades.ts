import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
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
  const [pagina, provincias] = await Promise.all([
    // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
    apiFetchColeccion<LocalidadApi>("/localidades?limite=200", { token }),
    provinciaMap(),
  ]);
  return pagina.datos.map((item) => toLocalidad(item, provincias));
}

// 2026-09-17 (sección 27.1 del plan de integración): mismo patrón de
// `listUsuariosSeguro()` (services/usuarios.ts) — roles sin `geografia:leer`
// (ej. chofer_obera) reciben 403 acá, y varias pantallas (Seguimiento,
// Custodia, Puntos vía localidadMap) solo usan esta lista para selectores o
// para resolver un nombre "best-effort", no como precondición dura. Antes
// un 403 acá tiraba abajo la pantalla ENTERA (Server Component sin atrapar
// el ApiError) — con esta variante la pantalla carga igual y el selector/
// nombre queda vacío o en "—" en vez de romper todo.
export async function listLocalidadesSeguro(): Promise<LocalidadBackend[]> {
  try {
    return await listLocalidades();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /localidades (la pantalla sigue funcionando, pero sin selector/nombres de localidad donde correspondan):",
      err
    );
    return [];
  }
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
