"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackagePlus, Truck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LocalidadSectorSelect } from "@/components/shared/localidad-sector-select";
import { ClienteQuickPick } from "@/components/shared/cliente-quick-pick";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { crearEnvioAction } from "@/server/actions";
import type {
  CrearEnvioInput,
  EnvioApi,
  FormaPagoApi,
  LugarPagoApi,
  TipoEnvioApi,
} from "@/server/services/envios";
import type { ClienteApi } from "@/server/services/clientes";
import type { SectorApi } from "@/server/services/sectores";
import type { LocalidadBackend, SesionUsuario } from "@/types";

const TIPOS: { value: TipoEnvioApi; label: string }[] = [
  { value: "paqueteria", label: "Paquetería" },
  { value: "efectivo", label: "Contra reembolso" },
  { value: "tramite", label: "Trámite" },
  { value: "interno", label: "Interno" },
];

const LUGARES_PAGO: { value: LugarPagoApi; label: string }[] = [
  { value: "origen", label: "Origen" },
  { value: "destino", label: "Destino" },
  { value: "regreso", label: "Contra entrega (regreso)" },
];

const FORMAS_PAGO: { value: FormaPagoApi; label: string }[] = [
  { value: "contado", label: "Contado" },
  { value: "cuenta_corriente", label: "Cuenta corriente" },
];

interface OrigenState {
  nombre: string;
  telefono: string;
  clienteId?: string;
}

interface DestinoState {
  nombre: string;
  telefono: string;
  calle: string;
  numero: string;
  piso: string;
  referencia: string;
  localidadId: string;
  sectorId: string;
  clienteId?: string;
  domicilioId?: string;
}

function emptyOrigen(): OrigenState {
  return { nombre: "", telefono: "" };
}

function emptyDestino(localidades: LocalidadBackend[], sectores: SectorApi[]): DestinoState {
  const localidadId = localidades[0]?.id ?? "";
  const sectorId = sectores.find((s) => s.localidadId === localidadId)?.id ?? "";
  return {
    nombre: "",
    telefono: "",
    calle: "",
    numero: "",
    piso: "",
    referencia: "",
    localidadId,
    sectorId,
  };
}

function guiaDeEnvio(e: EnvioApi): string {
  // La guía real (letra+numero, ej. "C1") que usa el negocio en mostrador
  // viene en guiaDiaria. `numero` es un correlativo interno ("000000001-7"),
  // no lo que se dice/escribe como guía. Confirmado probando en vivo.
  return e.guiaDiaria ?? e.numero ?? e.id?.slice(0, 8) ?? "—";
}

