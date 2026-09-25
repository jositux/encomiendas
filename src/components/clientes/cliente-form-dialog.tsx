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
import { createClienteAction, actualizarClienteAction } from "@/server/actions";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";
import type { ClienteApi } from "@/server/services/clientes";
import {
  nombreClienteSchema,
  telefonoClienteSchema,
  dniSchema,
  cuitSchema,
  emailOpcionalSchema,
  sanitizeTelefonoInput,
  sanitizeDocumentoInput,
  sanitizeEmailInput,
} from "@/lib/validation";

// El backend real no tiene un solo domicilio-string por cliente: tiene un
// domicilio propio (localidadId + sectorId, mismo modelo de ruteo que
// Recorridos/Nueva Encomienda) y separa tipo persona/empresa, documento y
// cuenta corriente como campos propios del cliente. Un cliente tiene
// exactamente UN domicilio (confirmado en vivo 2026-09-11 — antes el
// backend devolvía `domicilios: DomicilioApi[]`, ahora son campos planos
// del propio cliente; ver el comentario completo en
// src/server/services/clientes.ts).
//
// Alta Y edición: el backend confirmó (2026-09-15) que ya existe
// PATCH /clientes/{id} — antes (2026-09-10) los tres verbos de escritura
// que no fueran POST devolvían el error de ruteo de Nest
// "Cannot <VERBO> /clientes/{id}" (ver el comentario completo en
// src/server/services/clientes.ts). Este diálogo ahora sirve para las dos
// cosas: sin prop `cliente` crea, con `cliente` edita (mismo formulario,
// precargado con sus datos).
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

function draftFromCliente(cliente: ClienteApi, sectores: SectorApi[]): Draft {
  // Si el cliente ya tiene datos sucios de antes de estas validaciones
  // (ej. un documento con letras/de más de 11 dígitos cargado a mano en
  // pruebas), los saneamos al entrar a edición en vez de mostrarlos tal
  // cual — así el usuario ve el campo ya "enmascarado" y no hace falta que
  // borre todo a mano para poder guardar.
  const sectorValido = sectores.some(
    (s) => s.id === cliente.sectorId && s.localidadId === cliente.localidadId
  );
  const sectorId = sectorValido
    ? cliente.sectorId
    : sectores.find((s) => s.localidadId === cliente.localidadId)?.id ?? "";

  return {
    tipo: cliente.tipo,
    nombre: cliente.nombre,
    telefono: sanitizeTelefonoInput(cliente.telefono),
    documento: sanitizeDocumentoInput(cliente.documento ?? "", cliente.tipo),
    email: cliente.email ?? "",
    esCuentaCorriente: cliente.esCuentaCorriente,
    calle: cliente.calle,
    // NOTA-2026-09-23-05: numero es texto libre en el contrato ("1450
    // bis", "S/N"), no un entero -- sanitizeIntegerInput le sacaba las
    // letras y corrompia estos valores al entrar a edicion.
    numero: cliente.numero ?? "",
    piso: cliente.piso ?? "",
    referencia: cliente.referencia ?? "",
    localidadId: cliente.localidadId,
    sectorId,
  };
}

export function ClienteFormDialog({
  localidades,
  sectores,
  trigger,
  cliente,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  trigger?: React.ReactNode;
  // Con `cliente`, el diálogo edita ese cliente en vez de crear uno nuevo.
  cliente?: ClienteApi;
  // Uso controlado (sin trigger propio, ej. desde el botón de editar de la
  // tabla): quien lo usa maneja el estado de apertura.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const esEdicion = !!cliente;
  const [openUncontrolled, setOpenUncontrolled] = React.useState(false);
  const open = openControlled ?? openUncontrolled;
  const [draft, setDraft] = React.useState<Draft>(
    cliente ? draftFromCliente(cliente, sectores) : emptyDraft(localidades, sectores)
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) {
      setDraft(cliente ? draftFromCliente(cliente, sectores) : emptyDraft(localidades, sectores));
      setErrors({});
    }
    onOpenChangeControlled?.(next);
    setOpenUncontrolled(next);
  }

  function validate() {
    const next: Record<string, string> = {};

    const nombreResult = nombreClienteSchema.safeParse(draft.nombre);
    if (!nombreResult.success) next.nombre = nombreResult.error.issues[0].message;

    const telefonoResult = telefonoClienteSchema.safeParse(draft.telefono);
    if (!telefonoResult.success) next.telefono = telefonoResult.error.issues[0].message;

    // Documento es opcional — solo se valida el formato si se cargó algo.
    // Persona -> DNI (7/8 dígitos), Empresa -> CUIT (11 dígitos).
    const documentoSchema = draft.tipo === "empresa" ? cuitSchema : dniSchema;
    const documentoResult = documentoSchema.safeParse(draft.documento);
    if (!documentoResult.success) next.documento = documentoResult.error.issues[0].message;

    const emailResult = emailOpcionalSchema.safeParse(draft.email);
    if (!emailResult.success) next.email = emailResult.error.issues[0].message;

    if (!draft.calle.trim()) next.calle = "Ingresá la calle.";
    if (!draft.localidadId) next.localidadId = "Elegí una localidad.";
    if (!draft.sectorId) next.sectorId = "Elegí un sector.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
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
    };

    setSubmitting(true);
    try {
      const resultado =
        esEdicion && cliente
          ? await actualizarClienteAction(cliente.id, payload)
          : await createClienteAction(payload);
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(esEdicion ? "Cliente actualizado" : "Cliente creado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
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
              <UserPlus2 className="size-4" /> Nuevo cliente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualizá los datos de contacto y domicilio."
              : "Datos de contacto para asociar a sus encomiendas."}
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
                onChange={(e) =>
                  setDraft({ ...draft, telefono: sanitizeTelefonoInput(e.target.value) })
                }
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="documento">{draft.tipo === "empresa" ? "CUIT (opcional)" : "DNI (opcional)"}</Label>
              <Input
                id="documento"
                value={draft.documento}
                onChange={(e) =>
                  setDraft({ ...draft, documento: sanitizeDocumentoInput(e.target.value, draft.tipo) })
                }
                aria-invalid={!!errors.documento}
              />
              {errors.documento && <p className="text-xs text-destructive">{errors.documento}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: sanitizeEmailInput(e.target.value) })}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
                placeholder="1450 bis, S/N…"
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
              {esEdicion ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
