// Funciones y tipos puros de Nueva Encomienda, separados de nueva-view.tsx
// (paso 1 de la división de ese archivo, ~1968 líneas — ver análisis en
// cc-relay/conversación 2026-09-24). Nada acá depende de React ni de JSX:
// es la parte que se puede testear sin montar ningún componente. El
// comportamiento es exactamente el que tenía antes dentro de
// NuevaEncomiendaView, solo se movió de lugar.

import {
  bultosSchema,
  montoNoNegativoSchema,
  montoPositivoSchema,
} from "@/lib/validation";
import type {
  EnvioApi,
  FormaPagoApi,
  LugarPagoApi,
  TipoEnvioApi,
} from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";
import type { LocalidadBackend } from "@/types";

export const TIPOS: { value: TipoEnvioApi; label: string }[] = [
  { value: "paqueteria", label: "Paquetería" },
  { value: "efectivo", label: "Contra reembolso" },
  { value: "tramite", label: "Trámite" },
  { value: "interno", label: "Interno" },
];

export const LUGARES_PAGO: { value: LugarPagoApi; label: string }[] = [
  { value: "origen", label: "Origen" },
  { value: "destino", label: "Destino" },
  { value: "regreso", label: "Contra entrega (regreso)" },
];

export const FORMAS_PAGO: { value: FormaPagoApi; label: string }[] = [
  { value: "contado", label: "Contado" },
  { value: "cuenta_corriente", label: "Cuenta corriente" },
];

export interface OrigenState {
  nombre: string;
  telefono: string;
  clienteId?: string;
  // Domicilio y localidad propia del remitente — changelog 2026-09-15,
  // opcionales (antes ni existian). Espejan a DestinoState.
  calle: string;
  numero: string;
  piso: string;
  referencia: string;
  localidadId: string;
}

export interface DestinoState {
  nombre: string;
  telefono: string;
  calle: string;
  numero: string;
  piso: string;
  referencia: string;
  localidadId: string;
  sectorId: string;
  clienteId?: string;
  domicilioId?: string;
}

export function emptyOrigen(): OrigenState {
  return { nombre: "", telefono: "", calle: "", numero: "", piso: "", referencia: "", localidadId: "" };
}

export function emptyDestino(localidades: LocalidadBackend[], sectores: SectorApi[]): DestinoState {
  const localidadId = localidades[0]?.id ?? "";
  const sectorId = sectores.find((s) => s.localidadId === localidadId)?.id ?? "";
  return {
    nombre: "",
    telefono: "",
    calle: "",
    numero: "",
    piso: "",
    referencia: "",
    localidadId,
    sectorId,
  };
}

export function guiaDeEnvio(e: EnvioApi): string {
  // Protocolo cc-relay, NOTA-2026-09-21-01, REQ-RM-07: si el envío tiene
  // remito manual (el número de talonario que anotó el operador), ESE es
  // el identificador principal — antes que la guía real (letra+numero, ej.
  // "C1", que asigna el negocio en mostrador y vive en guiaDiaria) y que el
  // correlativo interno del sistema (`numero`, "000000001-7", no es lo que
  // se dice/escribe como guía. Confirmado probando en vivo).
  return e.remitoManualNumero ?? e.guiaDiaria ?? e.numero ?? e.id?.slice(0, 8) ?? "—";
}

// ---- Carga rápida: un remitente fijo, varios destinos, cada uno se guarda
// como un envío propio (no existe un endpoint de alta en lote en el backend
// real — ver plan-integracion-backend.md). Cada fila tiene su propio estado
// para que un destino con error no bloquee a los demás ya cargados.
export type EstadoFila = "editando" | "guardando" | "ok" | "error";

export interface FilaDestino {
  id: string;
  destino: DestinoState;
  tipo: TipoEnvioApi;
  lugarPago: LugarPagoApi;
  formaPago: FormaPagoApi;
  bultos: number;
  flete: number | "";
  montoCrr: number | "";
  remitoManual: string;
  // Campos nuevos del changelog 2026-09-15 — opcionales.
  valorDeclarado: number | "";
  gasto: number | "";
  observaciones: string;
  status: EstadoFila;
  resultado?: EnvioApi;
  errorMsg?: string;
  errores: Record<string, string>;
  // Snapshot tomado justo antes de entrar en "Editar" sobre una fila ya
  // guardada (fila.resultado existente) — permite que "Cancelar" restaure
  // los valores previos en vez de simplemente borrar la fila (que además de
  // perder los cambios sin guardar, hacía desaparecer del todo un envío que
  // sigue existiendo en el backend). No se usa en filas nunca guardadas.
  previo?: Pick<
    FilaDestino,
    | "destino"
    | "tipo"
    | "lugarPago"
    | "formaPago"
    | "bultos"
    | "flete"
    | "montoCrr"
    | "remitoManual"
    | "valorDeclarado"
    | "gasto"
    | "observaciones"
  >;
}

export function nuevaFilaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fila-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// "Agregar destino": arranca en blanco, pero hereda tipo/flete/lugarPago/
// formaPago/bultos de la última fila (sea cual sea su estado) — es lo que
// normalmente se repite entre destinos de una misma carga.
export function filaEnBlanco(
  localidades: LocalidadBackend[],
  sectores: SectorApi[],
  heredarDe?: FilaDestino
): FilaDestino {
  return {
    id: nuevaFilaId(),
    destino: emptyDestino(localidades, sectores),
    tipo: heredarDe?.tipo ?? "paqueteria",
    lugarPago: heredarDe?.lugarPago ?? "destino",
    formaPago: heredarDe?.formaPago ?? "contado",
    bultos: heredarDe?.bultos ?? 1,
    flete: heredarDe?.flete ?? "",
    montoCrr: "",
    remitoManual: "",
    valorDeclarado: "",
    gasto: "",
    observaciones: "",
    status: "editando",
    errores: {},
  };
}

// "Duplicar": clona TODO (destinatario, domicilio y valores de pago) de una
// fila existente — para cuando hay que mandar 2+ paquetes a la misma
// dirección sin volver a tipear nada. El remito manual no se copia (cada
// bulto suele tener el suyo si se usa).
export function filaDuplicada(origen: FilaDestino): FilaDestino {
  return {
    ...origen,
    id: nuevaFilaId(),
    destino: { ...origen.destino },
    remitoManual: "",
    status: "editando",
    resultado: undefined,
    errorMsg: undefined,
    errores: {},
  };
}

export function validarFila(f: FilaDestino): Record<string, string> {
  const next: Record<string, string> = {};
  if (!f.destino.nombre.trim()) next.nombre = "Ingresá el destinatario.";
  if (!f.destino.calle.trim()) next.calle = "Ingresá la calle de destino.";
  if (!f.destino.localidadId) next.localidad = "Elegí la localidad de destino.";
  const bultosCheck = bultosSchema.safeParse(f.bultos);
  if (!bultosCheck.success) next.bultos = bultosCheck.error.issues[0].message;
  const fleteCheck = montoNoNegativoSchema.safeParse(f.flete === "" ? 0 : f.flete);
  if (!fleteCheck.success) next.flete = fleteCheck.error.issues[0].message;
  if (f.tipo === "efectivo") {
    const montoCheck = montoPositivoSchema.safeParse(f.montoCrr === "" ? 0 : f.montoCrr);
    if (!montoCheck.success) next.montoCrr = montoCheck.error.issues[0].message;
  }
  return next;
}
