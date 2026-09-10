"use server";

// ---------------------------------------------------------------------------
// Server Actions: el único lugar desde el que los componentes cliente pueden
// mutar datos. Cada acción delega en src/server/db.ts (que persiste en
// .data/db.json) y después revalida el árbol de rutas para que cualquier
// Server Component que dependa de esos datos se vuelva a renderizar con
// información fresca la próxima vez que el usuario navegue o que Next
// refresque la ruta actual.
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import * as db from "./db";
import * as localidadesService from "./services/localidades";
import * as puntosService from "./services/puntos";
import * as vehiculosService from "./services/vehiculos";
import * as recorridosService from "./services/recorridos";
import * as usuariosService from "./services/usuarios";
import * as enviosService from "./services/envios";
import * as clientesService from "./services/clientes";
import type { CrearEnvioInput } from "./services/envios";
import type {
  Cliente,
  Encomienda,
  GrupoRuta,
  Localidad,
  Personal,
  Sucursal,
  Vehiculo,
  CierreCaja,
  MovimientoCrr,
} from "@/types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// -- Encomiendas --------------------------------------------------------------

export async function createEncomiendaAction(data: Omit<Encomienda, "id">) {
  const item = await db.createEncomienda(data);
  revalidateAll();
  return item;
}
export async function updateEncomiendaAction(id: string, patch: Partial<Encomienda>) {
  await db.updateEncomienda(id, patch);
  revalidateAll();
}
export async function removeEncomiendaAction(id: string) {
  await db.removeEncomienda(id);
  revalidateAll();
}

// -- Clientes -------------------------------------------------------------------

export async function createClienteAction(data: Omit<Cliente, "id" | "createdAt">) {
  const item = await db.createCliente(data);
  revalidateAll();
  return item;
}
export async function updateClienteAction(id: string, patch: Partial<Cliente>) {
  await db.updateCliente(id, patch);
  revalidateAll();
}
export async function removeClienteAction(id: string) {
  await db.removeCliente(id);
  revalidateAll();
}

// -- Personal -------------------------------------------------------------------

export async function createPersonalAction(data: Omit<Personal, "id">) {
  const item = await db.createPersonal(data);
  revalidateAll();
  return item;
}
export async function updatePersonalAction(id: string, patch: Partial<Personal>) {
  await db.updatePersonal(id, patch);
  revalidateAll();
}
export async function removePersonalAction(id: string) {
  await db.removePersonal(id);
  revalidateAll();
}

// -- Vehículos ------------------------------------------------------------------

export async function createVehiculoAction(data: {
  nombre: string;
  tipo: string;
  patente?: string | null;
}) {
  const item = await vehiculosService.createVehiculo(data);
  revalidateAll();
  return item;
}
export async function updateVehiculoAction(
  id: string,
  patch: { nombre?: string; tipo?: string; patente?: string | null; activo?: boolean }
) {
  const item = await vehiculosService.updateVehiculo(id, patch);
  revalidateAll();
  return item;
}
export async function removeVehiculoAction(id: string) {
  await vehiculosService.updateVehiculo(id, { activo: false });
  revalidateAll();
}

export async function listUsuariosAction() {
  return usuariosService.listUsuarios();
}

// -- Sucursales -----------------------------------------------------------------

export async function updateSucursalAction(
  id: string,
  patch: { nombre?: string; localidadId?: string; tipo?: "base" | "deposito"; activo?: boolean }
) {
  const item = await puntosService.updatePunto(id, patch);
  revalidateAll();
  return item;
}
export async function createSucursalAction(data: {
  nombre: string;
  localidadId: string;
  tipo: "base" | "deposito";
}) {
  const item = await puntosService.createPunto(data);
  revalidateAll();
  return item;
}

// -- Localidades ----------------------------------------------------------------

export async function updateLocalidadAction(
  id: string,
  patch: { nombre?: string; provinciaId?: string }
) {
  const item = await localidadesService.updateLocalidad(id, patch);
  revalidateAll();
  return item;
}
export async function createLocalidadAction(data: { nombre: string; provinciaId: string }) {
  const item = await localidadesService.createLocalidad(data);
  revalidateAll();
  return item;
}

// -- Rutas ------------------------------------------------------------------------

export async function createRutaAction(data: { nombre: string; baseId: string }) {
  const item = await recorridosService.createRecorrido(data);
  revalidateAll();
  return item;
}
export async function updateRutaAction(
  id: string,
  patch: {
    nombre?: string;
    baseId?: string;
    choferPredeterminadoId?: string | null;
    vehiculoPredeterminadoId?: string | null;
    horaCorte?: string | null;
    activo?: boolean;
  }
) {
  const item = await recorridosService.updateRecorrido(id, patch);
  revalidateAll();
  return item;
}
export async function removeRutaAction(id: string) {
  await recorridosService.removeRecorrido(id);
  revalidateAll();
}
export async function setLocalidadesRutaAction(id: string, localidadIds: string[]) {
  await recorridosService.setLocalidadesRecorrido(id, localidadIds);
  revalidateAll();
}

// -- Envios (Nueva Encomienda, API real) -------------------------------------------

export async function crearEnvioAction(data: CrearEnvioInput) {
  const item = await enviosService.crearEnvio(data);
  revalidateAll();
  return item;
}

export async function searchClientesAction(q: string) {
  return clientesService.searchClientes(q);
}

// -- Cajas --------------------------------------------------------------------------

export async function createCierreCajaAction(data: Omit<CierreCaja, "id">) {
  const item = await db.createCierreCaja(data);
  revalidateAll();
  return item;
}
export async function updateCierreCajaAction(id: string, patch: Partial<CierreCaja>) {
  await db.updateCierreCaja(id, patch);
  revalidateAll();
}

// -- CRR ------------------------------------------------------------------------------

export async function updateMovimientoCrrAction(id: string, patch: Partial<MovimientoCrr>) {
  await db.updateMovimientoCrr(id, patch);
  revalidateAll();
}

// -- Demo -----------------------------------------------------------------------------

export async function resetDemoDataAction() {
  await db.resetDemoData();
  revalidateAll();
}
