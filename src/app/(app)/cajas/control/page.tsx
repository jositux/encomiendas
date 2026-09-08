import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { getCierresCaja } from "@/server/db";
import { computeResumen } from "@/lib/cajas";
import { formatCurrency } from "@/lib/format";
import { Wallet, AlertTriangle, CheckCircle2, Landmark } from "lucide-react";
import { ControlCajasTable } from "./control-view";

export default async function ControlCajasPage() {
  const cierresCaja = await getCierresCaja();
  const enriched = cierresCaja.map((c) => ({ cierre: c, resumen: computeResumen(c) }));

  const totalRendido = enriched.reduce((a, e) => a + e.resumen.efectivoRendido, 0);
  const conDiferencia = enriched.filter((e) => Math.abs(e.resumen.diferencia) > 0).length;
  const conciliadas = cierresCaja.filter((c) => c.estado === "CONCILIADA").length;

  return (
    <div>
      <PageHeader
        title="Control de cajas"
        description="Panel administrativo de todas las rendiciones diarias."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cierres registrados" value={cierresCaja.length} icon={Wallet} />
        <StatCard
          label="Total rendido"
          value={formatCurrency(totalRendido)}
          icon={Landmark}
          tone="success"
        />
        <StatCard
          label="Con diferencia"
          value={conDiferencia}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Conciliadas"
          value={conciliadas}
          icon={CheckCircle2}
          tone="info"
        />
      </div>

      <ControlCajasTable enriched={enriched} />
    </div>
  );
}
