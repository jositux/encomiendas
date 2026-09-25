"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClienteSearchInput } from "@/components/shared/cliente-search-input";
import { createClienteAction } from "@/server/actions";
import type { LocalidadBackend } from "@/types";
import type { ClienteApi } from "@/server/services/clientes";
import { nombreClienteSchema, telefonoClienteSchema, sanitizeTelefonoInput } from "@/lib/validation";

// NOTA-2026-09-22-01: alta rápida de cliente desde los bloques de
// remitente/destinatario de Nueva Encomienda (modo individual). A
// diferencia de ClienteFormDialog (alta/edición completa, pantalla de
// Clientes), este formulario pide sólo los campos que la API exige más la
// marca de cuenta corriente — documento/email/piso/referencia quedan
// fuera a propósito (se completan después desde /clientes) y sectorId no
// se manda: sin él, el backend resuelve el sector predeterminado de la
// localidad (createCliente ya lo trata como opcional).
//
// NOTA-2026-09-23-05 (Sebastian): tres correcciones sobre la versión
// original de este modal. (1) El rótulo del nombre para persona física
// dice "Apellido y nombres", igual que ClienteFormDialog — es sólo el
// rótulo, el backend sigue guardando un único campo `nombre` de texto
// libre. (2) El campo `numero` de la calle SÍ se pide acá (antes había
// quedado afuera): es opcional y de texto libre en el contrato
// (POST /clientes admite "1450 bis", "S/N", no sólo dígitos), así que no
// lleva sanitización numérica. (3) Al crear el cliente (o elegir uno
// existente) desde el bloque de origen, el foco pasa solo al campo de
// destino de Nueva Encomienda — ver `focoDestino`/`autoFocus` en
// nueva-view.tsx y alta-individual-view.tsx.
//
// El campo nombre reutiliza ClienteSearchInput en vez de un <Input> común:
// es la misma búsqueda contra GET /clientes?q= que pide el NOTA ("antes de
// crear, se buscan coincidencias... el operador puede elegir uno
// existente"). Si el operador elige un resultado ahí, no creamos nada
// nuevo — cerramos el modal y el bloque queda asociado al cliente
// existente, igual que si lo hubiéramos creado.
type Draft = {
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  calle: string;
  numero: string;
  localidadId: string;
  esCuentaCorriente: boolean;
};

function draftInicial(
  nombre: string,
  telefono: string,
  calle: string,
  localidadId: string
): Draft {
  return {
    tipo: "persona",
    nombre,
    telefono: sanitizeTelefonoInput(telefono),
    calle,
    numero: "",
    localidadId,
    esCuentaCorriente: false,
  };
}

export function ClienteAltaRapidaDialog({
  open,
  onOpenChange,
  localidades,
  nombreInicial = "",
  telefonoInicial = "",
  calleInicial = "",
  localidadIdInicial = "",
  onClienteListo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localidades: LocalidadBackend[];
  nombreInicial?: string;
  telefonoInicial?: string;
  calleInicial?: string;
  localidadIdInicial?: string;
  // Se llama tanto si se crea un cliente nuevo como si se elige uno
  // existente de las coincidencias — el bloque de origen/destino queda
  // asociado igual en los dos casos.
  onClienteListo: (cliente: ClienteApi) => void;
}) {
  // Lazy init (no useEffect): lee lo que el operador ya tenía tipeado en
  // el bloque al momento de montar — "confirma o corrige, no retipea"
  // (NOTA-2026-09-22-01). El padre fuerza el remount (y por lo tanto este
  // reinicio) con un `key` distinto cada vez que abre el modal para un
  // bloque, así que no hace falta sincronizar esto con un efecto. Lo ya
  // cargado del envío en sí no pasa por acá: vive en el estado del padre
  // (origen/destino), que no tocamos hasta que el operador guarda o elige
  // un cliente existente.
  const [draft, setDraft] = React.useState<Draft>(() =>
    draftInicial(nombreInicial, telefonoInicial, calleInicial, localidadIdInicial)
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function elegirExistente(cliente: ClienteApi) {
    onClienteListo(cliente);
    onOpenChange(false);
  }

  function validar() {
    const next: Record<string, string> = {};
    const nombreResult = nombreClienteSchema.safeParse(draft.nombre);
    if (!nombreResult.success) next.nombre = nombreResult.error.issues[0].message;
    const telefonoResult = telefonoClienteSchema.safeParse(draft.telefono);
    if (!telefonoResult.success) next.telefono = telefonoResult.error.issues[0].message;
    if (!draft.calle.trim()) next.calle = "Ingresá la calle.";
    if (!draft.localidadId) next.localidadId = "Elegí una localidad.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setSubmitting(true);
    try {
      const resultado = await createClienteAction({
        tipo: draft.tipo,
        nombre: draft.nombre.trim(),
        telefono: draft.telefono.trim(),
        esCuentaCorriente: draft.esCuentaCorriente,
        localidadId: draft.localidadId,
        calle: draft.calle.trim(),
        numero: draft.numero.trim() || undefined,
      });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success("Cliente creado");
      onClienteListo(resultado.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alta rápida de cliente</DialogTitle>
          <DialogDescription>
            Lo mínimo para asociarlo al envío — el resto se completa después desde Clientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="alta-rapida-nombre">
              {draft.tipo === "empresa" ? "Razón social" : "Apellido y nombres"}
            </Label>
            <ClienteSearchInput
              id="alta-rapida-nombre"
              value={draft.nombre}
              onChange={(v) => setDraft({ ...draft, nombre: v })}
              onSelectCliente={elegirExistente}
              placeholder="Nombre — si ya existe, elegilo de la lista"
              ariaInvalid={!!errors.nombre}
            />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="alta-rapida-tipo">Tipo</Label>
              <Select
                value={draft.tipo}
                onValueChange={(v: "persona" | "empresa") => setDraft({ ...draft, tipo: v })}
              >
                <SelectTrigger id="alta-rapida-tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persona">Persona</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alta-rapida-telefono">Teléfono</Label>
              <Input
                id="alta-rapida-telefono"
                value={draft.telefono}
                onChange={(e) =>
                  setDraft({ ...draft, telefono: sanitizeTelefonoInput(e.target.value) })
                }
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="alta-rapida-calle">Calle</Label>
              <Input
                id="alta-rapida-calle"
                value={draft.calle}
                onChange={(e) => setDraft({ ...draft, calle: e.target.value })}
                aria-invalid={!!errors.calle}
              />
              {errors.calle && <p className="text-xs text-destructive">{errors.calle}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alta-rapida-numero">Número</Label>
              <Input
                id="alta-rapida-numero"
                value={draft.numero}
                onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
                placeholder="1450 bis, S/N…"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="alta-rapida-localidad">Localidad</Label>
            <Select
              value={draft.localidadId}
              onValueChange={(id) => setDraft({ ...draft, localidadId: id })}
            >
              <SelectTrigger id="alta-rapida-localidad" className="w-full">
                <SelectValue placeholder="Localidad" />
              </SelectTrigger>
              <SelectContent>
                {localidades.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.localidadId && <p className="text-xs text-destructive">{errors.localidadId}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.esCuentaCorriente}
              onCheckedChange={(v) => setDraft({ ...draft, esCuentaCorriente: v === true })}
            />
            Cuenta corriente
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
