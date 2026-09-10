import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";
import { listPuntos } from "./puntos";
import { listUsuarios } from "./usuarios";
import { listVehiculos } from "./vehiculos";
import { listSectores } from "./sectores";
import type { RecorridoBackend } from "@/types";

interface ParadaApi {
  sectorId: string;
  orden: number;
  sectorNombre: string;
  localidadId: string;
  localidadNombre: string;
}

interface RecorridoApi {
  id: string;
  nombre: string;
  baseId: string;
  choferPredeterminadoId: string | null;
  vehiculoPredeterminadoId: string | null;
  horaCorte: string | null;
  activo: boolean;
  paradas: ParadaApi[];
}

// El frontend legacy elige "localidades cubiertas" por un grupo de ruta. El
// backend real corta las planillas por SECTOR, no por localidad (sector =
// atomo de ruteo; localidad puede tener mas de uno - ver
// obsidian_vault/wiki/entities/modelo-geografico.md del backend). Para no
// tener que construir todavia una pantalla nueva de "sectores", la UI sigue
// mostrando localidades: marcar una localidad asigna TODOS sus sectores a
// este recorrido de una vez.
//
// Importante: la relacion recorrido<->sector NO se refleja en
// GET /sectores (ahi "recorridoId" siempre viene null). El backend la
// devuelve embebida en el propio recorrido, como item.paradas[]. Por eso
// derivamos localidadIds directamente de item.paradas y no de un cruce con
// /sectores (bug real, encontrado probando en vivo).
function toRecorrido(
  item: RecorridoApi,
  puntosById: Map<string, string>,
  usuariosById: Map<string, string>,
  vehiculosById: Map<string, string>
): RecorridoBackend {
  const localidadIds = [...new Set((item.paradas ?? []).map((p) => p.localidadId))];
  return {
    id: item.id,
    nombre: item.nombre,
    baseId: item.baseId,
    baseNombre: puntosById.get(item.baseId) ?? "—",
    choferPredeterminadoId: item.choferPredeterminadoId,
    choferNombre: item.choferPredeterminadoId
      ? (usuariosById.get(item.choferPredeterminadoId) ?? "—")
      : null,
    vehiculoPredeterminadoId: item.vehiculoPredeterminadoId,
    vehiculoNombre: item.vehiculoPredeterminadoId
      ? (vehiculosById.get(item.vehiculoPredeterminadoId) ?? "—")
      : null,
    horaCorte: item.horaCorte,
    activo: item.activo,
    localidadIds,
  };
}

async function lookups() {
  const [puntos, usuarios, vehiculos] = await Promise.all([
    listPuntos(),
    listUsuarios(),
    listVehiculos(),
  ]);
  return {
    puntosById: new Map(puntos.map((p) => [p.id, p.nombre])),
    usuariosById: new Map(usuarios.map((u) => [u.id, u.nombre])),
    vehiculosById: new Map(vehiculos.map((v) => [v.id, v.nombre])),
  };
}

export async function listRecorridos(): Promise<RecorridoBackend[]> {
  const token = await requireToken();
  const [items, { puntosById, usuariosById, vehiculosById }] = await Promise.all([
    apiFetch<RecorridoApi[]>("/recorridos", { token }),
    lookups(),
  ]);
  return items.map((item) => toRecorrido(item, puntosById, usuariosById, vehiculosById));
}

export async function createRecorrido(data: {
  nombre: string;
  baseId: string;
}): Promise<RecorridoBackend> {
  const token = await requireToken();
  const [item, { puntosById, usuariosById, vehiculosById }] = await Promise.all([
    apiFetch<RecorridoApi>("/recorridos", { method: "POST", token, body: data }),
    lookups(),
  ]);
  return toRecorrido(item, puntosById, usuariosById, vehiculosById);
}

export async function updateRecorrido(
  id: string,
  patch: {
    nombre?: string;
    baseId?: string;
    choferPredeterminadoId?: string | null;
    vehiculoPredeterminadoId?: string | null;
    horaCorte?: string | null;
    activo?: boolean;
  }
): Promise<RecorridoBackend> {
  const token = await requireToken();
  const [item, { puntosById, usuariosById, vehiculosById }] = await Promise.all([
    apiFetch<RecorridoApi>(`/recorridos/${id}`, { method: "PATCH", token, body: patch }),
    lookups(),
  ]);
  return toRecorrido(item, puntosById, usuariosById, vehiculosById);
}

export async function removeRecorrido(id: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/recorridos/${id}`, { method: "PATCH", token, body: { activo: false } });
}

// Reemplaza las localidades cubiertas por este recorrido: junta los sectores
// de cada localidad elegida y los manda todos juntos a
// PUT /recorridos/{id}/paradas (reemplaza la lista completa, no es un toggle
// incremental del lado del backend).
export async function setLocalidadesRecorrido(
  recorridoId: string,
  localidadIds: string[]
): Promise<void> {
  const token = await requireToken();
  const sectores = await listSectores();
  const sectorIds = sectores
    .filter((s) => localidadIds.includes(s.localidadId))
    .map((s) => s.id);
  await apiFetch<void>(`/recorridos/${recorridoId}/paradas`, {
    method: "PUT",
    token,
    body: { sectorIds },
  });
}
