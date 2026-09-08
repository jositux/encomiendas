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
import type { Vehiculo, TipoVehiculo, EstadoVehiculo, Personal } from "@/types";

type Draft = Omit<Vehiculo, "id">;

function emptyDraft(): Draft {
  return {
    patente: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    tipo: "MOTO",
    estado: "ACTIVO",
    choferId: undefined,
  };
}

export function VehiculoFormDialog({
  vehiculo,
  personal,
  trigger,
}: {
  vehiculo?: Vehiculo;
  personal: Personal[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(vehiculo ?? emptyDraft());
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) setDraft(vehiculo ?? emptyDraft());
    setOpenState(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.patente.trim() || !draft.marca.trim()) {
      toast.error("Completá al menos la patente y la marca.");
      return;
    }
    setSubmitting(true);
    try {
      if (vehiculo) {
        await updateVehiculoAction(vehiculo.id, draft);
        toast.success("Vehículo actualizado");
      } else {
        await createVehiculoAction(draft);
        toast.success("Vehículo agregado");
      }
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
          <DialogDescription>Datos de la unidad y chofer asignado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Patente</Label>
              <Input
                value={draft.patente}
                onChange={(e) => setDraft({ ...draft, patente: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Año</Label>
              <Input
                type="number"
                value={draft.anio}
                onChange={(e) => setDraft({ ...draft, anio: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Marca</Label>
              <Input value={draft.marca} onChange={(e) => setDraft({ ...draft, marca: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Modelo</Label>
              <Input value={draft.modelo} onChange={(e) => setDraft({ ...draft, modelo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v as TipoVehiculo })}>
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
              <Label>Estado</Label>
              <Select value={draft.estado} onValueChange={(v) => setDraft({ ...draft, estado: v as EstadoVehiculo })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                  <SelectItem value="TALLER">En taller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Chofer asignado</Label>
            <Select
              value={draft.choferId ?? "none"}
              onValueChange={(v) => setDraft({ ...draft, choferId: v === "none" ? undefined : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {personal.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.apellidoNombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
