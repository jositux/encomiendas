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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ProvinciaLocalidadSelect } from "@/components/shared/provincia-localidad-select";
import { createClienteAction, updateClienteAction } from "@/server/actions";
import type { Cliente, Provincia } from "@/types";

type Draft = Omit<Cliente, "id" | "createdAt">;

function emptyDraft(): Draft {
  return {
    dniCuit: "",
    nombre: "",
    telefono: "",
    esCelular: true,
    domicilio: "",
    localidadId: "mis-obera",
    provincia: "MISIONES",
    fechaNacimiento: undefined,
    ctaCte: false,
    codCtaCte: undefined,
  };
}

export function ClienteFormDialog({
  cliente,
  trigger,
}: {
  cliente?: Cliente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(cliente ?? emptyDraft());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Reset the draft the moment the dialog is asked to open, rather than in a
  // useEffect keyed on `open` — that would fire an extra render every time.
  function setOpen(next: boolean) {
    if (next) setDraft(cliente ?? emptyDraft());
    setOpenState(next);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.nombre.trim()) next.nombre = "Ingresá el nombre.";
    if (!draft.dniCuit.trim()) next.dniCuit = "Ingresá el DNI o CUIT.";
    if (!draft.domicilio.trim()) next.domicilio = "Ingresá el domicilio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (cliente) {
        await updateClienteAction(cliente.id, draft);
        toast.success("Cliente actualizado");
      } else {
        await createClienteAction(draft);
        toast.success("Cliente creado");
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
            <UserPlus2 className="size-4" /> Nuevo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Datos de contacto y ubicación para asociar a sus encomiendas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nombre">Apellido y nombres</Label>
              <Input
                id="nombre"
                value={draft.nombre}
                onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                aria-invalid={!!errors.nombre}
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dni">DNI / CUIT</Label>
              <Input
                id="dni"
                value={draft.dniCuit}
                onChange={(e) => setDraft({ ...draft, dniCuit: e.target.value })}
                aria-invalid={!!errors.dniCuit}
              />
              {errors.dniCuit && <p className="text-xs text-destructive">{errors.dniCuit}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={draft.telefono}
                onChange={(e) => setDraft({ ...draft, telefono: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nacimiento">Fecha de nacimiento</Label>
              <Input
                id="nacimiento"
                type="date"
                value={draft.fechaNacimiento ?? ""}
                onChange={(e) => setDraft({ ...draft, fechaNacimiento: e.target.value || undefined })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="domicilio">Domicilio</Label>
            <Input
              id="domicilio"
              value={draft.domicilio}
              onChange={(e) => setDraft({ ...draft, domicilio: e.target.value })}
              aria-invalid={!!errors.domicilio}
            />
            {errors.domicilio && <p className="text-xs text-destructive">{errors.domicilio}</p>}
          </div>

          <ProvinciaLocalidadSelect
            idPrefix="cliente"
            provincia={draft.provincia}
            localidadId={draft.localidadId}
            onChangeProvincia={(p: Provincia) => setDraft({ ...draft, provincia: p })}
            onChangeLocalidad={(id) => setDraft({ ...draft, localidadId: id })}
          />

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.esCelular}
                onCheckedChange={(v) => setDraft({ ...draft, esCelular: v === true })}
              />
              Teléfono celular
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.ctaCte}
                onCheckedChange={(v) =>
                  setDraft({
                    ...draft,
                    ctaCte: v === true,
                    codCtaCte: v === true ? draft.codCtaCte ?? `CC-${Date.now().toString().slice(-4)}` : undefined,
                  })
                }
              />
              Cuenta corriente
            </label>
            {draft.ctaCte && (
              <Input
                className="h-8 w-32"
                placeholder="Código cta cte"
                value={draft.codCtaCte ?? ""}
                onChange={(e) => setDraft({ ...draft, codCtaCte: e.target.value })}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {cliente ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
