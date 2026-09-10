"use client";

import * as React from "react";
import {
  CheckCircle2,
  Send,
  Wallet,
  Clock,
  Wrench,
  PackageX,
  Users,
  UserRound,
  Package,
  Truck,
  PackageCheck,
  Banknote,
  TrendingUp,
  MapPin,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EncomiendaTable } from "@/components/encomiendas/encomienda-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { TIPO_ICON } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  dashboardKpis,
  estadoBreakdown,
  provinciaBreakdown,
  tipoBreakdown,
  trendUltimosDias,
  type BreakdownItem,
} from "@/lib/dashboard-metrics";
import type { Encomienda, EstadoEncomienda } from "@/types";

type FilterKey =
  | "procesados-mios"
  | "procesados-grupo"
  | "entregar-mios"
  | "entregar-grupo"
  | "crr-mios"
  | "crr-grupo"
  | "pendientes-mios"
  | "pendientes-grupo"
  | "eliminados"
  | "sin-designacion";

interface ColumnDef {
  label: string;
  icon: React.ElementType;
  tone: string;
  buttons: { key: FilterKey; label: string; icon: React.ElementType }[];
}

// ---------------------------------------------------------------------------
// Tarjeta de métrica ("KPI"): un número grande con su ícono, más una pista
// opcional debajo (p. ej. "de 140 en total"). El color del ícono es siempre
// uno de los tonos semánticos ya definidos en globals.css (mismo criterio que
// usan los Badge de estado), nunca un color inventado para esta pantalla.
// ---------------------------------------------------------------------------
function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/15 text-warning-foreground dark:text-warning"
      : tone === "success"
        ? "bg-success/15 text-success"
        : tone === "info"
          ? "bg-info/15 text-info"
          : "bg-primary/10 text-primary";

  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-start justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Lista de barras horizontales para un desglose (por estado / tipo /
// provincia). Cada fila lleva su etiqueta y su número al lado — la identidad
// nunca depende solo del color, así que igual se entiende en escala de
// grises o para alguien con daltonismo.
// ---------------------------------------------------------------------------
function BreakdownCard<T extends string>({
  title,
  icon: TitleIcon,
  items,
  barClassFor,
  iconFor,
}: {
  title: string;
  icon: React.ElementType;
  items: BreakdownItem<T>[];
  barClassFor: (item: BreakdownItem<T>, index: number) => string;
  iconFor?: (item: BreakdownItem<T>) => React.ElementType | undefined;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <TitleIcon className="size-4" />
          {title}
        </p>
        <div className="flex flex-col gap-2.5">
          {items.map((item, i) => {
            const ItemIcon = iconFor?.(item);
            return (
              <div key={item.key} className="flex items-center gap-2.5">
                {ItemIcon && <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground sm:w-28">
                  {item.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", barClassFor(item, i))}
                    style={{ width: `${item.count > 0 ? Math.max(item.pct, 3) : 0}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const ESTADO_BAR_CLASS: Record<EstadoEncomienda, string> = {
  PENDIENTE: "bg-warning",
  EN_TRANSITO: "bg-info",
  PARA_ENTREGAR: "bg-info",
  ENTREGADA: "bg-success",
  DEVUELTA: "bg-destructive",
  ELIMINADA: "bg-muted-foreground",
};

// Colores categóricos fijos (identidad, no estado) — mismo orden siempre,
// tomados de los --chart-1..5 que ya definía el tema de la app.
const CHART_BAR_CLASS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

// ---------------------------------------------------------------------------
// Barras verticales simples para la tendencia de los últimos 7 días. Una
// sola serie (cantidad cargada por día) -> un solo color, sin necesidad de
// leyenda.
// ---------------------------------------------------------------------------
function TrendCard({ points }: { points: { iso: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4" />
            Encomiendas cargadas — últimos 7 días
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{total}</span> en total
          </p>
        </div>
        <div className="flex h-28 items-end gap-2 sm:gap-3">
          {points.map((p) => (
            <div key={p.iso} className="flex h-full flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {p.count}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm bg-primary/80"
                  style={{ height: `${p.count > 0 ? Math.max((p.count / max) * 100, 6) : 2}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PanelView({
  encomiendas,
  personalId,
}: {
  encomiendas: Encomienda[];
  personalId: string | null;
}) {
  const [active, setActive] = React.useState<FilterKey | null>(null);

  const mias = (list: Encomienda[]) =>
    list.filter((e) => e.operadorId === personalId);

  const procesadas = encomiendas.filter(
    (e) => e.estado === "EN_TRANSITO" || e.estado === "PARA_ENTREGAR" || e.estado === "ENTREGADA"
  );
  const paraEntregar = encomiendas.filter((e) => e.estado === "PARA_ENTREGAR");
  const crr = encomiendas.filter((e) => e.tipo === "CRR");
  const pendientes = encomiendas.filter((e) => e.estado === "PENDIENTE");
  const eliminadas = encomiendas.filter((e) => e.estado === "ELIMINADA");
  const sinDesignar = encomiendas.filter(
    (e) => e.estado === "PARA_ENTREGAR" && !e.designadoId
  );

  const kpis = dashboardKpis(encomiendas);
  const porEstado = estadoBreakdown(encomiendas);
  const porTipo = tipoBreakdown(encomiendas);
  const porProvincia = provinciaBreakdown(encomiendas);
  const tendencia = trendUltimosDias(encomiendas, 7);

  const columns: ColumnDef[] = [
    {
      label: "Procesados",
      icon: CheckCircle2,
      tone: "bg-info text-info-foreground",
      buttons: [
        { key: "procesados-mios", label: "Mios", icon: UserRound },
        { key: "procesados-grupo", label: "Del grupo", icon: Users },
      ],
    },
    {
      label: "Para entregar",
      icon: Send,
      tone: "bg-success text-success-foreground",
      buttons: [
        { key: "entregar-mios", label: "Mis entregas", icon: UserRound },
        { key: "entregar-grupo", label: "Del grupo", icon: Users },
      ],
    },
    {
      label: "C. Reembolso",
      icon: Wallet,
      tone: "bg-warning text-warning-foreground",
      buttons: [
        { key: "crr-mios", label: "Mios", icon: UserRound },
        { key: "crr-grupo", label: "Del grupo", icon: Users },
      ],
    },
    {
      label: "Pendientes",
      icon: Clock,
      tone: "bg-destructive text-destructive-foreground",
      buttons: [
        { key: "pendientes-mios", label: "Mios", icon: UserRound },
        { key: "pendientes-grupo", label: "Del grupo", icon: Users },
      ],
    },
    {
      label: "Herramientas",
      icon: Wrench,
      tone: "bg-accent text-accent-foreground",
      buttons: [
        { key: "eliminados", label: "Eliminados", icon: PackageX },
        { key: "sin-designacion", label: "Sin designación", icon: UserRound },
      ],
    },
  ];

  const counts: Record<FilterKey, number> = {
    "procesados-mios": mias(procesadas).length,
    "procesados-grupo": procesadas.length,
    "entregar-mios": mias(paraEntregar).length,
    "entregar-grupo": paraEntregar.length,
    "crr-mios": mias(crr).length,
    "crr-grupo": crr.length,
    "pendientes-mios": mias(pendientes).length,
    "pendientes-grupo": pendientes.length,
    eliminados: eliminadas.length,
    "sin-designacion": sinDesignar.length,
  };

  function resultsFor(key: FilterKey): Encomienda[] {
    switch (key) {
      case "procesados-mios":
        return mias(procesadas);
      case "procesados-grupo":
        return procesadas;
      case "entregar-mios":
        return mias(paraEntregar);
      case "entregar-grupo":
        return paraEntregar;
      case "crr-mios":
        return mias(crr);
      case "crr-grupo":
        return crr;
      case "pendientes-mios":
        return mias(pendientes);
      case "pendientes-grupo":
        return pendientes;
      case "eliminados":
        return eliminadas;
      case "sin-designacion":
        return sinDesignar;
      default:
        return [];
    }
  }

  return (
    <div>
      <PageHeader
        title="Tablero principal"
        description="Panel de administración y control de todo el circuito de encomiendas."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={Package}
          label="Bultos en curso"
          value={kpis.bultosActivos.toString()}
          hint={`en ${kpis.encomiendasEnCurso} envíos`}
        />
        <StatTile
          icon={Truck}
          label="Envíos en curso"
          value={kpis.encomiendasEnCurso.toString()}
          hint="pendiente + en tránsito + a entregar"
          tone="info"
        />
        <StatTile
          icon={PackageCheck}
          label="Entregadas"
          value={kpis.entregadasUltimos7Dias.toString()}
          hint="últimos 7 días"
          tone="success"
        />
        <StatTile
          icon={Banknote}
          label="Flete sin cobrar"
          value={formatCurrency(kpis.fletePendiente)}
          hint="de todos los envíos"
        />
        <StatTile
          icon={Wallet}
          label="CRR sin cobrar"
          value={formatCurrency(kpis.crrPendiente)}
          hint="contra reembolso pendiente"
          tone="warning"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <BreakdownCard
          title="Envíos por estado"
          icon={Send}
          items={porEstado}
          barClassFor={(item) => ESTADO_BAR_CLASS[item.key]}
        />
        <BreakdownCard
          title="Envíos por tipo"
          icon={Package}
          items={porTipo}
          barClassFor={(_item, i) => CHART_BAR_CLASS[i % CHART_BAR_CLASS.length]}
          iconFor={(item) => TIPO_ICON[item.key]}
        />
        <BreakdownCard
          title="Destinos por provincia"
          icon={MapPin}
          items={porProvincia}
          barClassFor={(_item, i) => CHART_BAR_CLASS[i % CHART_BAR_CLASS.length]}
        />
      </div>

      <div className="mt-3">
        <TrendCard points={tendencia} />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => {
            const ColIcon = col.icon;
            return (
              <Card key={col.label} className="gap-0 overflow-hidden py-0">
                <div className={cn("flex items-center gap-2 px-3 py-2 text-sm font-semibold", col.tone)}>
                  <ColIcon className="size-4" />
                  {col.label}
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  {col.buttons.map((b) => {
                    const BIcon = b.icon;
                    return (
                      <button
                        key={b.key}
                        onClick={() => setActive(b.key)}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent",
                          active === b.key && "border-primary bg-primary/10 text-primary"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <BIcon className="size-3.5" />
                          {b.label}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">
                          {counts[b.key]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {active ? (
          <EncomiendaTable data={resultsFor(active)} />
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Seleccioná una opción del menú superior"
            description="Elegí una categoría para ver el listado de encomiendas correspondiente."
          />
        )}
      </div>
    </div>
  );
}
