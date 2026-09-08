import type { CierreCaja, ResumenCierre } from "@/types";

export function computeResumen(cierre: CierreCaja): ResumenCierre {
  const gastosBase = cierre.gastosBase.reduce((a, i) => a + i.importe, 0);
  const gastoCliente = cierre.gastoCliente.reduce((a, i) => a + i.importe, 0);
  const otrasCobranzas = cierre.otrasCobranzas.reduce((a, i) => a + i.importe, 0);
  const fletesDestino = cierre.entregasCobradas.flete;
  const fletesOrigen = cierre.levantes.flete;
  const totalCrr = cierre.entregasCobradas.crr;

  const totalARendir =
    fletesDestino + fletesOrigen + totalCrr + otrasCobranzas - gastoCliente - gastosBase;

  return {
    fletesDestino,
    fletesOrigen,
    totalCrr,
    otrasCobranzas,
    gastoCliente,
    gastosBase,
    totalARendir,
    efectivoRendido: cierre.efectivoRendido,
    diferencia: cierre.efectivoRendido - totalARendir,
  };
}
