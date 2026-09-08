import type { MovimientoCrr } from "@/types";
import { ENCOMIENDAS } from "./encomiendas";
import { mulberry32, pick, daysAgoIso } from "./seed-random";

function buildCrr(): MovimientoCrr[] {
  const rng = mulberry32(5510);
  const crrEncomiendas = ENCOMIENDAS.filter((e) => e.tipo === "CRR");
  return crrEncomiendas.map((e, i) => ({
    id: `crr-${i + 1}`,
    encomiendaId: e.id,
    remito: e.remito,
    cliente: e.origen.nombre,
    monto: e.montoCrr ?? 0,
    estado: e.crrCobrado ? pick(rng, ["COBRADO", "RENDIDO"] as const) : "PENDIENTE",
    fecha: daysAgoIso(rng, 14),
  }));
}

export const MOVIMIENTOS_CRR: MovimientoCrr[] = buildCrr();
