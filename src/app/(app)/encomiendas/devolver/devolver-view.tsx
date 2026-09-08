"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateEncomiendaAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import { encomiendaMatches } from "@/components/encomiendas/encomienda-table";
import { formatDate } from "@/lib/format";
import type { Encomienda } from "@/types";

export function DevolverView({ candidatas }: { candidatas: Encomienda[] }) {
  const [target, setTarget] = React.useState<Encomienda | null>(null);

  async function confirmarDevolucion() {
    if (!target) return;
    await updateEncomiendaAction(target.id, {
      estado: "DEVUELTA",
      fechaBaja: new Date().toISOString(),
    });
    toast.success(`Encomienda #${target.remito} marcada como devuelta`);
    setTarget(null);
  }

  const columns = React.useMemo<ColumnDef<Encomienda>[]>(
    () => [
      {
        accessorKey: "remito",
        header: "Remito",
        cell: ({ row }) => <span className="font-mono font-medium">#{row.original.remito}</span>,
      },
      { accessorKey: "fechaAlta", header: "Fecha", cell: ({ row }) => formatDate(row.original.fechaAlta) },
      {
        id: "destinatario",
        header: "Destinatario",
        cell: ({ row }) => (
          <div>
            <p className="max-w-44 truncate font-medium">{row.original.destino.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {localidadNombre(row.original.destino.localidadId)}
            </p>
          </div>
        ),
      },
      { accessorKey: "tipo", header: "Tipo", cell: ({ row }) => <TipoBadge tipo={row.original.tipo} /> },
      { accessorKey: "estado", header: "Estado", cell: ({ row }) => <EstadoBadge estado={row.original.estado} /> },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={(ev) => {
              ev.stopPropagation();
              setTarget(row.original);
            }}
          >
            <Undo2 className="size-3.5" /> Devolver
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Devolver"
        description="Marcá encomiendas en camino o en depósito como devueltas al remitente."
      />

      <DataTable
        columns={columns}
        data={candidatas}
        searchPlaceholder="Buscar por remito o destinatario..."
        globalFilterFn={encomiendaMatches}
        emptyTitle="No hay encomiendas para devolver"
        emptyDescription="Las encomiendas en tránsito o listas para entregar pueden marcarse como devueltas desde acá."
        pageSize={12}
      />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
        title={`¿Devolver la encomienda #${target?.remito}?`}
        description="Esta acción marca la encomienda como devuelta al remitente y sale del circuito de reparto."
        confirmLabel="Sí, devolver"
        onConfirm={confirmarDevolucion}
      />
    </div>
  );
}
