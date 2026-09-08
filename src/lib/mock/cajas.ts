import type { CierreCaja, ItemGasto } from "@/types";
import { mulberry32, intBetween, pick, daysAgoIso } from "./seed-random";
import { PERSONAL } from "./personal";

const GASTOS_BASE_CONCEPTOS = [
  "Viático",
  "Nafta",
  "Comisión",
  "Peaje",
  "Gomería",
  "Lavadero",
  "Repuestos",
];

const DENOMINACIONES = [20000, 10000, 2000, 1000, 500, 200, 100];

function gastos(rng: () => number, conceptos: string[], n: number): ItemGasto[] {
  const out: ItemGasto[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `g-${i}-${Math.floor(rng() * 1e6)}`,
      concepto: pick(rng, conceptos),
      detalle: undefined,
      importe: intBetween(rng, 500, 15000),
    });
  }
  return out;
}

function buildCierres(count: number): CierreCaja[] {
  const rng = mulberry32(31337);
  const out: CierreCaja[] = [];
  const choferes = PERSONAL.filter((p) => p.permisos.levantes);

  for (let i = 0; i < count; i++) {
    const personal = pick(rng, choferes.length ? choferes : PERSONAL);
    const gastosBase = gastos(rng, GASTOS_BASE_CONCEPTOS, intBetween(rng, 1, 4));
    const gastoCliente = gastos(rng, ["CRR armado", "Gasto cliente realizado"], intBetween(rng, 0, 2));
    const otras = gastos(rng, ["Cambio recibido", "Préstamo recupero"], intBetween(rng, 0, 2));

    out.push({
      id: `cierre-${i + 1}`,
      personalId: personal.id,
      fecha: daysAgoIso(rng, 14),
      entregasCobradas: {
        remito: intBetween(rng, 0, 12),
        flete: intBetween(rng, 0, 60000),
        crr: intBetween(rng, 0, 40000),
      },
      levantes: { remito: intBetween(rng, 0, 10), flete: intBetween(rng, 0, 30000) },
      soloEntrega: intBetween(rng, 0, 5),
      gastosBase,
      gastoCliente,
      otrasCobranzas: otras,
      denominaciones: DENOMINACIONES.map((nominacion) => ({
        nominacion,
        cantidad: rng() > 0.5 ? intBetween(rng, 0, 20) : 0,
      })),
      efectivoRendido: intBetween(rng, 5000, 90000),
      estado: pick(rng, ["ABIERTA", "CERRADA", "CONCILIADA"] as const),
    });
  }
  return out;
}

export const CIERRES_CAJA: CierreCaja[] = buildCierres(24);
