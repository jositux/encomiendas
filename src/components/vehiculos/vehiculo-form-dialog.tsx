"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVehiculoAction, updateVehiculoAction } from "@/server/actions";
import type { VehiculoBackend } from "@/types";

type Draft = { nombre: string; tipo: string; patente: string };

function emptyDraft(): Draft {
  return { nombre: "", tipo: "MOTO", patente: "" };
}

function toDraft(v: VehiculoBackend): Draft {
  return { nombre: v.nombre, tipo: v.tipo, patente: v.patente ?? "" };
}

export function VehiculoFormDialog({
  vehiculo,
  trigger,
}: {
  vehiculo?: VehiculoBackend;
  trigger?: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(vehiculo ? toDraft(vehiculo) : emptyDraft());
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) setDraft(vehiculo ? toDraft(vehiculo) : emptyDraft());
    setOpenState(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.nombre.trim()) {
      toast.error("Completá el nombre.");
      return;
    }
    setSubmitting(true);
    try {
      const patente = draft.patente.trim() || null;
      const resultado = vehiculo
        ? await updateVehiculoAction(vehiculo.id, { nombre: draft.nombre, tipo: draft.tipo, patente })
        : await createVehiculoAction({ nombre: draft.nombre, tipo: draft.tipo, patente });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(vehiculo ? "Vehículo actualizado" : "Vehículo agregado");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-1.5">
            <Plus className="size-4" /> Nuevo vehículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehiculo ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle>
          <DialogDescription>Identidad de la unidad para despacho.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input
              value={draft.nombre}
              onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOTO">Moto</SelectItem>
                  <SelectItem value="CAMIONETA">Camioneta</SelectItem>
                  <SelectItem value="CAMION">Camión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Patente</Label>
              <Input
                value={draft.patente}
                onChange={(e) => setDraft({ ...draft, patente: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {vehiculo ? "Guardar cambios" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
