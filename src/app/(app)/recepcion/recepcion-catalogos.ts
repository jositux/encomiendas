// Qué se le ofrece al operador en los selectores de Recepción. Funciones
// puras, sin "use client": las llama page.tsx desde el servidor.

import type { RecorridoBackend } from "@/types";
import type { GrupoDeSectores, RecorridoOfrecido } from "./selector-de-modo";

// Los sectores agrupados por localidad, las dos cosas en orden alfabético.
// Un sector solo sirve para envíos de su localidad (si no, el backend
// recibe el paquete y responde SECTOR_DE_OTRA_LOCALIDAD), así que la
// localidad tiene que estar a la vista al elegir.
export function sectoresPorLocalidad(
  sectores: { id: string; nombre: string; localidadId: string }[],
  localidades: { id: string; nombre: string }[]
): GrupoDeSectores[] {
  const nombreDe = new Map(localidades.map((l) => [l.id, l.nombre]));
  const grupos = new Map<string, GrupoDeSectores>();
  for (const s of sectores) {
    const localidad = nombreDe.get(s.localidadId) ?? "Sin localidad";
    const grupo = grupos.get(localidad) ?? { localidad, sectores: [] };
    grupo.sectores.push({ id: s.id, nombre: s.nombre });
    grupos.set(localidad, grupo);
  }
  const porNombre = (a: string, b: string) => a.localeCompare(b, "es");
  return [...grupos.values()]
    .map((g) => ({ ...g, sectores: g.sectores.sort((a, b) => porNombre(a.nombre, b.nombre)) }))
    .sort((a, b) => porNombre(a.localidad, b.localidad));
}

// Los recorridos para "Reservar recorrido". El backend exige que el
// recorrido salga del punto donde queda la custodia del envío:
// - quien RECIBE deja el paquete en su propio punto: se le ofrecen solo los
//   recorridos activos que salen de ahí (`baseId === puntoId`);
// - quien solo asigna (supervisor) trabaja sobre paquetes de cualquier base
//   de su alcance: ve todos los activos, con su base. Si elige uno que no
//   sale de la base del paquete, el backend responde RECORRIDO_DE_OTRA_BASE
//   y esa lectura queda como error.
export function recorridosOfrecidos(
  recorridos: RecorridoBackend[],
  usuario: { recibe: boolean; puntoId: string }
): RecorridoOfrecido[] {
  return recorridos
    .filter((r) => r.activo && (!usuario.recibe || r.baseId === usuario.puntoId))
    .map((r) => ({ id: r.id, nombre: r.nombre, baseNombre: r.baseNombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
