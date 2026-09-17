"use server";

import * as seguimientoService from "../services/seguimiento";
import { comoAccionResultado } from "./shared";
import type { AccionResultado } from "./shared";
import { ApiError } from "../api-client";
import type { SeguimientoResponse } from "../services/seguimiento";

// -- Seguimiento de envío --------------------------------------------------------------
// Real (src/server/services/seguimiento.ts).

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
