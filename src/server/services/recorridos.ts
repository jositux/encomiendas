import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";
import { listPuntos } from "./puntos";
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
  // CONTRATO-2026-09-22-01 (backend): el propio /recorridos ahora resuelve
  // el nombre legible del chofer/vehiculo predeterminados, no solo el id.
  // Reemplaza la resolucion que haciamos nosotros via listUsuariosSeguro()/
  // listVehiculos() (ver toRecorrido() mas abajo) — esa resolucion casera
  // era la causa real de que "Chofer predeterminado" quedara en "—" para
  // el rol operador (403 en GET /usuarios, sin usuarios:leer), aunque el
  // recorrido SI tuviera chofer asignado.
  choferPredeterminadoNombre: string | null;
  vehiculoPredeterminadoNombre: string | null;
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
function toRecorrido(item: RecorridoApi, puntosById: Map<string, string>): RecorridoBackend {
  const localidadIds = [...new Set((item.paradas ?? []).map((p) => p.localidadId))];
  return {
    id: item.id,
    nombre: item.nombre,
    baseId: item.baseId,
    baseNombre: puntosById.get(item.baseId) ?? "—",
    choferPredeterminadoId: item.choferPredeterminadoId,
    // CONTRATO-2026-09-22-01: nombre ya resuelto por el backend, viene null
    // si no hay chofer/vehiculo asignado (mismo criterio que antes).
    choferNombre: item.choferPredeterminadoNombre,
    vehiculoPredeterminadoId: item.vehiculoPredeterminadoId,
    vehiculoNombre: item.vehiculoPredeterminadoNombre,
    horaCorte: item.horaCorte,
    activo: item.activo,
    localidadIds,
  };
}

// 2026-09-15: usaba listUsuarios() sin manejo de error — un 403 en
// GET /usuarios (rol sin permiso de listarlos) tiraba abajo listRecorridos()
// completo, y con él la pantalla de Rutas. Se cambió a listUsuariosSeguro()
// (sección 18.2 del plan de integración), pero eso solo evitaba el crash:
// para el rol operador (sin usuarios:leer) la lista volvía vacía igual, y
// "Chofer predeterminado" quedaba en "—" aunque el recorrido SI tuviera
// chofer asignado. CONTRATO-2026-09-22-01 (backend, confirmado en vivo
// 2026-09-22) resuelve esto de raíz: /recorridos ya manda el nombre
// resuelto, así que no hace falta pegarle a /usuarios ni a /vehiculos acá
// — `lookups()` solo resuelve la base.
async function lookups() {
  const puntos = await listPuntos();
  return {
    puntosById: new Map(puntos.map((p) => [p.id, p.nombre])),
  };
}

export async function listRecorridos(): Promise<RecorridoBackend[]> {
  const token = await requireToken();
  const [pagina, { puntosById }] = await Promise.all([
    // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
    apiFetchColeccion<RecorridoApi>("/recorridos?limite=200", { token }),
    lookups(),
  ]);
  return pagina.datos.map((item) => toRecorrido(item, puntosById));
}

export async function createRecorrido(data: {
  nombre: string;
  baseId: string;
}): Promise<RecorridoBackend> {
  const token = await requireToken();
  const [item, { puntosById }] = await Promise.all([
    apiFetch<RecorridoApi>("/recorridos", { method: "POST", token, body: data }),
    lookups(),
  ]);
  return toRecorrido(item, puntosById);
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
  const [item, { puntosById }] = await Promise.all([
    apiFetch<RecorridoApi>(`/recorridos/${id}`, { method: "PATCH", token, body: patch }),
    lookups(),
  ]);
  return toRecorrido(item, puntosById);
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
