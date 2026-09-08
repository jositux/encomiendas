"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { CajaBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PersonalFormDialog } from "@/components/personal/personal-form-dialog";
import { removePersonalAction, updatePersonalAction } from "@/server/actions";
import { sucursalNombre } from "@/lib/mock/sucursales";
import { TIPO_PERSONAL_LABEL } from "@/lib/mock/personal";
import type { Personal } from "@/types";

export function PersonalView({ personal }: { personal: Personal[] }) {
  const [toDelete, setToDelete] = React.useState<Personal | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    await removePersonalAction(toDelete.id);
    toast.success("Empleado eliminado");
    setToDelete(null);
  }

  const columns = React.useMemo<ColumnDef<Personal>[]>(
    () => [
      { accessorKey: "dni", header: "DNI" },
      {
        accessorKey: "apellidoNombre",
        header: "Apellido y nombre",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.apellidoNombre}</p>
            <p className="text-xs text-muted-foreground">{row.original.alias}</p>
          </div>
        ),
      },
      {
        id: "sucursal",
        header: "Lugar de trabajo",
        cell: ({ row }) => sucursalNombre(row.original.sucursalId),
      },
      {
        id: "tipo",
        header: "Tipo",
        cell: ({ row }) => <Badge variant="outline">{TIPO_PERSONAL_LABEL[row.original.tipoPersonal]}</Badge>,
      },
      {
        id: "caja",
        header: "Caja",
        cell: ({ row }) => <CajaBadge estado={row.original.cajaHabilitada} />,
      },
      {
        id: "permisos",
        header: "Permisos",
        cell: ({ row }) => {
          const p = row.original.permisos;
          const active = Object.values(p).filter(Boolean).length;
          return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> {active} activos
            </span>
          );
        },
      },
      {
        id: "activo",
        header: "Activo",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.original.activo}
              onCheckedChange={(v) => updatePersonalAction(row.original.id, { activo: v })}
            />
          </div>
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <PersonalFormDialog
              personal={row.original}
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
        title="Personal"
        description={`${personal.length} empleados registrados en el sistema.`}
        actions={<PersonalFormDialog />}
      />

      <DataTable
        columns={columns}
        data={personal}
        searchPlaceholder="Buscar por DNI, nombre o alias..."
        emptyTitle="No hay empleados"
        pageSize={15}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`¿Eliminar a ${toDelete?.apellidoNombre}?`}
        description="El empleado perderá acceso al sistema."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
