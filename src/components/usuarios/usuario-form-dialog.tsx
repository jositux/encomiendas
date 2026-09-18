"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUsuarioAction, actualizarUsuarioAction } from "@/server/actions";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { PuntoBackend } from "@/types";

// Alta y edición de un usuario real (sección 34 del plan de integración).
//
// `username` y `password` solo se piden en el ALTA: `ActualizarUsuarioDto`
// (confirmado contra el OpenAPI real) no tiene ni `username` ni `password`
// — no hay forma de cambiar el nombre de usuario después de creado, y el
// reseteo de contraseña es una acción aparte (PUT /usuarios/{id}/clave,
// ver CambiarClaveDialog), no parte de este formulario.
type Draft = {
  nombre: string;
  username: string;
  password: string;
  puntoId: string;
  tipoChofer: "" | "propio" | "gestor";
  activo: boolean;
};

function emptyDraft(puntos: PuntoBackend[]): Draft {
  return {
    nombre: "",
    username: "",
    password: "",
    puntoId: puntos[0]?.id ?? "",
    tipoChofer: "",
    activo: true,
  };
}

function draftFromUsuario(usuario: UsuarioApi): Draft {
  return {
    nombre: usuario.nombre,
    username: usuario.username,
    password: "",
    puntoId: usuario.puntoId,
    tipoChofer: usuario.tipoChofer ?? "",
    activo: usuario.activo,
  };
}

export function UsuarioFormDialog({
  puntos,
  trigger,
  usuario,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  puntos: PuntoBackend[];
  trigger?: React.ReactNode;
  // Con `usuario`, el diálogo edita ese usuario en vez de crear uno nuevo.
  usuario?: UsuarioApi;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const esEdicion = !!usuario;
  const [openUncontrolled, setOpenUncontrolled] = React.useState(false);
  const open = openControlled ?? openUncontrolled;
  const [draft, setDraft] = React.useState<Draft>(
    usuario ? draftFromUsuario(usuario) : emptyDraft(puntos)
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) {
      setDraft(usuario ? draftFromUsuario(usuario) : emptyDraft(puntos));
      setErrors({});
    }
    onOpenChangeControlled?.(next);
    setOpenUncontrolled(next);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.nombre.trim()) next.nombre = "Ingresá el nombre.";
    if (!esEdicion) {
      if (!draft.username.trim()) next.username = "Ingresá el usuario.";
      if (draft.password.length < 8) next.password = "Mínimo 8 caracteres.";
    }
    if (!draft.puntoId) next.puntoId = "Elegí un punto.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const tipoChofer = draft.tipoChofer === "" ? null : draft.tipoChofer;
      const resultado =
        esEdicion && usuario
          ? await actualizarUsuarioAction(usuario.id, {
              nombre: draft.nombre.trim(),
              puntoId: draft.puntoId,
              tipoChofer,
              activo: draft.activo,
            })
          : await createUsuarioAction({
              nombre: draft.nombre.trim(),
              username: draft.username.trim(),
              password: draft.password,
              puntoId: draft.puntoId,
              tipoChofer,
            });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(esEdicion ? "Usuario actualizado" : "Usuario creado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {openControlled === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="gap-1.5">
              <UserPlus2 className="size-4" /> Nuevo usuario
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "El usuario (login) no se puede cambiar una vez creado."
              : "Crea el acceso real contra el backend. Podés asignarle roles después de creado."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="usuario-nombre">Nombre</Label>
            <Input
              id="usuario-nombre"
              value={draft.nombre}
              onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
              autoFocus
            />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
          </div>

          {!esEdicion && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="usuario-username">Usuario (login)</Label>
                <Input
                  id="usuario-username"
                  value={draft.username}
                  onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  autoComplete="off"
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="usuario-password">Contraseña inicial</Label>
                <Input
                  id="usuario-password"
                  type="password"
                  value={draft.password}
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label>Punto</Label>
            <Select
              value={draft.puntoId}
              onValueChange={(v) => setDraft((d) => ({ ...d, puntoId: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un punto" />
              </SelectTrigger>
              <SelectContent>
                {puntos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} · {p.localidadNombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.puntoId && <p className="text-xs text-destructive">{errors.puntoId}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo de chofer</Label>
            <Select
              value={draft.tipoChofer || "ninguno"}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  tipoChofer: v === "ninguno" ? "" : (v as "propio" | "gestor"),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">No es chofer</SelectItem>
                <SelectItem value="propio">Propio</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.activo}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, activo: v === true }))}
              />
              Usuario activo
            </label>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {esEdicion ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
