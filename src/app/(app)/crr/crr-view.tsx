"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ShieldCheck, Wallet, CircleDollarSign, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateMovimientoCrrAction } from "@/server/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MovimientoCrr } from "@/types";

const ESTADO_VARIANT = {
  PENDIENTE: "warning",
  COBRADO: "info",
  RENDIDO: "success",
} as const;

const ESTADO_LABEL = {
  PENDIENTE: "Pendiente",
  COBRADO: "Cobrado",
  RENDIDO: "Rendido",
} as const;

export function CrrView({ movimientosCrr }: { movimientosCrr: MovimientoCrr[] }) {
  const pendiente = movimientosCrr.filter((m) => m.estado === "PENDIENTE");
  const cobrado = movimientosCrr.filter((m) => m.estado === "COBRADO");
  const rendido = movimientosCrr.filter((m) => m.estado === "RENDIDO");

  async function avanzar(m: MovimientoCrr) {
    const next = m.estado === "PENDIENTE" ? "COBRADO" : "RENDIDO";
    await updateMovimientoCrrAction(m.id, { estado: next });
    toast.success(`Movimiento #${m.remito} marcado como ${ESTADO_LABEL[next]}`);
  }

  const columns = React.useMemo<ColumnDef<MovimientoCrr>[]>(
    () => [
      {
        accessorKey: "remito",
        header: "Remito",
        cell: ({ row }) => <span className="font-mono font-medium">#{row.original.remito}</span>,
      },
      { accessorKey: "cliente", header: "Cliente" },
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.fecha),
      },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{formatCurrency(row.original.monto)}</span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={ESTADO_VARIANT[row.original.estado]}>
            {ESTADO_LABEL[row.original.estado]}
          </Badge>
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) =>
          row.original.estado !== "RENDIDO" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                avanzar(row.original);
              }}
            >
              <CheckCheck className="size-3.5" />
              {row.original.estado === "PENDIENTE" ? "Marcar cobrado" : "Marcar rendido"}
            </Button>
          ) : null,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="CRR — Contra reembolso"
        description="Seguimiento de cobros contra reembolso pendientes, cobrados y rendidos."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Pendiente de cobro"
          value={formatCurrency(pendiente.reduce((a, m) => a + m.monto, 0))}
          icon={ShieldCheck}
          tone="warning"
          hint={`${pendiente.length} movimientos`}
        />
        <StatCard
          label="Cobrado, sin rendir"
          value={formatCurrency(cobrado.reduce((a, m) => a + m.monto, 0))}
          icon={CircleDollarSign}
          tone="info"
          hint={`${cobrado.length} movimientos`}
        />
        <StatCard
          label="Rendido"
          value={formatCurrency(rendido.reduce((a, m) => a + m.monto, 0))}
          icon={Wallet}
          tone="success"
          hint={`${rendido.length} movimientos`}
        />
      </div>

      <DataTable
        columns={columns}
        data={movimientosCrr}
        searchPlaceholder="Buscar por remito o cliente..."
        globalFilterFn={(row, q) =>
          row.remito.toLowerCase().includes(q.toLowerCase()) ||
          row.cliente.toLowerCase().includes(q.toLowerCase())
        }
        emptyTitle="No hay movimientos de CRR"
        pageSize={15}
      />
    </div>
  );
}
