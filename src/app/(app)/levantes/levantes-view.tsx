"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Truck, MapPin } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { updateEncomiendaAction } from "@/server/actions";
import { GRUPOS_RUTA } from "@/lib/mock/rutas";
import { localidadNombre } from "@/lib/mock/localidades";
import { encomiendaMatches } from "@/components/encomiendas/encomienda-table";
import { formatDate } from "@/lib/format";
import type { Encomienda } from "@/types";

export function LevantesView({ pendientes }: { pendientes: Encomienda[] }) {
  const [rutaId, setRutaId] = React.useState<string>("all");

  const filtradas =
    rutaId === "all" ? pendientes : pendientes.filter((e) => e.rutaId === rutaId);

  async function levantar(e: Encomienda) {
    await updateEncomiendaAction(e.id, {
      estado: "EN_TRANSITO",
      rutaId: e.rutaId ?? rutaId !== "all" ? rutaId : e.rutaId,
    });
    toast.success(`Encomienda #${e.remito} levantada`);
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
        id: "origen",
        header: "Retirar en",
        cell: ({ row }) => (
          <div>
            <p className="max-w-44 truncate font-medium">{row.original.origen.nombre}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {row.original.origen.direccion},{" "}
              {localidadNombre(row.original.origen.localidadId)}
            </p>
          </div>
        ),
      },
      {
        id: "destino",
        header: "Destino",
        cell: ({ row }) => (
          <div>
            <p className="max-w-40 truncate">{row.original.destino.nombre}</p>
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
            className="gap-1.5"
            onClick={(ev) => {
              ev.stopPropagation();
              levantar(row.original);
            }}
          >
            <Truck className="size-3.5" /> Levantar
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rutaId]
  );

  return (
    <div>
      <PageHeader
        title="Levantes"
        description="Encomiendas pendientes de retiro, organizadas por ruta de reparto."
      />

      <div className="mb-4 max-w-xs">
        <Select value={rutaId} onValueChange={setRutaId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas las rutas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las rutas ({pendientes.length})</SelectItem>
            {GRUPOS_RUTA.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtradas}
        searchPlaceholder="Buscar por remito, cliente o destino..."
        globalFilterFn={encomiendaMatches}
        emptyTitle="No hay encomiendas para levantar"
        emptyDescription="No encontramos encomiendas pendientes en esta ruta."
        pageSize={12}
      />
    </div>
  );
}
