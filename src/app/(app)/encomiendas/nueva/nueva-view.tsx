"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PackagePlus,
  Truck,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Building2,
  Phone,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LocalidadSectorSelect } from "@/components/shared/localidad-sector-select";
import { ClienteSearchInput } from "@/components/shared/cliente-search-input";
import {
  bultosSchema,
  montoNoNegativoSchema,
  montoPositivoSchema,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
} from "@/lib/validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// ---- Carga rápida: un remitente fijo, varios destinos, cada uno se guarda
// como un envío propio (no existe un endpoint de alta en lote en el backend
// real — ver plan-integracion-backend.md). Cada fila tiene su propio estado
// para que un destino con error no bloquee a los demás ya cargados.
type EstadoFila = "editando" | "guardando" | "ok" | "error";

interface FilaDestino {
  id: string;
  destino: DestinoState;
  tipo: TipoEnvioApi;
  lugarPago: LugarPagoApi;
  formaPago: FormaPagoApi;
  bultos: number;
  flete: number | "";
  montoCrr: number | "";
  remitoManual: string;
  status: EstadoFila;
  resultado?: EnvioApi;
  errorMsg?: string;
  errores: Record<string, string>;
}

function nuevaFilaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fila-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// "Agregar destino": arranca en blanco, pero hereda tipo/flete/lugarPago/
// formaPago/bultos de la última fila (sea cual sea su estado) — es lo que
// normalmente se repite entre destinos de una misma carga.
function filaEnBlanco(
  localidades: LocalidadBackend[],
  sectores: SectorApi[],
  heredarDe?: FilaDestino
): FilaDestino {
  return {
    id: nuevaFilaId(),
    destino: emptyDestino(localidades, sectores),
    tipo: heredarDe?.tipo ?? "paqueteria",
    lugarPago: heredarDe?.lugarPago ?? "destino",
    formaPago: heredarDe?.formaPago ?? "contado",
    bultos: heredarDe?.bultos ?? 1,
    flete: heredarDe?.flete ?? "",
    montoCrr: "",
    remitoManual: "",
    status: "editando",
    errores: {},
  };
}

// "Duplicar": clona TODO (destinatario, domicilio y valores de pago) de una
// fila existente — para cuando hay que mandar 2+ paquetes a la misma
// dirección sin volver a tipear nada. El remito manual no se copia (cada
// bulto suele tener el suyo si se usa).
function filaDuplicada(origen: FilaDestino): FilaDestino {
  return {
    ...origen,
    id: nuevaFilaId(),
    destino: { ...origen.destino },
    remitoManual: "",
    status: "editando",
    resultado: undefined,
    errorMsg: undefined,
    errores: {},
  };
}

