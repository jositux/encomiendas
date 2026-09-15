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

// No hay updateClienteAction: el backend real sigue sin PATCH/PUT
// /clientes/{id} (edicion), solo alta (POST), listado/busqueda (GET) y baja
// por soft-delete (DELETE, agregada despues — ver removeClienteAction mas
// abajo). Ver el comentario completo en src/server/services/clientes.ts.
export async function createClienteAction(
  data: Parameters<typeof clientesService.createCliente>[0]
) {
  const item = await clientesService.createCliente(data);
  revalidateAll();
  return item;
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
  await clientesService.removeCliente(id);
  revalidateAll();
}

// -- Seguimiento de envío --------------------------------------------------------------

type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

// Toda acción de escritura de este tablero puede recibir un rechazo de
// negocio esperado del backend (409 ENVIO_EN_REPARTO, 409
// CONFIRMADOR_ES_ENTREGADOR, 409 TENEDOR_INCORRECTO, 409 ENVIO_CONFIRMADO/
// ENVIO_NO_ENTREGADO, 403 de otra base) — se atrapa el ApiError y se
// devuelve como dato en vez de dejarlo cruzar el limite del Server Action,
// mismo patron que crearEnvioAction (ver bug 9 de
// claude/plan-integracion-backend.md: si no, Next redacta el mensaje real
// en produccion).
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
