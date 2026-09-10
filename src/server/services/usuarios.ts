import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";

// Forma cruda de GET /usuarios. Se usa hoy solo como fuente para elegir
// chofer en Vehículos/Recorridos — no hay todavía una pantalla de
// administración de usuarios/roles en el frontend (queda para más adelante).
export interface UsuarioApi {
  id: string;
  nombre: string;
  username: string;
  activo: boolean;
  puntoId: string;
  tipoChofer: "propio" | "tercero" | null;
  roles: { codigo: string }[];
}

export async function listUsuarios(): Promise<UsuarioApi[]> {
  const token = await requireToken();
  return apiFetch<UsuarioApi[]>("/usuarios", { token });
}
