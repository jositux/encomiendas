"use client";

import * as React from "react";
import { FileSpreadsheet, Send } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EncomiendaTable } from "@/components/encomiendas/encomienda-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Encomienda } from "@/types";

export function ActivasView({ encomiendas }: { encomiendas: Encomienda[] }) {
  const [tab, setTab] = React.useState<"activas" | "entregadas">("activas");

  const activas = encomiendas.filter(
    (e) => e.estado === "EN_TRANSITO" || e.estado === "PARA_ENTREGAR"
  );
  const entregadas = encomiendas.filter((e) => e.estado === "ENTREGADA");

  return (
    <div>
      <PageHeader
        title="Encomiendas activas"
        description="Envíos en curso y entregados, con acceso rápido al detalle."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileSpreadsheet className="size-3.5" /> Exportar a Excel
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="activas" className="gap-1.5">
            <Send className="size-3.5" /> Activas ({activas.length})
          </TabsTrigger>
          <TabsTrigger value="entregadas">Entregadas ({entregadas.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "activas" ? (
        <EncomiendaTable
          data={activas}
          emptyTitle="No hay encomiendas activas"
          emptyDescription="Las encomiendas levantadas o en camino a destino van a aparecer acá."
        />
      ) : (
        <EncomiendaTable
          data={entregadas}
          emptyTitle="Todavía no hay entregas"
          emptyDescription="Cuando marques una encomienda como entregada, va a aparecer en esta lista."
        />
      )}
    </div>
  );
}
