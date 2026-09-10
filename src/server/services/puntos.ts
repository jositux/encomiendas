import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";
import { listLocalidades } from "./localidades";
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

async function localidadMap(): Promise<Map<string, string>> {
  const localidades = await listLocalidades();
  return new Map(localidades.map((l) => [l.id, l.nombre]));
}

export async function listPuntos(): Promise<PuntoBackend[]> {
  const token = await requireToken();
  const [items, localidades] = await Promise.all([
    apiFetch<PuntoApi[]>("/puntos", { token }),
    localidadMap(),
  ]);
  return items.map((item) => toPunto(item, localidades));
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