export function NuevaEncomiendaView({
  localidades,
  sectores,
  envios,
  session,
}: {
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  envios: EnvioApi[];
  session: SesionUsuario | null;
}) {
  const [origen, setOrigen] = React.useState<OrigenState>(emptyOrigen());
  const [destino, setDestino] = React.useState<DestinoState>(() =>
    emptyDestino(localidades, sectores)
  );
  const [tipo, setTipo] = React.useState<TipoEnvioApi>("paqueteria");
  const [lugarPago, setLugarPago] = React.useState<LugarPagoApi>("destino");
  const [formaPago, setFormaPago] = React.useState<FormaPagoApi>("contado");
  const [bultos, setBultos] = React.useState(1);
  const [flete, setFlete] = React.useState<number | "">("");
  const [montoCrr, setMontoCrr] = React.useState<number | "">("");
  const [remitoManual, setRemitoManual] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [cargados, setCargados] = React.useState<EnvioApi[]>(envios);

  function validate() {
    const next: Record<string, string> = {};
    if (!origen.nombre.trim()) next.origenNombre = "Ingresá el remitente.";
    if (!destino.nombre.trim()) next.destinoNombre = "Ingresá el destinatario.";
    if (!destino.calle.trim()) next.destinoCalle = "Ingresá la calle de destino.";
    if (!destino.localidadId) next.destinoLocalidad = "Elegí la localidad de destino.";
    if (!destino.sectorId) next.destinoSector = "Elegí el sector de destino.";
    if (tipo === "efectivo" && (montoCrr === "" || Number(montoCrr) <= 0))
      next.montoCrr = "Ingresá el monto a reembolsar.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function resetForm() {
    setOrigen(emptyOrigen());
    setDestino(emptyDestino(localidades, sectores));
    setTipo("paqueteria");
    setLugarPago("destino");
    setFormaPago("contado");
    setBultos(1);
    setFlete("");
    setMontoCrr("");
    setRemitoManual("");
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !session) {
      if (!session) toast.error("Tu sesión expiró, volvé a iniciar sesión.");
      return;
    }

    setSubmitting(true);
    try {
      const data: CrearEnvioInput = {
        remitente: {
          nombre: origen.nombre.trim(),
          telefono: origen.telefono.trim(),
          clienteId: origen.clienteId,
        },
        destinatario: {
          nombre: destino.nombre.trim(),
          telefono: destino.telefono.trim(),
          calle: destino.calle.trim(),
          numero: destino.numero.trim() || undefined,
          piso: destino.piso.trim() || undefined,
          referencia: destino.referencia.trim() || undefined,
          localidadId: destino.localidadId,
          sectorId: destino.sectorId,
          clienteId: destino.clienteId,
          domicilioId: destino.domicilioId,
        },
        cantidadBultos: bultos,
        fleteImporte: flete === "" ? 0 : Number(flete),
        tipo,
        lugarPago,
        formaPago,
        contrarreembolsoImporte: tipo === "efectivo" ? Number(montoCrr) : undefined,
        remitoManualNumero: remitoManual.trim() || undefined,
      };
      const created = await crearEnvioAction(data);
      setCargados((prev) => [created, ...prev]);
      toast.success(`Encomienda ${guiaDeEnvio(created)} cargada correctamente`);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la encomienda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nueva encomienda"
        description="Cargá una encomienda nueva con los datos de origen y destino."
      />

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <PackagePlus className="size-4" />
                  Datos de origen
                </p>
                <ClienteQuickPick
                  onSelect={(c: ClienteApi) =>
                    setOrigen({ nombre: c.nombre, telefono: c.telefono, clienteId: c.id })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="origen-nombre" className="text-xs text-muted-foreground">
                    Remitente
                  </Label>
                  <Input
                    id="origen-nombre"
                    value={origen.nombre}
                    onChange={(e) =>
                      setOrigen({ ...origen, nombre: e.target.value, clienteId: undefined })
                    }
                    aria-invalid={!!errors.origenNombre}
                  />
                  {errors.origenNombre && (
                    <p className="text-xs text-destructive">{errors.origenNombre}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="origen-telefono" className="text-xs text-muted-foreground">
                    Teléfono
                  </Label>
                  <Input
                    id="origen-telefono"
                    value={origen.telefono}
                    onChange={(e) => setOrigen({ ...origen, telefono: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4" />
                  Datos de destino
                </p>
                <ClienteQuickPick
                  onSelect={(c: ClienteApi) => {
                    const dom =
                      c.domicilios.find((d) => d.esPredeterminado) ?? c.domicilios[0];
                    setDestino({
                      nombre: c.nombre,
                      telefono: c.telefono,
                      calle: dom?.calle ?? "",
                      numero: dom?.numero ?? "",
                      piso: dom?.piso ?? "",
                      referencia: dom?.referencia ?? "",
                      localidadId: dom?.localidadId ?? destino.localidadId,
                      sectorId: dom?.sectorId ?? destino.sectorId,
                      clienteId: c.id,
                      domicilioId: dom?.id,
                    });
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="destino-nombre" className="text-xs text-muted-foreground">
                    Destinatario
                  </Label>
                  <Input
                    id="destino-nombre"
                    value={destino.nombre}
                    onChange={(e) =>
                      setDestino({
                        ...destino,
                        nombre: e.target.value,
                        clienteId: undefined,
                        domicilioId: undefined,
                      })
                    }
                    aria-invalid={!!errors.destinoNombre}
                  />
                  {errors.destinoNombre && (
                    <p className="text-xs text-destructive">{errors.destinoNombre}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="destino-telefono" className="text-xs text-muted-foreground">
                    Teléfono
                  </Label>
                  <Input
                    id="destino-telefono"
                    value={destino.telefono}
                    onChange={(e) => setDestino({ ...destino, telefono: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="destino-calle" className="text-xs text-muted-foreground">
                    Calle
                  </Label>
                  <Input
                    id="destino-calle"
                    value={destino.calle}
                    onChange={(e) => setDestino({ ...destino, calle: e.target.value })}
                    aria-invalid={!!errors.destinoCalle}
                  />
                  {errors.destinoCalle && (
                    <p className="text-xs text-destructive">{errors.destinoCalle}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="destino-numero" className="text-xs text-muted-foreground">
                      Número
                    </Label>
                    <Input
                      id="destino-numero"
                      value={destino.numero}
                      onChange={(e) => setDestino({ ...destino, numero: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="destino-piso" className="text-xs text-muted-foreground">
                      Piso/Depto
                    </Label>
                    <Input
                      id="destino-piso"
                      value={destino.piso}
                      onChange={(e) => setDestino({ ...destino, piso: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="destino-referencia" className="text-xs text-muted-foreground">
                    Referencia (entre calles, color de casa, etc.)
                  </Label>
                  <Input
                    id="destino-referencia"
                    value={destino.referencia}
                    onChange={(e) => setDestino({ ...destino, referencia: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <LocalidadSectorSelect
                    idPrefix="destino"
                    localidades={localidades}
                    sectores={sectores}
                    localidadId={destino.localidadId}
                    sectorId={destino.sectorId}
                    onChangeLocalidad={(id) => {
                      const primerSector = sectores.find((s) => s.localidadId === id)?.id ?? "";
                      setDestino({
                        ...destino,
                        localidadId: id,
                        sectorId: primerSector,
                        clienteId: undefined,
                        domicilioId: undefined,
                      });
                    }}
                    onChangeSector={(id) => setDestino({ ...destino, sectorId: id })}
                  />
                  {(errors.destinoLocalidad || errors.destinoSector) && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.destinoLocalidad || errors.destinoSector}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEnvioApi)}>
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
              {tipo === "efectivo" && (
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Dónde se paga el flete</Label>
                <Select value={lugarPago} onValueChange={(v) => setLugarPago(v as LugarPagoApi)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LUGARES_PAGO.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Forma de pago</Label>
                <Select value={formaPago} onValueChange={(v) => setFormaPago(v as FormaPagoApi)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="remito-manual" className="text-xs text-muted-foreground">
                  Remito manual (opcional)
                </Label>
                <Input
                  id="remito-manual"
                  placeholder="Solo si ya tenés un número impreso"
                  value={remitoManual}
                  onChange={(e) => setRemitoManual(e.target.value)}
                />
              </div>
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
            <CardTitle className="text-sm">Envíos recientes ({cargados.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            {cargados.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no cargaste ninguna encomienda.
              </p>
            )}
            <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
              {cargados.slice(0, 12).map((e) => (
                <div key={e.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold">#{guiaDeEnvio(e)}</span>
                    {e.estadoActual && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {e.estadoActual}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {e.remitenteNombre ?? "—"} → {e.destinatarioNombre ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
