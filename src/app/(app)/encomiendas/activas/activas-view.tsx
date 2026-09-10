"use client";

import * as React from "react";
import { FileSpreadsheet, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EncomiendaTable } from "@/components/encomiendas/encomienda-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localidadNombre } from "@/lib/mock/localidades";
import { personalNombre } from "@/lib/mock/personal";
import { ESTADO_LABEL, TIPO_LABEL } from "@/lib/mock/encomiendas";
import { formatDate } from "@/lib/format";
import { exportToXlsx, type ExportColumn } from "@/lib/spreadsheet-export";
import type { Encomienda } from "@/types";

const EXPORT_COLUMNS: ExportColumn<Encomienda>[] = [
  { header: "Remito", value: (e) => e.remito, width: 12 },
  { header: "Fecha", value: (e) => formatDate(e.fechaAlta), width: 10 },
  { header: "Remitente", value: (e) => e.origen.nombre, width: 22 },
  { header: "Teléfono remitente", value: (e) => e.origen.telefono, width: 16 },
  { header: "Destinatario", value: (e) => e.destino.nombre, width: 22 },
  { header: "Teléfono destinatario", value: (e) => e.destino.telefono, width: 16 },
  { header: "Dirección destino", value: (e) => e.destino.direccion, width: 26 },
  { header: "Localidad destino", value: (e) => localidadNombre(e.destino.localidadId), width: 16 },
  { header: "Tipo", value: (e) => TIPO_LABEL[e.tipo], width: 16 },
  { header: "Estado", value: (e) => ESTADO_LABEL[e.estado], width: 14 },
  { header: "Designado", value: (e) => personalNombre(e.designadoId), width: 18 },
  { header: "Bultos", value: (e) => e.bultos, width: 8 },
  { header: "Flete", value: (e) => e.flete, width: 10 },
  { header: "Monto CRR", value: (e) => e.montoCrr ?? "", width: 12 },
];

export function ActivasView({ encomiendas }: { encomiendas: Encomienda[] }) {
  const [tab, setTab] = React.useState<"activas" | "entregadas">("activas");

  const activas = encomiendas.filter(
    (e) => e.estado === "EN_TRANSITO" || e.estado === "PARA_ENTREGAR"
  );
  const entregadas = encomiendas.filter((e) => e.estado === "ENTREGADA");

  const filaActual = tab === "activas" ? activas : entregadas;

  function handleExport() {
    if (filaActual.length === 0) {
      toast.error("No hay encomiendas para exportar en esta pestaña.");
      return;
    }
    const fecha = new Date().toISOString().slice(0, 10);
    const sheetName = tab === "activas" ? "Activas" : "Entregadas";
    exportToXlsx(`encomiendas-${tab}-${fecha}.xlsx`, sheetName, EXPORT_COLUMNS, filaActual);
    toast.success(`${filaActual.length} encomienda${filaActual.length === 1 ? "" : "s"} exportada${filaActual.length === 1 ? "" : "s"}.`);
  }

  return (
    <div>
      <PageHeader
        title="Encomiendas activas"
        description="Envíos en curso y entregados, con acceso rápido al detalle."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
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
