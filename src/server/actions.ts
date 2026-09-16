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
import * as provinciasService from "./services/provincias";
import * as sectoresService from "./services/sectores";
import * as puntosService from "./services/puntos";
import * as vehiculosService from "./services/vehiculos";
import * as recorridosService from "./services/recorridos";
import * as usuariosService from "./services/usuarios";
import * as enviosService from "./services/envios";
import * as clientesService from "./services/clientes";
import * as seguimientoService from "./services/seguimiento";
import type { CrearEnvioInput, ActualizarEnvioInput } from "./services/envios";
import type { SeguimientoResponse } from "./services/seguimiento";
import { ApiError } from "./api-client";
import type {
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

// ---------------------------------------------------------------------------
// 2026-09-16: el usuario reportó (operando como `operador_obera`, un rol sin
// todos los permisos) un cartel genérico "Minified React error #441" al
// editar/borrar Vehículos y al tocar Geografía en producción, en vez del
// detalle real del rechazo (típicamente un 403 de permisos). Causa: mismo
// bug que el bug 9 (ver claude/plan-integracion-backend.md) — estas
// acciones dejaban que el `ApiError` cruzara el límite del Server Action
// ("use server"), y Next.js redacta el mensaje de CUALQUIER error que cruza
// ese límite en producción (se ve el texto real solo en `pnpm dev` local).
// El bug 9 ya había arreglado esto para crearEnvioAction y las acciones de
// Seguimiento con `comoAccionResultado`, pero quedó pendiente aplicarlo al
// resto ("no se tocaron todavía porque no se confirmó que alguna haya
// fallado así en producción" — ya se confirmó). Acá se generaliza para
// TODAS las acciones de escritura contra el backend real que faltaban:
// Clientes, Vehículos, Sucursales, Localidades, Provincias, Sectores y
// Rutas/Recorridos (Encomiendas/Personal/Cajas/CRR siguen sobre el mock de
// db.ts, sin ApiError posible, no les aplica este patrón).
//
// `comoResultado` es la versión genérica que además devuelve el dato creado/
// editado (la UI de estas pantallas lo usa para actualizar sin recargar);
// `comoAccionResultado` (más abajo, ya existía) sigue igual para las
// acciones que no necesitan devolver nada.
type ResultadoConDato<T> = { ok: true; data: T } | { ok: false; title: string; message: string };

async function comoResultado<T>(fn: () => Promise<T>): Promise<ResultadoConDato<T>> {
  try {
    const data = await fn();
    revalidateAll();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, title: err.title, message: err.message };
    }
    throw err;
  }
}

type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

async function comoAccionResultado(fn: () => Promise<void>): Promise<AccionResultado> {
  try {
    await fn();
    revalidateAll();
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, title: err.title, message: err.message };
    }
    throw err;
  }
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

// updateClienteAction: agregado 2026-09-15, backend confirmo que ya existe
// PATCH /clientes/{id} (antes no — ver el comentario completo en
// src/server/services/clientes.ts). Ademas de alta (POST) y
// listado/busqueda (GET) sigue existiendo la baja por soft-delete (DELETE
// — ver removeClienteAction mas abajo).
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
  return comoResultado(() => vehiculosService.createVehiculo(data));
}
export async function updateVehiculoAction(
  id: string,
  patch: { nombre?: string; tipo?: string; patente?: string | null; activo?: boolean }
) {
  return comoResultado(() => vehiculosService.updateVehiculo(id, patch));
}
export async function removeVehiculoAction(id: string) {
  return comoResultado(() => vehiculosService.updateVehiculo(id, { activo: false }));
}

export async function listUsuariosAction() {
  return usuariosService.listUsuarios();
}

// -- Sucursales -----------------------------------------------------------------

export async function updateSucursalAction(
  id: string,
  patch: { nombre?: string; localidadId?: string; tipo?: "base" | "deposito"; activo?: boolean }
) {
  return comoResultado(() => puntosService.updatePunto(id, patch));
}
export async function createSucursalAction(data: {
  nombre: string;
  localidadId: string;
  tipo: "base" | "deposito";
}) {
  return comoResultado(() => puntosService.createPunto(data));
}

