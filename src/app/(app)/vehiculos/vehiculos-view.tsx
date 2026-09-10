"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Bike, Truck, Car, Package } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { VehiculoFormDialog } from "@/components/vehiculos/vehiculo-form-dialog";
import { updateVehiculoAction } from "@/server/actions";
import type { VehiculoBackend } from "@/types";

const TIPO_ICON: Record<string, typeof Bike> = {
  MOTO: Bike,
  CAMIONETA: Car,
  CAMION: Truck,
};

export function VehiculosView({ vehiculos }: { vehiculos: VehiculoBackend[] }) {
  const columns = React.useMemo<ColumnDef<VehiculoBackend>[]>(
    () => [
      {
        id: "tipo",
        header: "",
        cell: ({ row }) => {
          const Icon = TIPO_ICON[row.original.tipo] ?? Package;
          return (
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          );
        },
      },
      { accessorKey: "nombre", header: "Nombre" },
      {
        accessorKey: "patente",
        header: "Patente",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.patente ?? "—"}</span>
        ),
      },
      {
        id: "activo",
        header: "Activo",
        cell: ({ row }) => (
          <Switch
            checked={row.original.activo}
            onCheckedChange={(v) => updateVehiculoAction(row.original.id, { activo: v })}
          />
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <VehiculoFormDialog
              vehiculo={row.original}
              trigger={
                <Button variant="ghost" size="icon" className="size-7">
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Vehículos"
        description="Flota de motos, camionetas y camiones de la empresa."
        actions={<VehiculoFormDialog />}
      />

      <DataTable
        columns={columns}
        data={vehiculos}
        searchPlaceholder="Buscar por nombre o patente..."
        emptyTitle="No hay vehículos cargados"
        pageSize={15}
      />
    </div>
  );
}
