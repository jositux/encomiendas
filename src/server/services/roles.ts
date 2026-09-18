import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";

// Roles del backend real (tag "roles" del OpenAPI, /docs-json). Sirve a la
// pantalla /usuarios (sección 34 del plan de integración): asignar/quitar
// roles a un usuario necesita saber qué roles existen, y cada rol se puede
// activar/desactivar y editar sus permisos (claves) desde acá.
export interface RolApi {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  // Conteos que trae GET /roles de "regalo" (RolConConteosFilaDto) — útiles
  // para mostrar en la tabla sin tener que pedir cada rol por separado.
  usuarios: number;
  permisos: number;
}

export async function listRoles(): Promise<RolApi[]> {
  const token = await requireToken();
  const pagina = await apiFetchColeccion<RolApi>("/roles?limite=200", { token });
  return pagina.datos;
}

// Best-effort, mismo patrón que listUsuariosSeguro/listPuntosSeguro: asignar
// un rol necesita la lista de roles disponibles, pero no es motivo para que
// TODA la pantalla de usuarios se caiga si el rol actual no tiene permiso
// para listarlos (ej. para ver la lista de usuarios pero no la de roles).
export async function listRolesSeguro(): Promise<RolApi[]> {
  try {
    return await listRoles();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /roles (la pantalla de usuarios sigue funcionando, pero sin poder asignar/quitar roles):",
      err
    );
    return [];
  }
}

export interface ActualizarRolInput {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export async function actualizarRol(id: string, data: ActualizarRolInput): Promise<RolApi> {
  const token = await requireToken();
  return apiFetch<RolApi>(`/roles/${id}`, { method: "PATCH", token, body: data });
}

// GET /roles/{id}/permisos — la "grilla" de permisos de un rol. El OpenAPI
// (/docs-json) documenta el 200 sin schema (operationId
// "RolesController_grilla", sin más detalle) — a diferencia del resto de
// los DTOs de este proyecto, que se verificaron contra el schema real antes
// de escribir el service, ACÁ todavía no hay una verificación en vivo de la
// forma exacta de la respuesta. Lo único confirmado por schema es el body
// que espera el PUT hermano: `ActualizarPermisosDto = { claves: string[] }`
// (el array COMPLETO de claves que el rol debe tener, no un patch — hay que
// confirmar esto en vivo antes de ofrecer "guardar" en la UI, ver sección
// 34/35 del plan). Se tipa la respuesta del GET como `unknown` a propósito
// hasta esa verificación, para no inventar una forma que después no
// coincida.
export async function getPermisosRol(id: string): Promise<unknown> {
  const token = await requireToken();
  return apiFetch<unknown>(`/roles/${id}/permisos`, { token });
}

export async function actualizarPermisosRol(id: string, claves: string[]): Promise<unknown> {
  const token = await requireToken();
  return apiFetch<unknown>(`/roles/${id}/permisos`, {
    method: "PUT",
    token,
    body: { claves },
  });
}
