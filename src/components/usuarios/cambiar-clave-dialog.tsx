"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarClaveAction } from "@/server/actions";

// Reseteo administrativo de contraseña (PUT /usuarios/{id}/clave) — no pide
// la clave anterior, a diferencia de un "cambiar mi propia contraseña" que
// haría el propio usuario logueado.
export function CambiarClaveDialog({
  usuarioId,
  usuarioNombre,
  open,
  onOpenChange,
}: {
  usuarioId: string;
  usuarioNombre: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Sin useEffect a propósito: el padre (usuarios-view.tsx) monta este
  // diálogo condicionalmente (`{claveFor && <CambiarClaveDialog ... />}`),
  // así que cada apertura es un mount nuevo — no hace falta resetear nada
  // en un efecto, el useState ya arranca en blanco cada vez.
  const [password, setPassword] = React.useState("");
  const [confirmar, setConfirmar] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const resultado = await cambiarClaveAction(usuarioId, password);
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(`Contraseña actualizada para ${usuarioNombre}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Nueva contraseña para {usuarioNombre}. Avisale por fuera de la app — no se le
            notifica automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="clave-nueva">Contraseña nueva</Label>
            <Input
              id="clave-nueva"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="clave-confirmar">Confirmar</Label>
            <Input
              id="clave-confirmar"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              <KeyRound className="size-4" /> Cambiar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
