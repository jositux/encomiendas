"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Pencil, Trash2, Bike, Truck, Car } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VehiculoFormDialog } from "@/components/vehiculos/vehiculo-form-dialog";
import { removeVehiculoAction } from "@/server/actions";
import { personalNombre } from "@/lib/mock/personal";
import type { Vehiculo, EstadoVehiculo, Personal } from "@/types";

const TIPO_ICON = { MOTO: Bike, CAMIONETA: Car, CAMION: Truck } as const;

const ESTADO_VARIANT: Record<EstadoVehiculo, "success" | "outline" | "warning"> = {
  ACTIVO: "success",
  INACTIVO: "outline",
  TALLER: "warning",
};

const ESTADO_LABEL: Record<EstadoVehiculo, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  TALLER: "En taller",
};

export function VehiculosView({
  vehiculos,
  personal,
}: {
  vehiculos: Vehiculo[];
  personal: Personal[];
}) {
  const [toDelete, setToDelete] = React.useState<Vehiculo | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    await removeVehiculoAction(toDelete.id);
    toast.success("Vehículo eliminado");
    setToDelete(null);
  }

  const columns = React.useMemo<ColumnDef<Vehiculo>[]>(
    () => [
      {
        id: "tipo",
        header: "",
        cell: ({ row }) => {
          const Icon = TIPO_ICON[row.original.tipo];
          return (
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          );
        },
      },
      { accessorKey: "patente", header: "Patente", cell: ({ row }) => <span className="font-mono font-medium">{row.original.patente}</span> },
      {
        id: "vehiculo",
        header: "Marca / Modelo",
        cell: ({ row }) => (
          <span>
            {row.original.marca} {row.original.modelo}
          </span>
        ),
      },
      { accessorKey: "anio", header: "Año" },
      {
        id: "chofer",
        header: "Chofer",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{personalNombre(row.original.choferId)}</span>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={ESTADO_VARIANT[row.original.estado]}>{ESTADO_LABEL[row.original.estado]}</Badge>
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <VehiculoFormDialog
              vehiculo={row.original}
              personal={personal}
              trigger={
                <Button variant="ghost" size="icon" className="size-7">
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => setToDelete(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [personal]
  );

  return (
    <div>
      <PageHeader
        title="Vehículos"
        description="Flota de motos, camionetas y camiones de la empresa."
        actions={<VehiculoFormDialog personal={personal} />}
      />

      <DataTable
        columns={columns}
        data={vehiculos}
        searchPlaceholder="Buscar por patente, marca o modelo..."
        emptyTitle="No hay vehículos cargados"
        pageSize={15}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`¿Eliminar el vehículo ${toDelete?.patente}?`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
