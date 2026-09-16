"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Pencil, Trash2, Bike, Truck, Car, Package } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VehiculoFormDialog } from "@/components/vehiculos/vehiculo-form-dialog";
import { updateVehiculoAction, removeVehiculoAction } from "@/server/actions";
import type { VehiculoBackend } from "@/types";

const TIPO_ICON: Record<string, typeof Bike> = {
  MOTO: Bike,
  CAMIONETA: Car,
  CAMION: Truck,
};

export function VehiculosView({ vehiculos }: { vehiculos: VehiculoBackend[] }) {
  const [toDelete, setToDelete] = React.useState<VehiculoBackend | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      const resultado = await removeVehiculoAction(toDelete.id);
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success("Vehículo dado de baja");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja el vehículo.");
    } finally {
      setToDelete(null);
    }
  }

  async function toggleActivo(id: string, activo: boolean) {
    const resultado = await updateVehiculoAction(id, { activo });
    if (!resultado.ok) toast.error(resultado.title, { description: resultado.message });
  }

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
            onCheckedChange={(v) => toggleActivo(row.original.id, v)}
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

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`¿Dar de baja a ${toDelete?.nombre}?`}
        description="El vehículo se marca como inactivo y deja de estar disponible para nuevos despachos. No se borra su historial."
        confirmLabel="Dar de baja"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
