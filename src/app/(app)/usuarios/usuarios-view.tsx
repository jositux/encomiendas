"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Pencil, KeyRound, ShieldPlus, X, Truck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuarioFormDialog } from "@/components/usuarios/usuario-form-dialog";
import { CambiarClaveDialog } from "@/components/usuarios/cambiar-clave-dialog";
import { AsignarRolDialog } from "@/components/usuarios/asignar-rol-dialog";
import { RolPermisosDialog } from "@/components/usuarios/rol-permisos-dialog";
import { actualizarUsuarioAction, quitarRolAction, actualizarRolAction } from "@/server/actions";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { RolApi } from "@/server/services/roles";
import type { PuntoBackend } from "@/types";

// Pantalla real de administración de usuarios/roles — reemplaza a la vieja
// "Personal" (100% mock). Ver claude/plan-integracion-backend.md, sección
// 34, para el detalle completo de qué endpoints usa cada acción y qué
// permisos hacen falta (todavía no confirmados en vivo salvo `usuarios:leer`,
// que ya se sabía que gatea esta pantalla desde antes — ver
// esquema-permisos.md). A propósito esta vista NO oculta botones detrás de
// nombres de permiso adivinados: los muestra a cualquiera que llegue a la
// pantalla (que ya necesitó `usuarios:leer` para verla, gateada arriba por
// el item de menú) y deja que el 403 real del backend, si corresponde,
// aparezca como toast — mismo patrón que usaron `despachos:crear` o
// `entregas:revertir` ANTES de que se confirmara el nombre exacto del
// permiso y se pudiera gatear de verdad.
export function UsuariosView({
  usuarios,
  roles,
  puntos,
}: {
  usuarios: UsuarioApi[];
  roles: RolApi[];
  puntos: PuntoBackend[];
}) {
  const puntoNombre = React.useMemo(() => {
    const map = new Map(puntos.map((p) => [p.id, p.nombre]));
    return (id: string) => map.get(id) ?? "—";
  }, [puntos]);

  const rolesActivos = React.useMemo(() => roles.filter((r) => r.activo), [roles]);

  const [editFor, setEditFor] = React.useState<UsuarioApi | null>(null);
  const [claveFor, setClaveFor] = React.useState<UsuarioApi | null>(null);
  const [rolFor, setRolFor] = React.useState<UsuarioApi | null>(null);
  const [permisosFor, setPermisosFor] = React.useState<RolApi | null>(null);

  async function toggleActivo(u: UsuarioApi, activo: boolean) {
    const r = await actualizarUsuarioAction(u.id, { activo });
    if (!r.ok) {
      toast.error(r.title, { description: r.message });
      return;
    }
    toast.success(activo ? "Usuario activado" : "Usuario desactivado");
  }

  async function handleQuitarRol(u: UsuarioApi, asignacionId: string) {
    const r = await quitarRolAction(u.id, asignacionId);
    if (!r.ok) toast.error(r.title, { description: r.message });
  }

  async function toggleRolActivo(rol: RolApi, activo: boolean) {
    const r = await actualizarRolAction(rol.id, { activo });
    if (!r.ok) {
      toast.error(r.title, { description: r.message });
      return;
    }
    toast.success(activo ? "Rol activado" : "Rol desactivado");
  }

  const columnsUsuarios = React.useMemo<ColumnDef<UsuarioApi>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{row.original.nombre}</span>
            {row.original.tipoChofer && (
              <Truck className="size-3.5 text-muted-foreground" aria-label="Chofer" />
            )}
          </div>
        ),
      },
      { accessorKey: "username", header: "Usuario" },
      {
        id: "punto",
        header: "Punto",
        cell: ({ row }) => puntoNombre(row.original.puntoId),
      },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {u.roles.length === 0 && <span className="text-xs text-muted-foreground">Sin roles</span>}
              {u.roles.map((r) => (
                <Badge key={r.asignacionId} variant="secondary" className="gap-1 pr-1">
                  {r.codigo}
                  {r.scopeTipo === "punto" && (
                    <span className="text-[10px] text-muted-foreground">(punto)</span>
                  )}
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={() => handleQuitarRol(u, r.asignacionId)}
                    aria-label={`Quitar rol ${r.codigo}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setRolFor(u)}
                aria-label="Asignar rol"
              >
                <ShieldPlus className="size-3.5" />
              </Button>
            </div>
          );
        },
      },
      {
        id: "activo",
        header: "Activo",
        cell: ({ row }) => (
          <Switch
            checked={row.original.activo}
            onCheckedChange={(v) => toggleActivo(row.original, v)}
          />
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
              className="size-7"
              onClick={() => setClaveFor(row.original)}
              aria-label="Cambiar contraseña"
            >
              <KeyRound className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setEditFor(row.original)}
              aria-label="Editar"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [puntoNombre]
  );

  const columnsRoles = React.useMemo<ColumnDef<RolApi>[]>(
    () => [
      { accessorKey: "codigo", header: "Código" },
      { accessorKey: "nombre", header: "Nombre" },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.descripcion || "—"}</span>
        ),
      },
      { accessorKey: "usuarios", header: "Usuarios" },
      { accessorKey: "permisos", header: "Permisos" },
      {
        id: "activo",
        header: "Activo",
        cell: ({ row }) => (
          <Switch
            checked={row.original.activo}
            onCheckedChange={(v) => toggleRolActivo(row.original, v)}
          />
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setPermisosFor(row.original)}>
              Ver permisos
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
        title="Usuarios y roles"
        description="Administración real de accesos — reemplaza a la vieja pantalla de Personal, que era de prueba."
        actions={<UsuarioFormDialog puntos={puntos} />}
      />

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <DataTable
            columns={columnsUsuarios}
            data={usuarios}
            searchPlaceholder="Buscar por nombre o usuario..."
            emptyTitle="No hay usuarios"
            emptyDescription="Todavía no se creó ningún usuario."
          />
        </TabsContent>

        <TabsContent value="roles">
          <DataTable
            columns={columnsRoles}
            data={roles}
            searchPlaceholder="Buscar por código o nombre..."
            emptyTitle="No hay roles"
            emptyDescription="No se pudo leer la lista de roles (puede ser un tema de permisos)."
          />
        </TabsContent>
      </Tabs>

      {editFor && (
        <UsuarioFormDialog
          puntos={puntos}
          usuario={editFor}
          open={!!editFor}
          onOpenChange={(v) => !v && setEditFor(null)}
        />
      )}

      {claveFor && (
        <CambiarClaveDialog
          usuarioId={claveFor.id}
          usuarioNombre={claveFor.nombre}
          open={!!claveFor}
          onOpenChange={(v) => !v && setClaveFor(null)}
        />
      )}

      {rolFor && (
        <AsignarRolDialog
          usuarioId={rolFor.id}
          usuarioNombre={rolFor.nombre}
          usuarioPuntoId={rolFor.puntoId}
          usuarioPuntoNombre={puntoNombre(rolFor.puntoId)}
          rolesDisponibles={rolesActivos}
          open={!!rolFor}
          onOpenChange={(v) => !v && setRolFor(null)}
        />
      )}

      <RolPermisosDialog
        rol={permisosFor}
        open={!!permisosFor}
        onOpenChange={(v) => !v && setPermisosFor(null)}
      />
    </div>
  );
}
