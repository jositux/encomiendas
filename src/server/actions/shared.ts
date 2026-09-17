import "server-only";

import { revalidatePath } from "next/cache";
import { ApiError } from "../api-client";

// ---------------------------------------------------------------------------
// Helpers compartidos por todas las acciones reales (contra el backend).
// Separados acá el 2026-09-17 cuando actions.ts (511 líneas, todo en un
// solo archivo) se partió en un archivo por dominio dentro de esta
// carpeta — mismo criterio que ya usa src/server/services/*. Ver
// claude/plan-integracion-backend.md, sección 29.
//
// No llevan "use server": no son Server Actions en sí (no las llama
// directo ningún Client Component), son funciones internas que llaman las
// Server Actions de los demás archivos de esta carpeta.
// ---------------------------------------------------------------------------

export function revalidateAll() {
  revalidatePath("/", "layout");
}

// 2026-09-16: el usuario reportó (operando como `operador_obera`, un rol sin
// todos los permisos) un cartel genérico "Minified React error #441" al
// editar/borrar Vehículos y al tocar Geografía en producción, en vez del
// detalle real del rechazo (típicamente un 403 de permisos). Causa: Next.js
// redacta el mensaje de CUALQUIER error que cruza el límite de un Server
// Action ("use server") en producción (se ve el texto real solo en `pnpm
// dev` local). `comoResultado`/`comoAccionResultado` atrapan el `ApiError`
// acá adentro y lo devuelven como dato en vez de dejarlo escapar.
//
// `comoResultado` devuelve además el dato creado/editado (la UI lo usa para
// actualizar sin recargar); `comoAccionResultado` no devuelve nada.
export type ResultadoConDato<T> =
  | { ok: true; data: T }
  | { ok: false; title: string; message: string };

export async function comoResultado<T>(fn: () => Promise<T>): Promise<ResultadoConDato<T>> {
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

export type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

export async function comoAccionResultado(fn: () => Promise<void>): Promise<AccionResultado> {
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
