"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge";
import { EncomiendaDetailSheet } from "./encomienda-detail-sheet";
import { localidadNombre } from "@/lib/mock/localidades";
import { personalNombre } from "@/lib/mock/personal";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Encomienda } from "@/types";

export function encomiendaMatches(e: Encomienda, query: string) {
  const q = query.toLowerCase();
  return (
    e.remito.toLowerCase().includes(q) ||
    e.origen.nombre.toLowerCase().includes(q) ||
    e.destino.nombre.toLowerCase().includes(q) ||
    e.origen.telefono.includes(q) ||
    e.destino.telefono.includes(q) ||
    localidadNombre(e.destino.localidadId).toLowerCase().includes(q) ||
    localidadNombre(e.origen.localidadId).toLowerCase().includes(q)
  );
}

export function EncomiendaTable({
  data,
  emptyTitle,
  emptyDescription,
  toolbar,
}: {
  data: Encomienda[];
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
}) {
  const [selected, setSelected] = React.useState<Encomienda | null>(null);
  const [open, setOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<Encomienda>[]>(
    () => [
      {
        accessorKey: "remito",
        header: "Remito",
        cell: ({ row }) => (
          <span className="font-mono font-medium">#{row.original.remito}</span>
        ),
      },
      {
        accessorKey: "fechaAlta",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.fechaAlta),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="max-w-40 truncate">{row.original.origen.nombre}</div>
        ),
      },
      {
        id: "destinatario",
        header: "Destinatario",
        cell: ({ row }) => (
          <div>
            <p className="max-w-40 truncate font-medium">
              {row.original.destino.nombre}
            </p>
            <p className="text-xs text-muted-foreground">
              {localidadNombre(row.original.destino.localidadId)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => <TipoBadge tipo={row.original.tipo} />,
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
      },
      {
        id: "designado",
        header: "Designado",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {personalNombre(row.original.designadoId)}
          </span>
        ),
      },
      {
        accessorKey: "flete",
        header: "Flete",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCurrency(row.original.flete)}</span>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buscar por remito, cliente, destino o teléfono..."
        globalFilterFn={encomiendaMatches}
        emptyTitle={emptyTitle ?? "No hay encomiendas"}
        emptyDescription={emptyDescription ?? "No encontramos encomiendas para este filtro."}
        toolbar={toolbar}
        pageSize={12}
        onRowClick={(e) => {
          setSelected(e);
          setOpen(true);
        }}
      />
      <EncomiendaDetailSheet encomienda={selected} open={open} onOpenChange={setOpen} />
    </>
  );
}

export { PackageSearch };
