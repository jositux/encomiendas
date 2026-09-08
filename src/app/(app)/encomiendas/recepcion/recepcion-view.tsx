"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Inbox, PackageCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TipoBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { updateEncomiendaAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import { sucursalNombre } from "@/lib/mock/sucursales";
import { encomiendaMatches } from "@/components/encomiendas/encomienda-table";
import { formatDate } from "@/lib/format";
import type { Encomienda } from "@/types";

export function RecepcionView({
  enTransito,
  sucursalId,
}: {
  enTransito: Encomienda[];
  sucursalId: string | null;
}) {
  async function recibir(e: Encomienda) {
    await updateEncomiendaAction(e.id, {
      estado: "PARA_ENTREGAR",
      sucursalId: sucursalId ?? e.sucursalId,
    });
    toast.success(`Encomienda #${e.remito} recibida en depósito`);
  }

  async function recibirTodas() {
    await Promise.all(enTransito.map(recibir));
  }

  const columns = React.useMemo<ColumnDef<Encomienda>[]>(
    () => [
      {
        accessorKey: "remito",
        header: "Remito",
        cell: ({ row }) => <span className="font-mono font-medium">#{row.original.remito}</span>,
      },
      { accessorKey: "fechaAlta", header: "Fecha alta", cell: ({ row }) => formatDate(row.original.fechaAlta) },
      {
        id: "origen",
        header: "Procedencia",
        cell: ({ row }) => (
          <div>
            <p className="max-w-40 truncate">{row.original.origen.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {sucursalNombre(row.original.sucursalId)}
            </p>
          </div>
        ),
      },
      {
        id: "destinatario",
        header: "Destinatario",
        cell: ({ row }) => (
          <div>
            <p className="max-w-40 truncate font-medium">{row.original.destino.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {localidadNombre(row.original.destino.localidadId)}
            </p>
          </div>
        ),
      },
      { accessorKey: "tipo", header: "Tipo", cell: ({ row }) => <TipoBadge tipo={row.original.tipo} /> },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="success"
            className="gap-1.5"
            onClick={(ev) => {
              ev.stopPropagation();
              recibir(row.original);
            }}
          >
            <PackageCheck className="size-3.5" /> Recibir
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <PageHeader
        title="Recepción"
        description="Confirmá el ingreso de bultos que llegaron al depósito."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={enTransito.length === 0}
            onClick={recibirTodas}
          >
            <Inbox className="size-3.5" /> Recibir todo ({enTransito.length})
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={enTransito}
        searchPlaceholder="Buscar por remito, cliente o destino..."
        globalFilterFn={encomiendaMatches}
        emptyTitle="No hay encomiendas en tránsito"
        emptyDescription="Las encomiendas levantadas van a aparecer acá hasta que confirmes su recepción."
        pageSize={12}
      />
    </div>
  );
}
