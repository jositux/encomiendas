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

export async function createVehiculoAction(data: Omit<Vehiculo, "id">) {
  const item = await db.createVehiculo(data);
  revalidateAll();
  return item;
}
export async function updateVehiculoAction(id: string, patch: Partial<Vehiculo>) {
  await db.updateVehiculo(id, patch);
  revalidateAll();
}
export async function removeVehiculoAction(id: string) {
  await db.removeVehiculo(id);
  revalidateAll();
}

// -- Sucursales -----------------------------------------------------------------

export async function updateSucursalAction(id: string, patch: Partial<Sucursal>) {
  await db.updateSucursal(id, patch);
  revalidateAll();
}
export async function createSucursalAction(data: Omit<Sucursal, "id">) {
  const item = await db.createSucursal(data);
  revalidateAll();
  return item;
}

// -- Localidades ----------------------------------------------------------------

export async function updateLocalidadAction(id: string, patch: Partial<Localidad>) {
  await db.updateLocalidad(id, patch);
  revalidateAll();
}
export async function createLocalidadAction(data: Omit<Localidad, "id">) {
  const item = await db.createLocalidad(data);
  revalidateAll();
  return item;
}

// -- Rutas ------------------------------------------------------------------------

export async function createRutaAction(data: Omit<GrupoRuta, "id">) {
  const item = await db.createRuta(data);
  revalidateAll();
  return item;
}
export async function updateRutaAction(id: string, patch: Partial<GrupoRuta>) {
  await db.updateRuta(id, patch);
  revalidateAll();
}
export async function removeRutaAction(id: string) {
  await db.removeRuta(id);
  revalidateAll();
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
