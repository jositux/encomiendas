"use server";

import * as enviosService from "../services/envios";
import * as clientesService from "../services/clientes";
import { revalidateAll } from "./shared";
import { ApiError } from "../api-client";
import type { CrearEnvioInput, ActualizarEnvioInput } from "../services/envios";

// -- Envíos (Nueva Encomienda, API real) -------------------------------------------
// Real (src/server/services/envios.ts).

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
  data: CrearEnvioInput,
  clientUuid?: string
): Promise<
  | { ok: true; envio: Awaited<ReturnType<typeof enviosService.crearEnvio>> }
  | { ok: false; code: string; title: string; message: string }
> {
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
    const item = await enviosService.crearEnvio({ ...data, remitente }, clientUuid);
    revalidateAll();
    return { ok: true, envio: item };
  } catch (err) {
    if (err instanceof ApiError) {
      // code va aparte de title/message desde el protocolo cc-relay,
      // NOTA-2026-09-21-01 (REQ-RM-10/12): el front lo usa para distinguir
      // REMITO_EN_USO (error puntual del campo remito) de cualquier otro
      // rechazo (ej. YA_EXISTE), que sigue yendo solo al toast generico.
      return { ok: false, code: err.code, title: err.title, message: err.message };
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