// -- Localidades ----------------------------------------------------------------

export async function updateLocalidadAction(
  id: string,
  patch: { nombre?: string; provinciaId?: string }
) {
  return comoResultado(() => localidadesService.updateLocalidad(id, patch));
}
export async function createLocalidadAction(data: { nombre: string; provinciaId: string }) {
  return comoResultado(() => localidadesService.createLocalidad(data));
}

// -- Provincias -------------------------------------------------------------------

export async function createProvinciaAction(data: { nombre: string }) {
  return comoResultado(() => provinciasService.createProvincia(data));
}

export async function updateProvinciaAction(id: string, patch: { nombre: string }) {
  return comoResultado(() => provinciasService.updateProvincia(id, patch));
}

// -- Sectores ---------------------------------------------------------------------

export async function createSectorAction(data: { nombre: string; localidadId: string }) {
  return comoResultado(() => sectoresService.createSector(data));
}

export async function updateSectorAction(
  id: string,
  patch: { nombre?: string; localidadId?: string }
) {
  return comoResultado(() => sectoresService.updateSector(id, patch));
}

// -- Rutas ------------------------------------------------------------------------

export async function createRutaAction(data: { nombre: string; baseId: string }) {
  return comoResultado(() => recorridosService.createRecorrido(data));
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
  return comoResultado(() => recorridosService.updateRecorrido(id, patch));
}
export async function removeRutaAction(id: string) {
  return comoAccionResultado(() => recorridosService.removeRecorrido(id));
}
export async function setLocalidadesRutaAction(id: string, localidadIds: string[]) {
  return comoAccionResultado(() => recorridosService.setLocalidadesRecorrido(id, localidadIds));
}

// -- Envios (Nueva Encomienda, API real) -------------------------------------------

// Devuelve un resultado normal ({ok:false, ...}) en vez de lanzar cuando el
// backend rechaza el envío por una regla de negocio esperada (ApiError, ej.
// "no hay servicio_par" -> PAR_SIN_SERVICIO). Motivo, confirmado en vivo
// contra producción (Vercel) el 2026-09-11: cualquier error que un Server
// Action deja escapar (throw) llega al cliente con el mensaje REDACTADO por
// Next.js en producción (queda el genérico "An error occurred in the Server
// Components render..." + un digest, nunca el texto real) — solo en `pnpm
// dev` se ve el mensaje completo. Como esta es una situación de negocio
// normal (no un bug), se atrapa acá y se devuelve como dato: así el cliente
// puede mostrar el título real del backend (`err.title`, ej. "No llegamos a
// ese destino") tanto en local como en producción. Un error real e
// inesperado (ej. el backend caído) sigue relanzándose tal cual.
export async function crearEnvioAction(
  data: CrearEnvioInput
): Promise<{ ok: true; envio: Awaited<ReturnType<typeof enviosService.crearEnvio>> } | { ok: false; title: string; message: string }> {
  // Si el remitente no vino de ClienteQuickPick (sin clienteId), tratamos de
  // asociarlo a un Cliente real (o crear uno nuevo) para que la base de
  // clientes se complete sola. Mejor esfuerzo: si falla, seguimos con el
  // remitente como value object suelto, como antes. Ver
  // ensureClienteRemitente en services/clientes.ts.
  let remitente = data.remitente;
  if (!remitente.clienteId && remitente.nombre.trim()) {
    const clienteId = await clientesService.ensureClienteRemitente(
      remitente.nombre,
      remitente.telefono
    );
    if (clienteId) remitente = { ...remitente, clienteId };
  }

  try {
    const item = await enviosService.crearEnvio({ ...data, remitente });
    revalidateAll();
    return { ok: true, envio: item };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, title: err.title, message: err.message };
    }
    throw err;
  }
}

