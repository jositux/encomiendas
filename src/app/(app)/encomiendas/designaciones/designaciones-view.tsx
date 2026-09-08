"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { UserCog2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TipoBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateEncomiendaAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import { encomiendaMatches } from "@/components/encomiendas/encomienda-table";
import { formatDate } from "@/lib/format";
import type { Encomienda, Personal } from "@/types";

export function DesignacionesView({
  paraEntregar,
  repartidores,
}: {
  paraEntregar: Encomienda[];
  repartidores: Personal[];
}) {
  async function asignar(e: Encomienda, personalId: string) {
    await updateEncomiendaAction(e.id, { designadoId: personalId });
    const persona = repartidores.find((p) => p.id === personalId);
    toast.success(`#${e.remito} asignada a ${persona?.apellidoNombre ?? "repartidor"}`);
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
              {row.original.destino.direccion}, {localidadNombre(row.original.destino.localidadId)}
            </p>
          </div>
        ),
      },
      { accessorKey: "tipo", header: "Tipo", cell: ({ row }) => <TipoBadge tipo={row.original.tipo} /> },
      {
        id: "designado",
        header: "Repartidor asignado",
        cell: ({ row }) => (
          <Select
            value={row.original.designadoId ?? "none"}
            onValueChange={(v) => asignar(row.original, v)}
          >
            <SelectTrigger className="w-48" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Sin designar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                Sin designar
              </SelectItem>
              {repartidores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.apellidoNombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repartidores]
  );

  return (
    <div>
      <PageHeader
        title="Designaciones"
        description="Asigná cada encomienda lista para entregar a un repartidor."
        actions={
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCog2 className="size-4" /> {paraEntregar.length} para asignar
          </span>
        }
      />

      <DataTable
        columns={columns}
        data={paraEntregar}
        searchPlaceholder="Buscar por remito o destinatario..."
        globalFilterFn={encomiendaMatches}
        emptyTitle="No hay encomiendas para designar"
        emptyDescription="Las encomiendas recibidas en depósito van a aparecer acá para asignarles un repartidor."
        pageSize={12}
      />
    </div>
  );
}
