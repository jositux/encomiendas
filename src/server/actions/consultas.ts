"use server";

import * as consultasService from "../services/consultas";

// -- Consultas (pantalla real de Depósito, sección 35 del plan) -------------
// Lecturas puras — sin comoResultado/comoAccionResultado (mismo criterio
// que searchClientesAction/buscarEnvioPorGuia): quien llama (la vista,
// re-consultando al cambiar de pestaña o filtro) atrapa el error con su
// propio try/catch y muestra el toast, en vez de recibir un {ok,...}
// envuelto para algo que no es una mutación.

export async function consultarEnviosAction(filtro: consultasService.FiltroConsultaEnvios) {
  return consultasService.listConsultaEnvios(filtro);
}

export async function listFallidosAction(filtro: { minimo?: number; localidadDestinoId?: string }) {
  return consultasService.listFallidos(filtro);
}

export async function listConfirmacionesPendientesAction(filtro: {
  fecha?: string;
  choferId?: string;
}) {
  return consultasService.listConfirmacionesPendientes(filtro);
}
