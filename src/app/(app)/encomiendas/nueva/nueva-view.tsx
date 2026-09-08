"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackagePlus, Truck, Mail, Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ProvinciaLocalidadSelect } from "@/components/shared/provincia-localidad-select";
import { ClienteQuickPick } from "@/components/shared/cliente-quick-pick";
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createEncomiendaAction } from "@/server/actions";
import { GRUPOS_RUTA } from "@/lib/mock/rutas";
import { localidadNombre } from "@/lib/mock/localidades";
import { formatDateTime } from "@/lib/format";
import type {
  Cliente,
  ContactoEncomienda,
  Encomienda,
  Provincia,
  SesionUsuario,
  TipoEncomienda,
} from "@/types";

const TIPOS: { value: TipoEncomienda; label: string }[] = [
  { value: "PAQUETERIA", label: "Paquetería" },
  { value: "CRR", label: "Contra reembolso (CRR)" },
  { value: "TRAMITE", label: "Trámite" },
  { value: "INTERNO", label: "Interno" },
];

function emptyContacto(): ContactoEncomienda {
  return {
    nombre: "",
    telefono: "",
    esCelular: true,
    direccion: "",
    localidadId: "mis-obera",
    provincia: "MISIONES",
  };
}

function letraDelDia(n: number) {
  return String.fromCharCode(65 + (n % 26));
}