function validarFila(f: FilaDestino): Record<string, string> {
  const next: Record<string, string> = {};
  if (!f.destino.nombre.trim()) next.nombre = "Ingresá el destinatario.";
  if (!f.destino.calle.trim()) next.calle = "Ingresá la calle de destino.";
  if (!f.destino.localidadId) next.localidad = "Elegí la localidad de destino.";
  if (!f.destino.sectorId) next.sector = "Elegí el sector de destino.";
  const bultosCheck = bultosSchema.safeParse(f.bultos);
  if (!bultosCheck.success) next.bultos = bultosCheck.error.issues[0].message;
  const fleteCheck = montoNoNegativoSchema.safeParse(f.flete === "" ? 0 : f.flete);
  if (!fleteCheck.success) next.flete = fleteCheck.error.issues[0].message;
  if (f.tipo === "efectivo") {
    const montoCheck = montoPositivoSchema.safeParse(f.montoCrr === "" ? 0 : f.montoCrr);
    if (!montoCheck.success) next.montoCrr = montoCheck.error.issues[0].message;
  }
  return next;
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
  const [modo, setModo] = React.useState<"individual" | "rapida">("individual");

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

  const [filas, setFilas] = React.useState<FilaDestino[]>([]);
  // Carga rápida: el remitente queda "fijo" recién cuando el usuario lo confirma
  // explícitamente (botón "Confirmar remitente"), nunca solo por tener texto en
  // el campo Nombre — de lo contrario la UI saltaba a la vista "bloqueada" apenas
  // se tipeaba el primer caracter del nombre, sin darle tiempo a cargar el teléfono
  // (bug real encontrado en pruebas: el remitente quedaba fijo con teléfono vacío
  // y el backend rechazaba todos los destinos con "remitente.telefono must be
  // longer than or equal to 1 characters").
  const [remitenteConfirmado, setRemitenteConfirmado] = React.useState(false);

  const localidadNombre = React.useCallback(
    (id: string) => localidades.find((l) => l.id === id)?.nombre ?? "—",
    [localidades]
  );
  const sectorNombre = React.useCallback(
    (id: string) => sectores.find((s) => s.id === id)?.nombre ?? "—",
    [sectores]
  );

  function validate() {
    const next: Record<string, string> = {};
    if (!origen.nombre.trim()) next.origenNombre = "Ingresá el remitente.";
    if (!destino.nombre.trim()) next.destinoNombre = "Ingresá el destinatario.";
    if (!destino.calle.trim()) next.destinoCalle = "Ingresá la calle de destino.";
    if (!destino.localidadId) next.destinoLocalidad = "Elegí la localidad de destino.";
    if (!destino.sectorId) next.destinoSector = "Elegí el sector de destino.";
    const bultosCheck = bultosSchema.safeParse(bultos);
    if (!bultosCheck.success) next.bultos = bultosCheck.error.issues[0].message;
    const fleteCheck = montoNoNegativoSchema.safeParse(flete === "" ? 0 : flete);
    if (!fleteCheck.success) next.flete = fleteCheck.error.issues[0].message;
    if (tipo === "efectivo") {
      const montoCheck = montoPositivoSchema.safeParse(montoCrr === "" ? 0 : montoCrr);
      if (!montoCheck.success) next.montoCrr = montoCheck.error.issues[0].message;
    }
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
      const resultado = await crearEnvioAction(data);
      if (!resultado.ok) {
        // Rechazo de negocio del backend (ej. "no hay servicio_par" para ese
        // origen/destino) — no es una excepción real, se muestra el título
        // real que ya manda el backend en vez de dejar el formulario roto.
        toast.error(resultado.title || resultado.message);
        return;
      }
      setCargados((prev) => [resultado.envio, ...prev]);
      toast.success(`Encomienda ${guiaDeEnvio(resultado.envio)} cargada correctamente`);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la encomienda.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Carga rápida ----

  function agregarDestino() {
    setFilas((prev) => [...prev, filaEnBlanco(localidades, sectores, prev[prev.length - 1])]);
  }

  function duplicarDestino(id: string) {
    setFilas((prev) => {
      const fuente = prev.find((f) => f.id === id);
      if (!fuente) return prev;
      return [...prev, filaDuplicada(fuente)];
    });
  }

  function actualizarFila(id: string, patch: Partial<FilaDestino>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function quitarFila(id: string) {
    setFilas((prev) => prev.filter((f) => f.id !== id));
  }

  async function guardarFila(id: string) {
    const fila = filas.find((f) => f.id === id);
    if (!fila) return;
    if (!session) {
      toast.error("Tu sesión expiró, volvé a iniciar sesión.");
      return;
    }
    if (!remitenteConfirmado || !origen.nombre.trim() || !origen.telefono.trim()) {
      toast.error("Elegí primero el remitente de esta carga.");
      return;
    }
    const errores = validarFila(fila);
    if (Object.keys(errores).length > 0) {
      actualizarFila(id, { errores });
      return;
    }

    actualizarFila(id, { status: "guardando", errores: {} });
    try {
      const data: CrearEnvioInput = {
        remitente: {
          nombre: origen.nombre.trim(),
          telefono: origen.telefono.trim(),
          clienteId: origen.clienteId,
        },
        destinatario: {
          nombre: fila.destino.nombre.trim(),
          telefono: fila.destino.telefono.trim(),
          calle: fila.destino.calle.trim(),
          numero: fila.destino.numero.trim() || undefined,
          piso: fila.destino.piso.trim() || undefined,
          referencia: fila.destino.referencia.trim() || undefined,
          localidadId: fila.destino.localidadId,
          sectorId: fila.destino.sectorId,
          clienteId: fila.destino.clienteId,
          domicilioId: fila.destino.domicilioId,
        },
        cantidadBultos: fila.bultos,
        fleteImporte: fila.flete === "" ? 0 : Number(fila.flete),
        tipo: fila.tipo,
        lugarPago: fila.lugarPago,
        formaPago: fila.formaPago,
        contrarreembolsoImporte: fila.tipo === "efectivo" ? Number(fila.montoCrr) : undefined,
        remitoManualNumero: fila.remitoManual.trim() || undefined,
      };
      const resultado = await crearEnvioAction(data);
      if (!resultado.ok) {
        const msg = resultado.title || resultado.message;
        actualizarFila(id, { status: "error", errorMsg: msg });
        toast.error(msg);
        return;
      }
      setCargados((prev) => [resultado.envio, ...prev]);
      actualizarFila(id, { status: "ok", resultado: resultado.envio, errorMsg: undefined });
      toast.success(`Encomienda ${guiaDeEnvio(resultado.envio)} cargada correctamente`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cargar este destino.";
      actualizarFila(id, { status: "error", errorMsg: msg });
      toast.error(msg);
    }
  }

  function terminarCargaRapida() {
    const sinGuardar = filas.filter((f) => f.status !== "ok");
    if (
      sinGuardar.length > 0 &&
      !window.confirm(
        `Hay ${sinGuardar.length} destino${sinGuardar.length === 1 ? "" : "s"} sin guardar en esta carga. ¿Salir igual? Se van a descartar.`
      )
    ) {
      return;
    }
    setFilas([]);
    setOrigen(emptyOrigen());
    setRemitenteConfirmado(false);
    setModo("individual");
  }

  const cargadosCount = filas.filter((f) => f.status === "ok").length;
  const erroresCount = filas.filter((f) => f.status === "error").length;

  return (
    <div>
      <PageHeader
        title="Nueva encomienda"
        description={
          modo === "individual"
            ? "Cargá una encomienda nueva con los datos de origen y destino."
            : "Elegí un remitente fijo y cargá varios destinos, uno por uno."
        }
        actions={
          <div className="inline-flex gap-1 rounded-md bg-muted p-1">
            <button
              type="button"
              onClick={() => setModo("individual")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === "individual"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setModo("rapida")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === "rapida"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Carga rápida
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {modo === "individual" ? (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardContent className="flex flex-col gap-6">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <PackagePlus className="size-4" />
                    Datos de origen
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="origen-nombre" className="text-xs text-muted-foreground">
                        Origen
                      </Label>
                      <ClienteSearchInput
                        id="origen-nombre"
                        value={origen.nombre}
                        onChange={(v) => setOrigen({ ...origen, nombre: v, clienteId: undefined })}
                        onSelectCliente={(c) =>
                          setOrigen({ nombre: c.nombre, telefono: c.telefono, clienteId: c.id })
                        }
                        placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                        ariaInvalid={!!errors.origenNombre}
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
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Truck className="size-4" />
                    Datos de destino
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="destino-nombre" className="text-xs text-muted-foreground">
                        Destino
                      </Label>
                      <ClienteSearchInput
                        id="destino-nombre"
                        value={destino.nombre}
                        onChange={(v) =>
                          setDestino({
                            ...destino,
                            nombre: v,
                            clienteId: undefined,
                            domicilioId: undefined,
                          })
                        }
                        onSelectCliente={(c) => {
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
                        placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                        ariaInvalid={!!errors.destinoNombre}
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
                      type="text"
                      inputMode="numeric"
                      value={bultos}
                      onChange={(e) => {
                        const cleaned = sanitizeIntegerInput(e.target.value);
                        setBultos(cleaned === "" ? 1 : Math.max(1, Number(cleaned)));
                      }}
                      aria-invalid={!!errors.bultos}
                    />
                    {errors.bultos && <p className="text-xs text-destructive">{errors.bultos}</p>}
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Flete ($)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={flete}
                      onChange={(e) => {
                        const cleaned = sanitizeMoneyInput(e.target.value);
                        setFlete(cleaned === "" ? "" : Math.max(0, Number(cleaned)));
                      }}
                      aria-invalid={!!errors.flete}
                    />
                    {errors.flete && <p className="text-xs text-destructive">{errors.flete}</p>}
                  </div>
                  {tipo === "efectivo" && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Monto a reembolsar</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={montoCrr}
                        onChange={(e) => {
                          const cleaned = sanitizeMoneyInput(e.target.value);
                          setMontoCrr(cleaned === "" ? "" : Math.max(0, Number(cleaned)));
                        }}
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
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {!remitenteConfirmado ? (
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="size-4" />
                    Elegí el remitente de esta carga
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Origen</Label>
                      <ClienteSearchInput
                        value={origen.nombre}
                        onChange={(v) => setOrigen({ ...origen, nombre: v, clienteId: undefined })}
                        onSelectCliente={(c) => {
                          setOrigen({ nombre: c.nombre, telefono: c.telefono, clienteId: c.id });
                          setRemitenteConfirmado(true);
                        }}
                        placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Teléfono</Label>
                      <Input
                        value={origen.telefono}
                        onChange={(e) => setOrigen({ ...origen, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este remitente queda fijo para todos los destinos que agregues abajo — cada
                    destino se carga como un envío propio.
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!origen.nombre.trim() || !origen.telefono.trim()}
                      onClick={() => setRemitenteConfirmado(true)}
                    >
                      Confirmar remitente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Building2 className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Remitente
                        </span>
                        <Badge variant="info" className="text-[11px] font-normal">
                          Fijo para esta carga
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
                        <span className="text-sm font-semibold">{origen.nombre}</span>
                        {origen.telefono && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            {origen.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOrigen(emptyOrigen());
                        setRemitenteConfirmado(false);
                      }}
                    >
                      Cambiar remitente
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    Destinos
                    <Badge variant="secondary">{filas.length}</Badge>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={agregarDestino}
                  >
                    <Plus className="size-3.5" />
                    Agregar destino
                  </Button>
                </div>

                {filas.length === 0 && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Todavía no agregaste ningún destino. Usá &quot;Agregar destino&quot; para el
                    primero.
                  </p>
                )}

                {filas.map((fila) => {
                  if (fila.status === "ok" && fila.resultado) {
                    const e = fila.resultado;
                    return (
                      <div
                        key={fila.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-success/30 bg-card p-3.5 shadow-xs"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                          <CheckCircle2 className="size-4" />
                        </div>
                        <span className="font-mono text-xs font-semibold text-success">
                          #{guiaDeEnvio(e)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                          <span className="text-sm font-medium">{fila.destino.nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            {localidadNombre(fila.destino.localidadId)} /{" "}
                            {sectorNombre(fila.destino.sectorId)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {TIPOS.find((t) => t.value === fila.tipo)?.label} · $
                            {fila.flete === "" ? 0 : fila.flete} flete
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() => duplicarDestino(fila.id)}
                        >
                          <Copy className="size-3.5" />
                          Duplicar
                        </Button>
                      </div>
                    );
                  }

                  if (fila.status === "error") {
                    return (
                      <div
                        key={fila.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/35 bg-card p-3.5 shadow-xs"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                          <AlertTriangle className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {fila.destino.nombre || "Destino sin nombre"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {localidadNombre(fila.destino.localidadId)} /{" "}
                              {sectorNombre(fila.destino.sectorId)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-destructive">
                            {fila.errorMsg}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => actualizarFila(fila.id, { status: "editando" })}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => guardarFila(fila.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          Reintentar
                        </Button>
                      </div>
                    );
                  }

                  const guardando = fila.status === "guardando";
                  return (
                    <Card
                      key={fila.id}
                      className="border-primary/50 ring-1 ring-primary/50"
                    >
                      <CardContent className="flex flex-col gap-4">
                        <p className="text-sm font-semibold">Destino</p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Destino</Label>
                            <ClienteSearchInput
                              disabled={guardando}
                              value={fila.destino.nombre}
                              onChange={(v) =>
                                actualizarFila(fila.id, {
                                  destino: {
                                    ...fila.destino,
                                    nombre: v,
                                    clienteId: undefined,
                                    domicilioId: undefined,
                                  },
                                })
                              }
                              onSelectCliente={(c) => {
                                const dom =
                                  c.domicilios.find((d) => d.esPredeterminado) ?? c.domicilios[0];
                                actualizarFila(fila.id, {
                                  destino: {
                                    nombre: c.nombre,
                                    telefono: c.telefono,
                                    calle: dom?.calle ?? "",
                                    numero: dom?.numero ?? "",
                                    piso: dom?.piso ?? "",
                                    referencia: dom?.referencia ?? "",
                                    localidadId: dom?.localidadId ?? fila.destino.localidadId,
                                    sectorId: dom?.sectorId ?? fila.destino.sectorId,
                                    clienteId: c.id,
                                    domicilioId: dom?.id,
                                  },
                                });
                              }}
                              placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                              ariaInvalid={!!fila.errores.nombre}
                            />
                            {fila.errores.nombre && (
                              <p className="text-xs text-destructive">{fila.errores.nombre}</p>
                            )}
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Teléfono</Label>
                            <Input
                              disabled={guardando}
                              value={fila.destino.telefono}
                              onChange={(e) =>
                                actualizarFila(fila.id, {
                                  destino: { ...fila.destino, telefono: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Calle</Label>
                            <Input
                              disabled={guardando}
                              value={fila.destino.calle}
                              onChange={(e) =>
                                actualizarFila(fila.id, {
                                  destino: { ...fila.destino, calle: e.target.value },
                                })
                              }
                              aria-invalid={!!fila.errores.calle}
                            />
                            {fila.errores.calle && (
                              <p className="text-xs text-destructive">{fila.errores.calle}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1.5">
                              <Label className="text-xs text-muted-foreground">Número</Label>
                              <Input
                                disabled={guardando}
                                value={fila.destino.numero}
                                onChange={(e) =>
                                  actualizarFila(fila.id, {
                                    destino: { ...fila.destino, numero: e.target.value },
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label className="text-xs text-muted-foreground">Piso/Depto</Label>
                              <Input
                                disabled={guardando}
                                value={fila.destino.piso}
                                onChange={(e) =>
                                  actualizarFila(fila.id, {
                                    destino: { ...fila.destino, piso: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Referencia</Label>
                            <Input
                              disabled={guardando}
                              value={fila.destino.referencia}
                              onChange={(e) =>
                                actualizarFila(fila.id, {
                                  destino: { ...fila.destino, referencia: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <LocalidadSectorSelect
                              idPrefix={`fila-${fila.id}`}
                              localidades={localidades}
                              sectores={sectores}
                              localidadId={fila.destino.localidadId}
                              sectorId={fila.destino.sectorId}
                              onChangeLocalidad={(id) => {
                                const primerSector =
                                  sectores.find((s) => s.localidadId === id)?.id ?? "";
                                actualizarFila(fila.id, {
                                  destino: {
                                    ...fila.destino,
                                    localidadId: id,
                                    sectorId: primerSector,
                                    clienteId: undefined,
                                    domicilioId: undefined,
                                  },
                                });
                              }}
                              onChangeSector={(id) =>
                                actualizarFila(fila.id, {
                                  destino: { ...fila.destino, sectorId: id },
                                })
                              }
                            />
                            {(fila.errores.localidad || fila.errores.sector) && (
                              <p className="mt-1 text-xs text-destructive">
                                {fila.errores.localidad || fila.errores.sector}
                              </p>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Tipo</Label>
                            <Select
                              disabled={guardando}
                              value={fila.tipo}
                              onValueChange={(v) =>
                                actualizarFila(fila.id, { tipo: v as TipoEnvioApi })
                              }
                            >
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
                            <Label className="text-xs text-muted-foreground">Flete ($)</Label>
                            <Input
                              disabled={guardando}
                              type="text"
                              inputMode="decimal"
                              value={fila.flete}
                              onChange={(e) => {
                                const cleaned = sanitizeMoneyInput(e.target.value);
                                actualizarFila(fila.id, {
                                  flete: cleaned === "" ? "" : Math.max(0, Number(cleaned)),
                                });
                              }}
                              aria-invalid={!!fila.errores.flete}
                            />
                            {fila.errores.flete && (
                              <p className="text-xs text-destructive">{fila.errores.flete}</p>
                            )}
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Se paga en</Label>
                            <Select
                              disabled={guardando}
                              value={fila.lugarPago}
                              onValueChange={(v) =>
                                actualizarFila(fila.id, { lugarPago: v as LugarPagoApi })
                              }
                            >
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
                            <Select
                              disabled={guardando}
                              value={fila.formaPago}
                              onValueChange={(v) =>
                                actualizarFila(fila.id, { formaPago: v as FormaPagoApi })
                              }
                            >
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
                            <Label className="text-xs text-muted-foreground">Bultos</Label>
                            <Input
                              disabled={guardando}
                              type="text"
                              inputMode="numeric"
                              value={fila.bultos}
                              onChange={(e) => {
                                const cleaned = sanitizeIntegerInput(e.target.value);
                                actualizarFila(fila.id, {
                                  bultos: cleaned === "" ? 1 : Math.max(1, Number(cleaned)),
                                });
                              }}
                              aria-invalid={!!fila.errores.bultos}
                            />
                            {fila.errores.bultos && (
                              <p className="text-xs text-destructive">{fila.errores.bultos}</p>
                            )}
                          </div>
                        </div>

                        {fila.tipo === "efectivo" && (
                          <div className="grid gap-1.5 sm:w-1/3">
                            <Label className="text-xs text-muted-foreground">
                              Monto a reembolsar
                            </Label>
                            <Input
                              disabled={guardando}
                              type="text"
                              inputMode="decimal"
                              value={fila.montoCrr}
                              onChange={(e) => {
                                const cleaned = sanitizeMoneyInput(e.target.value);
                                actualizarFila(fila.id, {
                                  montoCrr: cleaned === "" ? "" : Math.max(0, Number(cleaned)),
                                });
                              }}
                              aria-invalid={!!fila.errores.montoCrr}
                            />
                            {fila.errores.montoCrr && (
                              <p className="text-xs text-destructive">{fila.errores.montoCrr}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={guardando}
                            onClick={() => quitarFila(fila.id)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            disabled={guardando}
                            onClick={() => guardarFila(fila.id)}
                          >
                            {guardando && <Loader2 className="size-3.5 animate-spin" />}
                            Guardar destino
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filas.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                    <span className="text-xs text-muted-foreground">
                      {filas.length} destino{filas.length === 1 ? "" : "s"} · {cargadosCount}{" "}
                      cargado{cargadosCount === 1 ? "" : "s"}
                      {erroresCount > 0 &&
                        ` · ${erroresCount} con error${erroresCount === 1 ? "" : "es"}`}
                    </span>
                    <Button type="button" onClick={terminarCargaRapida}>
                      Terminar carga rápida
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
      </div>
    </div>
  );
}
