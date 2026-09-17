import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";
import { listLocalidadesSeguro } from "./localidades";
import type { PuntoBackend } from "@/types";

interface PuntoApi {
  id: string;
  nombre: string;
  localidadId: string;
  tipo: "base" | "deposito";
  esCasaCentral: boolean;
  esDepositoCentral: boolean;
  activo: boolean;
}

// El backend real NO tiene `color`, `codigo` ni `procesarHastaHora` en
// `punto` — no existen como concepto ahí. `procesarHastaHora` en particular
// quedó reemplazado por `recorrido.hora_corte` (la hora vive en el camión,
// no en la sucursal — ver obsidian_vault/wiki/entities/modelo-geografico.md
// del backend) y va a reaparecer cuando conectemos Recorridos/Despacho.
function toPunto(item: PuntoApi, localidades: Map<string, string>): PuntoBackend {
  return {
    id: item.id,
    nombre: item.nombre,
    localidadId: item.localidadId,
    localidadNombre: localidades.get(item.localidadId) ?? "—",
    tipo: item.tipo,
    esCasaCentral: item.esCasaCentral,
    esDepositoCentral: item.esDepositoCentral,
    activo: item.activo,
  };
}

// 2026-09-17 (sección 27.1 del plan de integración): usa la variante
// "Seguro" (best-effort) — roles sin `geografia:leer` (ej. chofer_obera)
// reciben 403 en GET /localidades, y antes eso tiraba abajo TODA pantalla
// que dependiera de listPuntos() (ej. Custodia), aunque `puntos` en sí no
// necesite ese permiso. Con esto, si falla, el mapa queda vacío y
// `toPunto()` resuelve `localidadNombre` a "—" (mismo fallback que ya usa
// custodia-view.tsx para usuarios) en vez de romper la pantalla entera.
async function localidadMap(): Promise<Map<string, string>> {
  const localidades = await listLocalidadesSeguro();
  return new Map(localidades.map((l) => [l.id, l.nombre]));
}

export async function listPuntos(): Promise<PuntoBackend[]> {
  const token = await requireToken();
  const [pagina, localidades] = await Promise.all([
    // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
    apiFetchColeccion<PuntoApi>("/puntos?limite=200", { token }),
    localidadMap(),
  ]);
  return pagina.datos.map((item) => toPunto(item, localidades));
}

// 2026-09-17 (sección 27.1 del plan): a diferencia de lo que se pensó al
// principio, `GET /puntos` en sí (no solo la resolución de nombre de
// localidad de arriba) también exige `geografia:leer` — confirmado en vivo:
// un rol sin ese permiso (chofer_obera) recibía el 403 directo desde acá, no
// desde `localidadMap()`. Pantallas como Custodia solo usan `puntos` para
// mostrar en qué punto está cada envío (columna "best-effort", no una
// precondición dura para ver la lista de envíos en custodia) — variante
// segura con el mismo patrón que `listUsuariosSeguro()`.
export async function listPuntosSeguro(): Promise<PuntoBackend[]> {
  try {
    return await listPuntos();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /puntos (la pantalla sigue funcionando, pero sin nombres de punto donde corresponda):",
      err
    );
    return [];
  }
}

export async function createPunto(data: {
  nombre: string;
  localidadId: string;
  tipo: "base" | "deposito";
}): Promise<PuntoBackend> {
  const token = await requireToken();
  const [item, localidades] = await Promise.all([
    apiFetch<PuntoApi>("/puntos", { method: "POST", token, body: data }),
    localidadMap(),
  ]);
  return toPunto(item, localidades);
}

export async function updatePunto(
  id: string,
  patch: { nombre?: string; localidadId?: string; tipo?: "base" | "deposito"; activo?: boolean }
): Promise<PuntoBackend> {
  const token = await requireToken();
  const [item, localidades] = await Promise.all([
    apiFetch<PuntoApi>(`/puntos/${id}`, { method: "PATCH", token, body: patch }),
    localidadMap(),
  ]);
  return toPunto(item, localidades);
}
