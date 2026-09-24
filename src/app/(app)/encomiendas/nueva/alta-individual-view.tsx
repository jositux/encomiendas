"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackagePlus, Truck, UserPlus2 } from "lucide-react";

import { ClienteSearchInput } from "@/components/shared/cliente-search-input";
import {
  bultosSchema,
  montoNoNegativoSchema,
  montoPositivoSchema,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
} from "@/lib/validation";
import { Card, CardContent } from "@/components/ui/card";
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
  TipoEnvioApi,
  LugarPagoApi,
  FormaPagoApi,
} from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";
import type { LocalidadBackend, SesionUsuario } from "@/types";

import {
  TIPOS,
  LUGARES_PAGO,
  FORMAS_PAGO,
  emptyOrigen,
  emptyDestino,
  guiaDeEnvio,
  type OrigenState,
  type DestinoState,
} from "./nueva-view.helpers";

// Extraído de nueva-view.tsx (paso 2b de la división — ver el paso 2a en
// carga-rapida-view.tsx y el análisis de la conversación del 2026-09-24).
// `origen` y `destino` se quedan como estado del padre (NuevaEncomiendaView)
// en vez de vivir acá: el diálogo de alta rápida de cliente y
// handleClienteAltaRapida son compartidos de verdad (un solo diálogo para
// origen y destino, ver NOTA-2026-09-22-01 en nueva-view.tsx) y necesitan
// poder escribir en los dos, así que moverlos hubiera significado inventar
// un mecanismo nuevo solo para este caso — más riesgo a cambio de nada.
// Todo lo demás (tipo/lugarPago/formaPago/bultos/flete/montoCrr/
// remitoManual/valorDeclarado/gasto/observaciones/errors/submitting y
// validate/resetForm/handleSubmit) es exclusivo de Individual y vive acá.
export function AltaIndividualView({
  origen,
  setOrigen,
  destino,
  setDestino,
  setAltaRapidaBloque,
  setCargados,
  session,
  localidades,
  sectores,
}: {
  origen: OrigenState;
  setOrigen: React.Dispatch<React.SetStateAction<OrigenState>>;
  destino: DestinoState;
  setDestino: React.Dispatch<React.SetStateAction<DestinoState>>;
  setAltaRapidaBloque: React.Dispatch<React.SetStateAction<"origen" | "destino" | null>>;
  setCargados: React.Dispatch<React.SetStateAction<EnvioApi[]>>;
  session: SesionUsuario | null;
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
}) {
  const [tipo, setTipo] = React.useState<TipoEnvioApi>("paqueteria");
  const [lugarPago, setLugarPago] = React.useState<LugarPagoApi>("destino");
  const [formaPago, setFormaPago] = React.useState<FormaPagoApi>("contado");
  const [bultos, setBultos] = React.useState(1);
  const [flete, setFlete] = React.useState<number | "">("");
  const [montoCrr, setMontoCrr] = React.useState<number | "">("");
  const [remitoManual, setRemitoManual] = React.useState("");
  // Protocolo cc-relay, NOTA-2026-09-21-01 (REQ-RM-10/11): ref al input para
  // poner el foco ahi cuando el backend rechaza por REMITO_EN_USO, y uuid de
  // reintento que se mantiene fijo entre envios rechazados (se limpia recien
  // en resetForm, es decir tras un alta con exito) para que un reintento
  // corrigiendo el remito sea idempotente de punta a punta.
  const remitoInputRef = React.useRef<HTMLInputElement>(null);
  const clientUuidRef = React.useRef<string | null>(null);
  const clientUuid = React.useCallback(() => {
    if (!clientUuidRef.current) {
      clientUuidRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    }
    return clientUuidRef.current;
  }, []);
  // Correccion de agent-back en el hilo de NOTA-2026-09-21-01 (6 min despues
  // de la spec original) + [CONTRATO] CONTRATO-2026-09-21-01: remitoManual
  // es SOLO digitos (1 a 6), no texto libre como decia la spec original.
  // REQ-RM-06 revisado + REQ-RM-15: hay que rellenar con ceros a la
  // izquierda hasta 6 digitos ANTES de mandarlo — si no, "123" y "000123"
  // quedan como dos filas distintas para el UNIQUE del backend y dos
  // operadores podrian cargar el mismo papel sin chocar.
  function remitoNormalizado(): string | undefined {
    const digitos = remitoManual.trim();
    return digitos ? digitos.padStart(6, "0") : undefined;
  }
  const [valorDeclarado, setValorDeclarado] = React.useState<number | "">("");
  const [gasto, setGasto] = React.useState<number | "">("");
  const [observaciones, setObservaciones] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  function validate() {
    const next: Record<string, string> = {};
    if (!origen.nombre.trim()) next.origenNombre = "Ingresá el remitente.";
    if (!destino.nombre.trim()) next.destinoNombre = "Ingresá el destinatario.";
    if (!destino.calle.trim()) next.destinoCalle = "Ingresá la calle de destino.";
    if (!destino.localidadId) next.destinoLocalidad = "Elegí la localidad de destino.";
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
    clientUuidRef.current = null;
    setValorDeclarado("");
    setGasto("");
    setObservaciones("");
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
          calle: origen.calle.trim() || undefined,
          numero: origen.numero.trim() || undefined,
          piso: origen.piso.trim() || undefined,
          referencia: origen.referencia.trim() || undefined,
          localidadId: origen.localidadId || undefined,
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
        remitoManualNumero: remitoNormalizado(),
        valorDeclarado: valorDeclarado === "" ? undefined : Number(valorDeclarado),
        gasto: gasto === "" ? undefined : Number(gasto),
        observaciones: observaciones.trim() || undefined,
      };
      const resultado = await crearEnvioAction(data, clientUuid());
      if (!resultado.ok) {
        // Rechazo de negocio del backend (ej. "no hay servicio_par" para ese
        // origen/destino) — no es una excepción real, se muestra el título
        // real que ya manda el backend en vez de dejar el formulario roto.
        // REMITO_EN_USO (protocolo cc-relay, NOTA-2026-09-21-01, REQ-RM-10)
        // se marca en el campo puntual y se le pone el foco ahí; cualquier
        // otro rechazo (incl. YA_EXISTE, REQ-RM-12) sigue yendo solo al
        // toast, sin tocar remitoManual.
        if (resultado.code === "REMITO_EN_USO") {
          setErrors((prev) => ({ ...prev, remitoManual: resultado.title }));
          remitoInputRef.current?.focus();
        }
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

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-1.5">
            <Label htmlFor="remito-manual" className="text-xs text-muted-foreground">
              Remito N°
            </Label>
            <Input
              id="remito-manual"
              ref={remitoInputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456 (opcional)"
              value={remitoManual}
              onChange={(e) => {
                // REQ-RM-03/REQ-RM-14 (corregidos): solo digitos, hasta
                // 6 — mejor volver el error imposible que detectarlo.
                setRemitoManual(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (errors.remitoManual) {
                  setErrors((prev) => ({ ...prev, remitoManual: "" }));
                }
              }}
              aria-invalid={!!errors.remitoManual}
            />
            {/* REQ-RM-04: ayuda mientras esta vacio — el numero del
                sistema no se puede previsualizar, lo asigna la base
                recien dentro de la transaccion del alta. */}
            <p className="text-xs text-muted-foreground">
              {remitoManual
                ? "Se completa con ceros a la izquierda hasta 6 dígitos al guardar."
                : "Automático al guardar si lo dejás vacío. Solo números, hasta 6 dígitos."}
            </p>
            {errors.remitoManual && (
              <p className="text-xs text-destructive">{errors.remitoManual}</p>
            )}
          </div>

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
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <ClienteSearchInput
                      id="origen-nombre"
                      value={origen.nombre}
                      onChange={(v) =>
                        setOrigen({ ...origen, nombre: v, clienteId: undefined })
                      }
                      onSelectCliente={(c) =>
                        setOrigen({
                          nombre: c.nombre,
                          telefono: c.telefono,
                          clienteId: c.id,
                          calle: c.calle ?? "",
                          numero: c.numero ?? "",
                          piso: c.piso ?? "",
                          referencia: c.referencia ?? "",
                          localidadId: c.localidadId ?? origen.localidadId,
                        })
                      }
                      placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                      ariaInvalid={!!errors.origenNombre}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Alta rápida de cliente"
                    aria-label="Alta rápida de cliente para el origen"
                    onClick={() => setAltaRapidaBloque("origen")}
                  >
                    <UserPlus2 className="size-4" />
                  </Button>
                </div>
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

            {/* Domicilio de origen — opcional (changelog 2026-09-15): antes
                del alta no existía forma de cargarlo, así que sigue sin ser
                obligatorio para no romper el flujo cuando el remitente es
                simplemente "el mostrador" y no hace falta domicilio propio. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="origen-calle" className="text-xs text-muted-foreground">
                  Calle (opcional)
                </Label>
                <Input
                  id="origen-calle"
                  value={origen.calle}
                  onChange={(e) => setOrigen({ ...origen, calle: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="origen-numero" className="text-xs text-muted-foreground">
                    Número
                  </Label>
                  <Input
                    id="origen-numero"
                    value={origen.numero}
                    onChange={(e) => setOrigen({ ...origen, numero: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="origen-piso" className="text-xs text-muted-foreground">
                    Piso/Depto
                  </Label>
                  <Input
                    id="origen-piso"
                    value={origen.piso}
                    onChange={(e) => setOrigen({ ...origen, piso: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="origen-referencia" className="text-xs text-muted-foreground">
                  Referencia (opcional)
                </Label>
                <Input
                  id="origen-referencia"
                  value={origen.referencia}
                  onChange={(e) => setOrigen({ ...origen, referencia: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 grid gap-1.5">
                <Label htmlFor="origen-localidad" className="text-xs text-muted-foreground">
                  Localidad de origen (opcional)
                </Label>
                <Select
                  value={origen.localidadId}
                  onValueChange={(id) => setOrigen({ ...origen, localidadId: id })}
                >
                  <SelectTrigger id="origen-localidad" className="w-full">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    {localidades.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
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
                        setDestino({
                          nombre: c.nombre,
                          telefono: c.telefono,
                          calle: c.calle ?? "",
                          numero: c.numero ?? "",
                          piso: c.piso ?? "",
                          referencia: c.referencia ?? "",
                          localidadId: c.localidadId ?? destino.localidadId,
                          sectorId: c.sectorId ?? destino.sectorId,
                          clienteId: c.id,
                        });
                      }}
                      placeholder="Nombre — buscá por nombre o cargá uno nuevo"
                      ariaInvalid={!!errors.destinoNombre}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Alta rápida de cliente"
                    aria-label="Alta rápida de cliente para el destino"
                    onClick={() => setAltaRapidaBloque("destino")}
                  >
                    <UserPlus2 className="size-4" />
                  </Button>
                </div>
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
              <div className="sm:col-span-2 grid gap-1.5">
                <Label htmlFor="destino-localidad" className="text-xs text-muted-foreground">
                  Localidad
                </Label>
                <Select
                  value={destino.localidadId}
                  onValueChange={(id) => {
                    const primerSector = sectores.find((s) => s.localidadId === id)?.id ?? "";
                    setDestino({
                      ...destino,
                      localidadId: id,
                      sectorId: primerSector,
                      clienteId: undefined,
                      domicilioId: undefined,
                    });
                  }}
                >
                  <SelectTrigger id="destino-localidad" className="w-full">
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
                {errors.destinoLocalidad && (
                  <p className="mt-1 text-xs text-destructive">{errors.destinoLocalidad}</p>
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

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Campos nuevos del changelog 2026-09-15, opcionales. "gasto"
              mantiene el nombre viejo del backend — en la práctica es el
              monto cobrado por billetera virtual/digital. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="valor-declarado" className="text-xs text-muted-foreground">
                Valor declarado ($, opcional)
              </Label>
              <Input
                id="valor-declarado"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={valorDeclarado}
                onChange={(e) => {
                  const cleaned = sanitizeMoneyInput(e.target.value);
                  setValorDeclarado(cleaned === "" ? "" : Math.max(0, Number(cleaned)));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gasto" className="text-xs text-muted-foreground">
                Pago con billetera/digital ($, opcional)
              </Label>
              <Input
                id="gasto"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={gasto}
                onChange={(e) => {
                  const cleaned = sanitizeMoneyInput(e.target.value);
                  setGasto(cleaned === "" ? "" : Math.max(0, Number(cleaned)));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="observaciones" className="text-xs text-muted-foreground">
                Observaciones / contenido (opcional)
              </Label>
              <Input
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
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
  );
}
