"use server";

import * as custodiaService from "../services/custodia";
import { ApiError } from "../api-client";
import type { AsignacionPedida, RespuestaDeRecepcion } from "../services/custodia";

// -- Recepción (un acto por escaneo) ----------------------------------------
// Real (src/server/services/custodia.ts). Una sola acción para los dos
// caminos de la pantalla: recibir (con o sin asignación) y la asignación
// sola. El rechazo del backend vuelve como dato, con su `code`, para que la
// pantalla lo clasifique (no encontrado, fuera de alcance, etc.). Un error
// que no es del backend -- no hubo respuesta -- se propaga: la pantalla lo
// trata como "sin respuesta" y ofrece reintentar con el mismo clientUuid.
//
// No revalida nada: cada escaneo dispararía una recarga de la propia
// pantalla (sectores, recorridos) en medio de la tanda.
export type ResultadoDeRecepcion =
  | { ok: true; data: RespuestaDeRecepcion }
  | { ok: false; status: number; code: string; title: string; message: string };

export async function procesarLecturaAction(pedido: {
  envioNumero: string;
  clientUuid: string;
  occurredAt: string;
  asignacion?: AsignacionPedida;
  // true: no recibe, solo asigna (POST /custodia/asignaciones).
  soloAsignar: boolean;
}): Promise<ResultadoDeRecepcion> {
  try {
    const { soloAsignar, asignacion, ...resto } = pedido;
    const data =
      soloAsignar && asignacion
        ? await custodiaService.asignarEnCustodia({
            envioNumero: resto.envioNumero,
            clientUuid: resto.clientUuid,
            asignacion,
          })
        : await custodiaService.recibirEnvio({ ...resto, asignacion });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        status: err.status,
        code: err.code,
        title: err.title,
        message: err.message,
      };
    }
    throw err;
  }
}
