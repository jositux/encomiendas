"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { personalNombre } from "@/lib/mock/personal";
import { computeResumen } from "@/lib/cajas";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CierreCaja } from "@/types";

type Enriched = { cierre: CierreCaja; resumen: ReturnType<typeof computeResumen> };

export function ControlCajasTable({ enriched }: { enriched: Enriched[] }) {
  const columns = React.useMemo<ColumnDef<Enriched>[]>(
    () => [
      {
        id: "personal",
        header: "Repartidor",
        cell: ({ row }) => (
          <span className="font-medium">{personalNombre(row.original.cierre.personalId)}</span>
        ),
      },
      {
        id: "fecha",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.cierre.fecha),
      },
      {
        id: "totalRendir",
        header: "Total a rendir",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCurrency(row.original.resumen.totalARendir)}</span>
        ),
      },
      {
        id: "efectivo",
        header: "Efectivo rendido",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCurrency(row.original.resumen.efectivoRendido)}</span>
        ),
      },
      {
        id: "diferencia",
        header: "Diferencia",
        cell: ({ row }) => {
          const d = row.original.resumen.diferencia;
          return (
            <Badge variant={d === 0 ? "success" : d > 0 ? "info" : "destructive"}>
              {formatCurrency(d)}
            </Badge>
          );
        },
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const estado = row.original.cierre.estado;
          return (
            <Badge variant={estado === "CONCILIADA" ? "success" : estado === "CERRADA" ? "outline" : "warning"}>
              {estado === "ABIERTA" ? "Abierta" : estado === "CERRADA" ? "Cerrada" : "Conciliada"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={enriched}
      searchPlaceholder="Buscar por repartidor..."
      globalFilterFn={(row, q) =>
        personalNombre(row.cierre.personalId).toLowerCase().includes(q.toLowerCase())
      }
      emptyTitle="No hay cierres de caja"
      pageSize={15}
    />
  );
}
