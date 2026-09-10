"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Landmark, Phone, Building2, User, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog";
import { removeClienteAction } from "@/server/actions";
import type { ClienteApi } from "@/server/services/clientes";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";

// Sigue sin edición: el backend no tiene PATCH/PUT /clientes/{id} (ver el
// comentario completo en src/server/services/clientes.ts y en
// cliente-form-dialog.tsx). La baja sí existe como soft-delete (DELETE,
// agregada después de que se escribió el comentario original de este
// archivo) — el backend lo marca como eliminado y GET /clientes deja de
// devolverlo.
export function ClientesView({
  clientes,
  localidades,
  sectores,
}: {
  clientes: ClienteApi[];
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
}) {
  const [soloCtaCte, setSoloCtaCte] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<ClienteApi | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await removeClienteAction(toDelete.id);
      toast.success("Cliente eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el cliente.");
    } finally {
      setToDelete(null);
    }
  }

  const data = soloCtaCte ? clientes.filter((c) => c.esCuentaCorriente) : clientes;

  const localidadNombre = React.useMemo(() => {
    const map = new Map(localidades.map((l) => [l.id, l.nombre]));
    return (id?: string) => (id ? map.get(id) ?? "—" : "—");
  }, [localidades]);

  const columns = React.useMemo<ColumnDef<ClienteApi>[]>(
    () => [
      {
        id: "tipo",
        header: "",
        cell: ({ row }) =>
          row.original.tipo === "empresa" ? (
            <Building2 className="size-4 text-muted-foreground" />
          ) : (
            <User className="size-4 text-muted-foreground" />
          ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre / Razón social",
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      { accessorKey: "documento", header: "DNI / CUIT", cell: ({ row }) => row.original.documento ?? "—" },
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
      {
        id: "domicilio",
        header: "Domicilio",
        cell: ({ row }) => {
          const d = row.original.domicilios.find((x) => x.esPredeterminado) ?? row.original.domicilios[0];
          if (!d) return "—";
          return `${d.calle}${d.numero ? ` ${d.numero}` : ""}`;
        },
      },
      {
        id: "localidad",
        header: "Localidad",
        cell: ({ row }) => {
          const d = row.original.domicilios.find((x) => x.esPredeterminado) ?? row.original.domicilios[0];
          return localidadNombre(d?.localidadId);
        },
      },
      {
        id: "ctaCte",
        header: "Cta. Cte.",
        cell: ({ row }) =>
          row.original.esCuentaCorriente ? (
            <Badge variant="info" className="gap-1">
              <Landmark className="size-3" /> Sí
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
    [localidadNombre]
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Base de clientes, contactos frecuentes y cuentas corrientes."
        actions={<ClienteFormDialog localidades={localidades} sectores={sectores} />}
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
        description="El cliente deja de aparecer en el listado y en el buscador rápido de Nueva Encomienda."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
