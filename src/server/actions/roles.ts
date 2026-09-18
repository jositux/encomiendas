"use server";

import * as rolesService from "../services/roles";
import { comoResultado } from "./shared";

// -- Roles (administración real, sección 34 del plan) ------------------------

export async function actualizarRolAction(id: string, data: rolesService.ActualizarRolInput) {
  return comoResultado(() => rolesService.actualizarRol(id, data));
}

// Lectura de la grilla de permisos de un rol. No es una Server Action que
// mute nada, pero vive acá igual que el resto (la UI la llama desde un
// Client Component al abrir el editor de permisos) y `comoResultado` ya da
// el mismo shape de error/éxito que el resto de las acciones.
export async function getPermisosRolAction(id: string) {
  return comoResultado(() => rolesService.getPermisosRol(id));
}

export async function actualizarPermisosRolAction(id: string, claves: string[]) {
  return comoResultado(() => rolesService.actualizarPermisosRol(id, claves));
}