export function NuevaEncomiendaView({
  encomiendas,
  clientes,
  session,
}: {
  encomiendas: Encomienda[];
  clientes: Cliente[];
  session: SesionUsuario | null;
}) {
  const [rutaId, setRutaId] = React.useState<string>("");
  const [paqueteConmigo, setPaqueteConmigo] = React.useState(false);
  const [origen, setOrigen] = React.useState<ContactoEncomienda>(emptyContacto());
  const [destino, setDestino] = React.useState<ContactoEncomienda>(emptyContacto());
  const [tipo, setTipo] = React.useState<TipoEncomienda>("PAQUETERIA");
  const [esSobre, setEsSobre] = React.useState(false);
  const [bultos, setBultos] = React.useState(1);
  const [flete, setFlete] = React.useState<number | "">("");
  const [montoCrr, setMontoCrr] = React.useState<number | "">("");
  const [observaciones, setObservaciones] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const proximoRemito = React.useMemo(() => {
    const max = encomiendas.reduce((acc, e) => {
      const n = Number(e.remito);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 100000);
    return String(max + 1);
  }, [encomiendas]);

  const hoy = encomiendas.filter((e) => {
    const d = new Date(e.fechaAlta);
    return d.toDateString() === new Date().toDateString();
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!origen.nombre.trim()) next.origenNombre = "Ingresá el cliente de origen.";
    if (!origen.direccion.trim()) next.origenDireccion = "Ingresá la dirección de origen.";
    if (!destino.nombre.trim()) next.destinoNombre = "Ingresá el destinatario.";
    if (!destino.direccion.trim()) next.destinoDireccion = "Ingresá la dirección de destino.";
    if (tipo === "CRR" && (montoCrr === "" || Number(montoCrr) <= 0))
      next.montoCrr = "Ingresá el monto a reembolsar.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function resetForm() {
    setOrigen(emptyContacto());
    setDestino(emptyContacto());
    setTipo("PAQUETERIA");
    setEsSobre(false);
    setBultos(1);
    setFlete("");
    setMontoCrr("");
    setObservaciones("");
    setPaqueteConmigo(false);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !session) {
      if (!session) toast.error("Tu sesión expiró, volvé a iniciar sesión.");
      return;
    }

    setSubmitting(true);
    const created = await createEncomiendaAction({
      remito: proximoRemito,
      letraDia: letraDelDia(hoy.length),
      fechaAlta: new Date().toISOString(),
      origen,
      destino,
      tipo,
      esSobre,
      observaciones: observaciones.trim() || undefined,
      estado: "PENDIENTE",
      rutaId: rutaId || undefined,
      sucursalId: session.sucursalId,
      operadorId: session.personalId,
      bultos,
      flete: flete === "" ? 0 : Number(flete),
      montoCrr: tipo === "CRR" ? Number(montoCrr) : undefined,
      formaPago: "PAGADO_DESTINO",
      fleteCobrado: false,
      crrCobrado: false,
      paqueteConmigo,
    });
    setSubmitting(false);

    toast.success(`Encomienda ${created.remito} cargada correctamente`);
    resetForm();
  }

  return (
    <div>
      <PageHeader
        title="Nueva encomienda"
        description="Cargá una encomienda nueva con los datos de origen y destino."
        actions={
          <div className="text-right text-xs text-muted-foreground">
            <p>
              N° Remito propuesto{" "}
              <span className="font-mono font-semibold text-foreground">
                {proximoRemito}
              </span>
            </p>
            <p>
              Letra del día{" "}
              <span className="font-mono font-semibold text-foreground">
                {letraDelDia(hoy.length)}
              </span>
            </p>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid min-w-48 flex-1 gap-1.5">
                <Label htmlFor="ruta" className="text-xs text-muted-foreground">
                  Levanta (ruta / chofer)
                </Label>
                <Select value={rutaId} onValueChange={setRutaId}>
                  <SelectTrigger id="ruta" className="w-full">
                    <SelectValue placeholder="Levanta (yo)" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRUPOS_RUTA.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 pt-5 text-sm">
                <Checkbox
                  checked={paqueteConmigo}
                  onCheckedChange={(v) => setPaqueteConmigo(v === true)}
                />
                Paquete conmigo
              </label>
            </div>

            <Separator />

            <ContactoFields
              title="Datos de origen"
              icon={<PackagePlus className="size-4" />}
              value={origen}
              onChange={setOrigen}
              errors={{ nombre: errors.origenNombre, direccion: errors.origenDireccion }}
              idPrefix="origen"
              clientes={clientes}
            />

            <Separator />

            <ContactoFields
              title="Datos de destino"
              icon={<Truck className="size-4" />}
              value={destino}
              onChange={setDestino}
              errors={{ nombre: errors.destinoNombre, direccion: errors.destinoDireccion }}
              idPrefix="destino"
              clientes={clientes}
            />

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEncomienda)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Bultos</Label>
                <Input
                  type="number"
                  min={1}
                  value={bultos}
                  onChange={(e) => setBultos(Number(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Flete ($)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={flete}
                  onChange={(e) =>
                    setFlete(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              {tipo === "CRR" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Monto a reembolsar</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={montoCrr}
                    onChange={(e) =>
                      setMontoCrr(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    aria-invalid={!!errors.montoCrr}
                  />
                  {errors.montoCrr && (
                    <p className="text-xs text-destructive">{errors.montoCrr}</p>
                  )}
                </div>
              )}
              <label className="flex items-center gap-2 pt-5 text-sm">
                <Checkbox checked={esSobre} onCheckedChange={(v) => setEsSobre(v === true)} />
                Es un sobre
              </label>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="obs" className="text-xs text-muted-foreground">
                Observaciones
              </Label>
              <Textarea
                id="obs"
                placeholder="Notas para el repartidor, fragilidad, horarios de entrega..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Limpiar
              </Button>
              <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
                <PackagePlus className="size-4" />
                Agregar encomienda
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Cargadas hoy ({hoy.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            {hoy.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no cargaste ninguna encomienda hoy.
              </p>
            )}
            <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
              {hoy.slice(0, 12).map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold">#{e.remito}</span>
                    <EstadoBadge estado={e.estado} />
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {e.origen.nombre} → {e.destino.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {localidadNombre(e.destino.localidadId)} · {formatDateTime(e.fechaAlta)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <TipoBadge tipo={e.tipo} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Printer className="size-3.5" /> Imprimir despachos
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Mail className="size-3.5" /> Enviar planilla
        </Button>
      </div>
    </div>
  );
}

function ContactoFields({
  title,
  icon,
  value,
  onChange,
  errors,
  idPrefix,
  clientes,
}: {
  title: string;
  icon: React.ReactNode;
  value: ContactoEncomienda;
  onChange: (v: ContactoEncomienda) => void;
  errors: { nombre?: string; direccion?: string };
  idPrefix: string;
  clientes: Cliente[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </p>
        <ClienteQuickPick
          clientes={clientes}
          onSelect={(c) =>
            onChange({
              nombre: c.nombre,
              telefono: c.telefono,
              esCelular: c.esCelular,
              direccion: c.domicilio,
              localidadId: c.localidadId,
              provincia: c.provincia,
            })
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-nombre`} className="text-xs text-muted-foreground">
            Cliente
          </Label>
          <Input
            id={`${idPrefix}-nombre`}
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
            aria-invalid={!!errors.nombre}
          />
          {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-telefono`} className="text-xs text-muted-foreground">
            Teléfono
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-telefono`}
              value={value.telefono}
              onChange={(e) => onChange({ ...value, telefono: e.target.value })}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={value.esCelular}
                onCheckedChange={(v) => onChange({ ...value, esCelular: v === true })}
              />
              Celular
            </label>
          </div>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-direccion`} className="text-xs text-muted-foreground">
            Calle, altura
          </Label>
          <Input
            id={`${idPrefix}-direccion`}
            value={value.direccion}
            onChange={(e) => onChange({ ...value, direccion: e.target.value })}
            aria-invalid={!!errors.direccion}
          />
          {errors.direccion && (
            <p className="text-xs text-destructive">{errors.direccion}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <ProvinciaLocalidadSelect
            idPrefix={idPrefix}
            provincia={value.provincia}
            localidadId={value.localidadId}
            onChangeProvincia={(p: Provincia) => onChange({ ...value, provincia: p })}
            onChangeLocalidad={(id) => onChange({ ...value, localidadId: id })}
          />
        </div>
      </div>
    </div>
  );
}
