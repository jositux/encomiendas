import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";

// Forma cruda de GET /usuarios. Hasta el 2026-09-18 se usaba solo como
// fuente para elegir chofer en Vehículos/Recorridos/Despachos — no había
// pantalla de administración de usuarios/roles en el frontend. Esa pantalla
// (/usuarios) ya existe (ver claude/plan-integracion-backend.md, sección
// 34) y agrega las funciones de escritura más abajo.
//
// `roles`: confirmado contra el schema real (`UsuarioConRolesDto` /
// `RolAsignadoDto` del OpenAPI) que NO es solo `{ codigo }[]` como se había
// asumido en un principio (nunca hizo falta más que el código para resolver
// nombres) — cada asignación tiene su propio `asignacionId` (necesario para
// poder quitarla) y su `scopeTipo`/`scopeId` (una asignación puede ser
// global o acotada a un punto puntual).
//
// `tipoChofer`: el enum real es "propio" | "gestor" (confirmado en
// `CrearUsuarioDto`/`ActualizarUsuarioDto`) — se corrige acá; antes decía
// "propio" | "tercero" sin haberse chequeado nunca contra el schema porque
// hasta ahora el campo solo se leía, nunca se escribía.
export interface RolAsignadoApi {
  asignacionId: string;
  codigo: string;
  scopeTipo: string;
  scopeId: string | null;
}

export interface UsuarioApi {
  id: string;
  nombre: string;
  username: string;
  activo: boolean;
  puntoId: string;
  tipoChofer: "propio" | "gestor" | null;
  roles: RolAsignadoApi[];
}

export async function listUsuarios(): Promise<UsuarioApi[]> {
  const token = await requireToken();
  // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
  const pagina = await apiFetchColeccion<UsuarioApi>("/usuarios?limite=200", { token });
  return pagina.datos;
}

// Variante "best effort": el backend confirmó (2026-09-15, ver sección 18.2
// del plan de integración) que un rol sin permiso para listar todos los
// usuarios recibe 403 en GET /usuarios — y varias pantallas (Seguimiento,
// Custodia, Rutas/Recorridos) llamaban a listUsuarios() sin manejo de error,
// adentro de un Promise.all que arma toda la página: un 403 ahí tiraba abajo
// la pantalla ENTERA para ese rol (error de Server Components sin detalle en
// producción). En todos esos casos el resultado solo se usa para resolver un
// id a un nombre (chofer, responsable, etc.) con un fallback tipo
// `map.get(id) ?? "—"` — nunca es indispensable para que la pantalla cargue.
// Por eso esta variante nunca tira: si listUsuarios() falla, devuelve []
// (con un console.error para que quede rastro) y quien la use sigue
// funcionando, solo que sin poder resolver nombres de usuario.
export async function listUsuariosSeguro(): Promise<UsuarioApi[]> {
  try {
    return await listUsuarios();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /usuarios (la pantalla sigue funcionando, pero sin nombres de usuario/chofer donde correspondan):",
      err
    );
    return [];
  }
}

// -- Escritura real (2026-09-18) -------------------------------------------
// Confirmado contra el OpenAPI real (/docs-json, tag "usuarios"): el
// backend YA tiene el CRUD completo de usuarios y la gestión de sus roles
// (no solo el listado de arriba, que hasta hoy se usaba solo para resolver
// nombres en selects de otras pantallas). Se agrega acá para la nueva
// pantalla /usuarios (reemplaza a la vieja "Personal", que era 100% mock —
// ver claude/plan-integracion-backend.md, sección 34).
//
// OJO con `tipoChofer`: el enum real del backend es "propio" | "gestor"
// (confirmado en el schema `CrearUsuarioDto`/`ActualizarUsuarioDto` del
// OpenAPI) — DISTINTO del "propio" | "tercero" que tenía la interfaz
// `UsuarioApi` de este archivo hasta ahora (nunca se había chequeado contra
// el schema real porque hasta hoy `tipoChofer` solo se leía, no se
// escribía). Se corrige acá mismo.

export interface CrearUsuarioInput {
  nombre: string;
  username: string;
  password: string;
  puntoId: string;
  tipoChofer?: "propio" | "gestor" | null;
}

export async function createUsuario(data: CrearUsuarioInput): Promise<UsuarioApi> {
  const token = await requireToken();
  return apiFetch<UsuarioApi>("/usuarios", { method: "POST", token, body: data });
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  activo?: boolean;
  puntoId?: string;
  tipoChofer?: "propio" | "gestor" | null;
}

export async function actualizarUsuario(
  id: string,
  data: ActualizarUsuarioInput
): Promise<UsuarioApi> {
  const token = await requireToken();
  return apiFetch<UsuarioApi>(`/usuarios/${id}`, { method: "PATCH", token, body: data });
}

// PUT /usuarios/{id}/clave — resetea la contraseña de un usuario. El
// backend no pide la clave anterior (esto es un reseteo administrativo, no
// un "cambiar mi propia clave" que el propio usuario haría con la actual a
// mano) — mínimo 8 caracteres (`CambiarClaveDto.password.minLength`).
export async function cambiarClave(id: string, password: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/usuarios/${id}/clave`, {
    method: "PUT",
    token,
    body: { password },
  });
}

// -- Roles asignados a un usuario -------------------------------------------
// Un usuario puede tener varios roles, cada asignación con su propio scope
// (global, o acotado a un punto puntual vía scopeId) — por eso viene en
// `UsuarioApi.roles` como un array de asignaciones con su propio
// `asignacionId` (no simplemente una lista de códigos de rol), y por eso
// quitar un rol pide el id de la ASIGNACIÓN, no el código del rol (dos
// asignaciones del mismo rol en dos puntos distintos son asignaciones
// distintas).
export interface AsignarRolInput {
  rolCodigo: string;
  scopeTipo?: "global" | "punto";
  scopeId?: string;
}

export async function asignarRol(usuarioId: string, data: AsignarRolInput): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/usuarios/${usuarioId}/roles`, { method: "POST", token, body: data });
}

export async function quitarRol(usuarioId: string, asignacionId: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/usuarios/${usuarioId}/roles/${asignacionId}`, {
    method: "DELETE",
    token,
  });
}
