"use server";

import * as usuariosService from "../services/usuarios";
import { comoResultado, comoAccionResultado } from "./shared";

// -- Usuarios (administración real, sección 34 del plan) --------------------

export async function createUsuarioAction(data: usuariosService.CrearUsuarioInput) {
  return comoResultado(() => usuariosService.createUsuario(data));
}

export async function actualizarUsuarioAction(
  id: string,
  data: usuariosService.ActualizarUsuarioInput
) {
  return comoResultado(() => usuariosService.actualizarUsuario(id, data));
}

export async function cambiarClaveAction(id: string, password: string) {
  return comoAccionResultado(() => usuariosService.cambiarClave(id, password));
}

export async function asignarRolAction(
  usuarioId: string,
  data: usuariosService.AsignarRolInput
) {
  return comoAccionResultado(() => usuariosService.asignarRol(usuarioId, data));
}

export async function quitarRolAction(usuarioId: string, asignacionId: string) {
  return comoAccionResultado(() => usuariosService.quitarRol(usuarioId, asignacionId));
}
