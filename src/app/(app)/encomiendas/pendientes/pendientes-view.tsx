"use client";

import * as React from "react";
import { Hourglass, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EncomiendaTable } from "@/components/encomiendas/encomienda-table";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { updateEncomiendaAction } from "@/server/actions";
import type { Encomienda } from "@/types";

export function PendientesView({ pendientes }: { pendientes: Encomienda[] }) {
  const [pending, setPending] = React.useState(false);

  async function levantarTodas() {
    if (pendientes.length === 0) return;
    setPending(true);
    await Promise.all(
      pendientes.map((e) => updateEncomiendaAction(e.id, { estado: "EN_TRANSITO" }))
    );
    setPending(false);
    toast.success(`${pendientes.length} encomiendas levantadas`);
  }

  return (
    <div>
      <PageHeader
        title="Pendientes"
        description="Encomiendas cargadas que todavía no fueron levantadas por un chofer."
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={pendientes.length === 0 || pending}
            onClick={levantarTodas}
          >
            <Truck className="size-3.5" /> Levantar todas
          </Button>
        }
      />

      <div className="mb-4">
        <StatCard
          label="Pendientes de levante"
          value={pendientes.length}
          icon={Hourglass}
          tone="warning"
          className="max-w-xs"
        />
      </div>

      <EncomiendaTable
        data={pendientes}
        emptyTitle="No hay pendientes"
        emptyDescription="Todas las encomiendas cargadas ya fueron levantadas."
      />
    </div>
  );
}