// PATCH /envios/:id — cambia lo justo y necesario para que "Editar" en
// Carga rapida corrija de verdad el envio ya creado en vez de crear uno
// duplicado (ver claude/plan-integracion-backend.md, seccion 14). Mismo
// patron de resultado que crearEnvioAction: {ok:false, title, message} para
// un rechazo de negocio del backend (ej. 400 sin clientUuid, aunque esta
// accion siempre lo manda; o 409 CLIENT_UUID_REUTILIZADO si algun dia se
// reintenta a mano con el mismo uuid) en vez de una excepcion sin manejar.
export async function actualizarEnvioAction(
  id: string,
  data: ActualizarEnvioInput
): Promise<{ ok: true; envio: Awaited<ReturnType<typeof enviosService.actualizarEnvio>> } | { ok: false; title: string; message: string }> {
  try {
    const item = await enviosService.actualizarEnvio(id, data);
    revalidateAll();
    return { ok: true, envio: item };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, title: err.title, message: err.message };
    }
    throw err;
  }
}

export async function searchClientesAction(q: string) {
  return clientesService.searchClientesPorNombre(q);
}

export async function removeClienteAction(id: string) {
  return comoAccionResultado(() => clientesService.removeCliente(id));
}

// -- Seguimiento de envío --------------------------------------------------------------

// El texto de busqueda puede ser numero de sistema, remito manual, o guia
// diaria (letra A-G + digitos, ej. "A17") — el usuario no elige el tipo.
const RE_GUIA = /^[a-gA-G]\d+$/;

export async function buscarSeguimientoAction(
  query: string
): Promise<
  | { ok: true; data: SeguimientoResponse }
  | { ok: false; notFound: true }
  | { ok: false; notFound: false; title: string; message: string }
> {
  const texto = query.trim();
  try {
    let numero: string;
    if (RE_GUIA.test(texto)) {
      const encontrados = await seguimientoService.buscarEnvioPorGuia(texto.toUpperCase());
      if (encontrados.length === 0) return { ok: false, notFound: true };
      numero = encontrados[0].numero;
    } else {
      numero = texto;
    }
    const data = await seguimientoService.getSeguimiento(numero);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "ENVIO_NO_ENCONTRADO" || err.status === 404) {
        return { ok: false, notFound: true };
      }
      return { ok: false, notFound: false, title: err.title, message: err.message };
    }
    throw err;
  }
}

export async function refrescarSeguimientoAction(
  numero: string
): Promise<
  | { ok: true; data: SeguimientoResponse }
  | { ok: false; notFound: true }
  | { ok: false; notFound: false; title: string; message: string }
> {
  return buscarSeguimientoAction(numero);
}

export async function anularEnvioAction(
  envioId: string,
  motivo: string
): Promise<AccionResultado> {
  return comoAccionResultado(() => seguimientoService.anularEnvio(envioId, motivo));
}

export async function corregirSectorEnvioAction(
  envioId: string,
  sectorId: string,
  motivo: string
): Promise<AccionResultado> {
  return comoAccionResultado(() =>
    seguimientoService.corregirSectorEnvio(envioId, sectorId, motivo)
  );
}

export async function moverEnvioDePlanillaAction(
  envioId: string,
  sectorId: string,
  motivo: string
): Promise<AccionResultado> {
  return comoAccionResultado(() =>
    seguimientoService.moverEnvioDePlanilla(envioId, sectorId, motivo)
  );
}

export async function confirmarEnvioAction(envioNumero: string): Promise<AccionResultado> {
  return comoAccionResultado(() => seguimientoService.confirmarEnvio(envioNumero));
}

export async function confirmarEnvioConEntregaAction(data: {
  envioNumero: string;
  choferId: string;
  recibidoPor?: string;
  documento?: string;
  observacion?: string;
}): Promise<AccionResultado> {
  return comoAccionResultado(() => seguimientoService.confirmarEnvioConEntrega(data));
}

export async function revertirEntregaEnvioAction(
  envioNumero: string,
  motivo: string
): Promise<AccionResultado> {
  return comoAccionResultado(() =>
    seguimientoService.revertirEntregaEnvio(envioNumero, motivo)
  );
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
