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
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EncomiendaTable } from "@/components/encomiendas/encomienda-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Encomienda } from "@/types";

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
