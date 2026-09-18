"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asignarRolAction } from "@/server/actions";
import type { RolApi } from "@/server/services/roles";

// Asignar un rol a un usuario (POST /usuarios/{id}/roles). El scope real
// del backend admite "global" o "punto" con un `scopeId` cualquiera (no
// necesariamente el punto del propio usuario) — acá se simplifica a dos
// casos comunes: global, o acotado al punto actual del usuario. Si más
// adelante hace falta asignar un rol acotado a OTRO punto, este diálogo
// necesita un tercer combo de punto — no implementado todavía, a propósito,
// hasta que haga falta de verdad.
export function AsignarRolDialog({
  usuarioId,
  usuarioNombre,
  usuarioPuntoId,
  usuarioPuntoNombre,
  rolesDisponibles,
  open,
  onOpenChange,
}: {
  usuarioId: string;
  usuarioNombre: string;
  usuarioPuntoId: string;
  usuarioPuntoNombre: string;
  rolesDisponibles: RolApi[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Sin useEffect a propósito: el padre (usuarios-view.tsx) monta este
  // diálogo condicionalmente (`{rolFor && <AsignarRolDialog ... />}`), así
  // que cada apertura es un mount nuevo — el useState ya arranca fresco
  // cada vez, sin necesitar resetear nada en un efecto.
  const [rolCodigo, setRolCodigo] = React.useState(rolesDisponibles[0]?.codigo ?? "");
  const [scope, setScope] = React.useState<"global" | "punto">("global");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rolCodigo) return;
    setSubmitting(true);
    try {
      const resultado = await asignarRolAction(usuarioId, {
        rolCodigo,
        ...(scope === "punto" ? { scopeTipo: "punto" as const, scopeId: usuarioPuntoId } : {}),
      });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(`Rol ${rolCodigo} asignado a ${usuarioNombre}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar el rol.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar rol</DialogTitle>
          <DialogDescription>A {usuarioNombre}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Rol</Label>
            <Select value={rolCodigo} onValueChange={setRolCodigo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un rol" />
              </SelectTrigger>
              <SelectContent>
                {rolesDisponibles.map((r) => (
                  <SelectItem key={r.codigo} value={r.codigo}>
                    {r.nombre} ({r.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Alcance</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "global" | "punto")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (todos los puntos)</SelectItem>
                <SelectItem value="punto">Solo {usuarioPuntoNombre}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !rolCodigo} className="gap-1.5">
              <ShieldPlus className="size-4" /> Asignar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
