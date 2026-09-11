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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocalidadSectorSelect } from "@/components/shared/localidad-sector-select";
import { createClienteAction } from "@/server/actions";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";

// El backend real no tiene un solo domicilio-string por cliente: tiene un
// domicilio propio (localidadId + sectorId, mismo modelo de ruteo que
// Recorridos/Nueva Encomienda) y separa tipo persona/empresa, documento y
// cuenta corriente como campos propios del cliente. Un cliente tiene
// exactamente UN domicilio (confirmado en vivo 2026-09-11 — antes el
// backend devolvía `domicilios: DomicilioApi[]`, ahora son campos planos
// del propio cliente; ver el comentario completo en
// src/server/services/clientes.ts).
//
// Solo alta: confirmado en vivo (2026-09-10) que el backend real no tiene
// PATCH/PUT/DELETE /clientes/{id} — los tres devuelven el error de ruteo de
// Nest "Cannot <VERBO> /clientes/{id}", no un error de validación (ver el
// comentario completo en src/server/services/clientes.ts). Por eso este
// diálogo no tiene modo edición: solo crea clientes nuevos, hasta que el
// backend agregue esos endpoints.
type Draft = {
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento: string;
  email: string;
  esCuentaCorriente: boolean;
  calle: string;
  numero: string;
  piso: string;
  referencia: string;
  localidadId: string;
  sectorId: string;
};

function emptyDraft(localidades: LocalidadBackend[], sectores: SectorApi[]): Draft {
  const primeraLocalidad = localidades.find((l) => sectores.some((s) => s.localidadId === l.id))?.id
    ?? localidades[0]?.id
    ?? "";
  const primerSector = sectores.find((s) => s.localidadId === primeraLocalidad)?.id ?? "";
  return {
    tipo: "persona",
    nombre: "",
    telefono: "",
    documento: "",
    email: "",
    esCuentaCorriente: false,
    calle: "",
    numero: "",
    piso: "",
    referencia: "",
    localidadId: primeraLocalidad,
    sectorId: primerSector,
  };
}

export function ClienteFormDialog({
  localidades,
  sectores,
  trigger,
}: {
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft(localidades, sectores));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) {
      setDraft(emptyDraft(localidades, sectores));
      setErrors({});
    }
    setOpenState(next);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.nombre.trim()) next.nombre = "Ingresá el nombre.";
    if (!draft.telefono.trim()) next.telefono = "Ingresá el teléfono.";
    if (!draft.calle.trim()) next.calle = "Ingresá la calle.";
    if (!draft.localidadId) next.localidadId = "Elegí una localidad.";
    if (!draft.sectorId) next.sectorId = "Elegí un sector.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createClienteAction({
        tipo: draft.tipo,
        nombre: draft.nombre.trim(),
        telefono: draft.telefono.trim(),
        documento: draft.documento.trim() || undefined,
        email: draft.email.trim() || undefined,
        esCuentaCorriente: draft.esCuentaCorriente,
        localidadId: draft.localidadId,
        sectorId: draft.sectorId,
        calle: draft.calle.trim(),
        numero: draft.numero.trim() || undefined,
        piso: draft.piso.trim() || undefined,
        referencia: draft.referencia.trim() || undefined,
      });
      toast.success("Cliente creado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
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
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Datos de contacto para asociar a sus encomiendas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nombre">{draft.tipo === "empresa" ? "Razón social" : "Apellido y nombres"}</Label>
              <Input
                id="nombre"
                value={draft.nombre}
                onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                aria-invalid={!!errors.nombre}
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={draft.tipo}
                onValueChange={(v: "persona" | "empresa") => setDraft({ ...draft, tipo: v })}
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persona">Persona</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={draft.telefono}
                onChange={(e) => setDraft({ ...draft, telefono: e.target.value })}
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="documento">DNI / CUIT (opcional)</Label>
              <Input
                id="documento"
                value={draft.documento}
                onChange={(e) => setDraft({ ...draft, documento: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="calle">Calle</Label>
            <Input
              id="calle"
              value={draft.calle}
              onChange={(e) => setDraft({ ...draft, calle: e.target.value })}
              aria-invalid={!!errors.calle}
            />
            {errors.calle && <p className="text-xs text-destructive">{errors.calle}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={draft.numero}
                onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="piso">Piso/Depto</Label>
              <Input
                id="piso"
                value={draft.piso}
                onChange={(e) => setDraft({ ...draft, piso: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              value={draft.referencia}
              onChange={(e) => setDraft({ ...draft, referencia: e.target.value })}
            />
          </div>
          <LocalidadSectorSelect
            idPrefix="cliente"
            localidades={localidades}
            sectores={sectores}
            localidadId={draft.localidadId}
            sectorId={draft.sectorId}
            onChangeLocalidad={(id) => {
              const primerSector = sectores.find((s) => s.localidadId === id)?.id ?? "";
              setDraft({ ...draft, localidadId: id, sectorId: primerSector });
            }}
            onChangeSector={(id) => setDraft({ ...draft, sectorId: id })}
          />
          {(errors.localidadId || errors.sectorId) && (
            <p className="text-xs text-destructive">Elegí localidad y sector.</p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.esCuentaCorriente}
              onCheckedChange={(v) => setDraft({ ...draft, esCuentaCorriente: v === true })}
            />
            Cuenta corriente
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
