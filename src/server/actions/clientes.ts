"use server";

import * as clientesService from "../services/clientes";
import { comoResultado, comoAccionResultado } from "./shared";

// -- Clientes -------------------------------------------------------------------
// Real (src/server/services/clientes.ts). Antes del split del 2026-09-17
// estas 4 acciones vivían partidas en dos lugares distintos de actions.ts
// (createClienteAction/actualizarClienteAction cerca del principio,
// searchClientesAction/removeClienteAction mezcladas dentro de la sección
// de Envíos) — quedan juntas acá.

// createClienteAction/actualizarClienteAction: PATCH /clientes/{id} se
// confirmó el 2026-09-15 (antes no existía — ver el comentario completo en
// src/server/services/clientes.ts). Además de alta (POST) y
// listado/búsqueda (GET) sigue existiendo la baja por soft-delete (DELETE
// — ver removeClienteAction más abajo).
export async function createClienteAction(
  data: Parameters<typeof clientesService.createCliente>[0]
) {
  return comoResultado(() => clientesService.createCliente(data));
}

export async function actualizarClienteAction(
  id: string,
  data: clientesService.ActualizarClienteInput
) {
  return comoResultado(() => clientesService.actualizarCliente(id, data));
}

export async function searchClientesAction(q: string) {
  return clientesService.searchClientesPorNombre(q);
}

export async function removeClienteAction(id: string) {
  return comoAccionResultado(() => clientesService.removeCliente(id));
}
