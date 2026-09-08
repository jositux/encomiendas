"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Pencil, Trash2, Landmark, Phone } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog";
import { removeClienteAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import type { Cliente } from "@/types";

export function ClientesView({ clientes }: { clientes: Cliente[] }) {
  const [toDelete, setToDelete] = React.useState<Cliente | null>(null);
  const [soloCtaCte, setSoloCtaCte] = React.useState(false);

  const data = soloCtaCte ? clientes.filter((c) => c.ctaCte) : clientes;

  async function confirmDelete() {
    if (!toDelete) return;
    await removeClienteAction(toDelete.id);
    toast.success("Cliente eliminado");
    setToDelete(null);
  }

  const columns = React.useMemo<ColumnDef<Cliente>[]>(
    () => [
      { accessorKey: "dniCuit", header: "DNI / CUIT" },
      {
        accessorKey: "nombre",
        header: "Apellido y nombres",
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      {
        id: "telefono",
        header: "Teléfono",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5 text-muted-foreground" />
            {row.original.telefono}
          </span>
        ),
      },
      { accessorKey: "domicilio", header: "Domicilio" },
      {
        id: "localidad",
        header: "Localidad",
        cell: ({ row }) => localidadNombre(row.original.localidadId),
      },
      {
        id: "ctaCte",
        header: "Cta. Cte.",
        cell: ({ row }) =>
          row.original.ctaCte ? (
            <Badge variant="info" className="gap-1">
              <Landmark className="size-3" /> {row.original.codCtaCte}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ClienteFormDialog
              cliente={row.original}
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
        title="Clientes"
        description="Base de clientes, contactos frecuentes y cuentas corrientes."
        actions={<ClienteFormDialog />}
      />

      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buscar por nombre, DNI, teléfono o domicilio..."
        emptyTitle="No hay clientes"
        emptyDescription="Todavía no cargaste ningún cliente."
        toolbar={
          <Button
            variant={soloCtaCte ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setSoloCtaCte((v) => !v)}
          >
            <Landmark className="size-3.5" /> Solo cuenta corriente
          </Button>
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`¿Eliminar a ${toDelete?.nombre}?`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
