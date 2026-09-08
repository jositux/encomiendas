"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPersonalAction, updatePersonalAction } from "@/server/actions";
import { SUCURSALES } from "@/lib/mock/sucursales";
import { GRUPOS_RUTA } from "@/lib/mock/rutas";
import { TIPO_PERSONAL_LABEL } from "@/lib/mock/personal";
import type { Personal, PermisosPersonal, TipoPersonal } from "@/types";

type Draft = Omit<Personal, "id">;

const PERMISOS_VISIBLES: { key: keyof PermisosPersonal; label: string }[] = [
  { key: "levantes", label: "Levantes" },
  { key: "encomiendas", label: "Encomiendas" },
  { key: "designar", label: "Designar" },
  { key: "despachar", label: "Despachar" },
  { key: "modificar", label: "Modificar" },
  { key: "eliminar", label: "Eliminar" },
  { key: "cajas", label: "Cajas" },
  { key: "procesar", label: "Procesar" },
  { key: "crr", label: "CRR" },
  { key: "administrador", label: "Administrador" },
];

function emptyDraft(): Draft {
  return {
    dni: "",
    apellidoNombre: "",
    alias: "",
    cajaHabilitada: "CERRADA",
    sucursalId: SUCURSALES[0].id,
    grupoRutaId: undefined,
    tipoPersonal: "OPERADOR",
    permisos: {
      levantes: true,
      levantesModificar: false,
      encomiendas: false,
      designar: false,
      despachar: false,
      modificar: false,
      eliminar: false,
      cajas: false,
      procesar: false,
      control1: false,
      control2: false,
      control3: false,
      crr: false,
      administrador: false,
    },
    activo: true,
    telefono: "",
  };
}

export function PersonalFormDialog({
  personal,
  trigger,
}: {
  personal?: Personal;
  trigger?: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(personal ?? emptyDraft());
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) setDraft(personal ?? emptyDraft());
    setOpenState(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.apellidoNombre.trim() || !draft.dni.trim()) {
      setError("Completá el DNI y el nombre.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (personal) {
        await updatePersonalAction(personal.id, draft);
        toast.success("Empleado actualizado");
      } else {
        await createPersonalAction(draft);
        toast.success("Empleado creado");
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
            <UserPlus className="size-4" /> Nuevo personal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{personal ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>
            Datos, sucursal de trabajo y permisos operativos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={draft.dni}
                onChange={(e) => setDraft({ ...draft, dni: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                value={draft.alias}
                onChange={(e) => setDraft({ ...draft, alias: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Apellido y nombre</Label>
            <Input
              id="nombre"
              value={draft.apellidoNombre}
              onChange={(e) => setDraft({ ...draft, apellidoNombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Sucursal</Label>
              <Select
                value={draft.sucursalId}
                onValueChange={(v) => setDraft({ ...draft, sucursalId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUCURSALES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Grupo de ruta</Label>
              <Select
                value={draft.grupoRutaId ?? "none"}
                onValueChange={(v) =>
                  setDraft({ ...draft, grupoRutaId: v === "none" ? undefined : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {GRUPOS_RUTA.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo de personal</Label>
              <Select
                value={draft.tipoPersonal}
                onValueChange={(v) => setDraft({ ...draft, tipoPersonal: v as TipoPersonal })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_PERSONAL_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Caja</Label>
              <Select
                value={draft.cajaHabilitada}
                onValueChange={(v) =>
                  setDraft({ ...draft, cajaHabilitada: v as Personal["cajaHabilitada"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CERRADA">Cerrada</SelectItem>
                  <SelectItem value="INICIADA">Iniciada</SelectItem>
                  <SelectItem value="HABILITADA">Habilitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium">Permisos</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {PERMISOS_VISIBLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.permisos[key]}
                    onCheckedChange={(v) =>
                      setDraft({
                        ...draft,
                        permisos: { ...draft.permisos, [key]: v === true },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.activo}
              onCheckedChange={(v) => setDraft({ ...draft, activo: v === true })}
            />
            Empleado activo
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {personal ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
