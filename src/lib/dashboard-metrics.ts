// ---------------------------------------------------------------------------
// Métricas del tablero principal.
//
// Funciones puras que resumen el array de Encomienda ya cargado por la
// página (mismo dataset que usa el resto de la app — nada inventado). Viven
// separadas de panel-view.tsx para que el componente se ocupe solo de
// renderizar.
// ---------------------------------------------------------------------------

import type { Encomienda, EstadoEncomienda, TipoEncomienda, Provincia } from "@/types";
import { ESTADO_LABEL, TIPO_LABEL } from "@/lib/mock/encomiendas";

export interface BreakdownItem<T extends string = string> {
  key: T;
  label: string;
  count: number;
  pct: number; // 0-100, sobre el total de las claves incluidas (no del dataset completo)
}

function toBreakdown<T extends string>(
  encomiendas: Encomienda[],
  keys: readonly T[],
  labelFor: (k: T) => string,
  keyOf: (e: Encomienda) => T | undefined
): BreakdownItem<T>[] {
  const counts = keys.map((k) => encomiendas.filter((e) => keyOf(e) === k).length);
  const total = counts.reduce((a, b) => a + b, 0);
  return keys.map((k, i) => ({
    key: k,
    label: labelFor(k),
    count: counts[i],
    pct: total === 0 ? 0 : Math.round((counts[i] / total) * 100),
  }));
}

// Pipeline de estados "en curso" — se deja afuera ELIMINADA porque ya tiene
// su propio acceso rápido en "Herramientas" y ensuciaba el gráfico.
export const ESTADOS_PIPELINE: readonly EstadoEncomienda[] = [
  "PENDIENTE",
  "EN_TRANSITO",
  "PARA_ENTREGAR",
  "ENTREGADA",
  "DEVUELTA",
];

export function estadoBreakdown(encomiendas: Encomienda[]): BreakdownItem<EstadoEncomienda>[] {
  return toBreakdown(encomiendas, ESTADOS_PIPELINE, (k) => ESTADO_LABEL[k], (e) => e.estado);
}

export const TIPOS_ORDEN: readonly TipoEncomienda[] = ["PAQUETERIA", "CRR", "TRAMITE", "INTERNO"];

export function tipoBreakdown(encomiendas: Encomienda[]): BreakdownItem<TipoEncomienda>[] {
  return toBreakdown(encomiendas, TIPOS_ORDEN, (k) => TIPO_LABEL[k], (e) => e.tipo);
}

const PROVINCIA_LABEL: Record<Provincia, string> = {
  MISIONES: "Misiones",
  CORRIENTES: "Corrientes",
  CHACO: "Chaco",
};

export const PROVINCIAS_ORDEN: readonly Provincia[] = ["MISIONES", "CORRIENTES", "CHACO"];

// Provincia de destino: mide hacia dónde se está mandando la mercadería.
export function provinciaBreakdown(encomiendas: Encomienda[]): BreakdownItem<Provincia>[] {
  return toBreakdown(
    encomiendas,
    PROVINCIAS_ORDEN,
    (k) => PROVINCIA_LABEL[k],
    (e) => e.destino.provincia
  );
}

export interface TrendPoint {
  iso: string; // yyyy-mm-dd
  label: string; // "Lun", "Mar", ...
  count: number;
}

const DIA_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Encomiendas cargadas por día, últimos `dias` días (incluye hoy).
export function trendUltimosDias(encomiendas: Encomienda[], dias = 7): TrendPoint[] {
  const porDia = new Map<string, number>();
  for (const e of encomiendas) {
    const iso = e.fechaAlta.slice(0, 10);
    porDia.set(iso, (porDia.get(iso) ?? 0) + 1);
  }

  const out: TrendPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ iso, label: DIA_LABEL[d.getDay()], count: porDia.get(iso) ?? 0 });
  }
  return out;
}

const EN_CURSO: readonly EstadoEncomienda[] = ["PENDIENTE", "EN_TRANSITO", "PARA_ENTREGAR"];

export interface DashboardKpis {
  bultosActivos: number;
  encomiendasEnCurso: number;
  entregadasUltimos7Dias: number;
  fletePendiente: number;
  crrPendiente: number;
}

export function dashboardKpis(encomiendas: Encomienda[]): DashboardKpis {
  const enCurso = encomiendas.filter((e) => EN_CURSO.includes(e.estado));

  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);

  const entregadasUltimos7Dias = encomiendas.filter(
    (e) => e.estado === "ENTREGADA" && e.fechaFinalizado && new Date(e.fechaFinalizado) >= hace7Dias
  ).length;

  const fletePendiente = encomiendas
    .filter((e) => !e.fleteCobrado)
    .reduce((sum, e) => sum + e.flete, 0);

  const crrPendiente = encomiendas
    .filter((e) => e.tipo === "CRR" && !e.crrCobrado)
    .reduce((sum, e) => sum + (e.montoCrr ?? 0), 0);

  return {
    bultosActivos: enCurso.reduce((sum, e) => sum + e.bultos, 0),
    encomiendasEnCurso: enCurso.length,
    entregadasUltimos7Dias,
    fletePendiente,
    crrPendiente,
  };
}
