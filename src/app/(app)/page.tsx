import Link from "next/link";
import {
  PackageCheck,
  PackageSearch,
  Truck,
  Wallet,
  ArrowRight,
} from "lucide-react";

import { NAV_GROUPS } from "@/lib/nav-config";
import { getEncomiendas, getMovimientosCrr, getSucursales } from "@/server/db";
import { getSession } from "@/server/session";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function HomePage() {
  const [encomiendas, movimientosCrr, sucursales, session] = await Promise.all([
    getEncomiendas(),
    getMovimientosCrr(),
    getSucursales(),
    getSession(),
  ]);
  const sucursal = sucursales.find((s) => s.id === session?.puntoId);

  const pendientes = encomiendas.filter((e) => e.estado === "PENDIENTE").length;
  const enTransito = encomiendas.filter((e) => e.estado === "EN_TRANSITO").length;
  const paraEntregar = encomiendas.filter((e) => e.estado === "PARA_ENTREGAR").length;
  const entregadasHoy = encomiendas.filter((e) => {
    if (e.estado !== "ENTREGADA" || !e.fechaFinalizado) return false;
    const d = new Date(e.fechaFinalizado);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const crrPendiente = movimientosCrr
    .filter((m) => m.estado === "PENDIENTE")
    .reduce((acc, m) => acc + m.monto, 0);

  const firstName = session?.nombre.split(" ")[0] ?? "Operador";

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName}`}
        description={
          sucursal
            ? `Estás trabajando en ${sucursal.nombre} · ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}`
            : undefined
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pendientes de procesar"
          value={pendientes}
          icon={PackageSearch}
          tone="warning"
        />
        <StatCard
          label="En tránsito"
          value={enTransito}
          icon={Truck}
          tone="info"
        />
        <StatCard
          label="Para entregar"
          value={paraEntregar}
          icon={PackageCheck}
          tone="default"
        />
        <StatCard
          label="CRR pendiente de cobro"
          value={formatCurrency(crrPendiente)}
          icon={Wallet}
          tone="success"
          hint={`${entregadasHoy} entregadas hoy`}
        />
      </div>

      <div className="flex flex-col gap-8">
        {NAV_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="group">
                    <Card className="h-full gap-3 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
                      <div className="flex items-start justify-between px-4">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="size-5" />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="px-4">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
