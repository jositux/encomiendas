"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  UserPlus2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Phone,
  GripVertical,
  Pencil,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ClienteSearchInput } from "@/components/shared/cliente-search-input";
import { sanitizeIntegerInput, sanitizeMoneyInput } from "@/lib/validation";
import { Card, CardContent } from "@/components/ui/card";
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
import { crearEnvioAction, actualizarEnvioAction } from "@/server/actions";
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
  LUGARES_PAGO_POR_TIPO,
  lugarPagoValido,
  lugarPagoPorDefecto,
  permiteContrarreembolso,
  permiteValorDeclarado,
  permiteGastoYFlete,
  permiteElegirFormaPago,
  emptyOrigen,
  guiaDeEnvio,
  filaEnBlanco,
  filaDuplicada,
  validarFila,
  type OrigenState,
  type FilaDestino,
} from "./nueva-view.helpers";

// Extraído de nueva-view.tsx (paso 2a de la división de ese archivo — ver
// análisis en la conversación del 2026-09-24 y el commit de
// nueva-view.test.tsx, que sirve de red de seguridad para este cambio).
// `origen` es el único estado que este componente comparte de verdad con
// AltaIndividualView (todavía dentro de nueva-view.tsx) — todo lo demás
// (filas, dragId, remitenteConfirmado, y las funciones de abajo) es
// exclusivo de Carga rápida.
export function CargaRapidaView({
  origen,
  setOrigen,
  setAltaRapidaBloque,
  setModo,
  setCargados,
  session,
  localidades,
  sectores,
}: {
  origen: OrigenState;
  setOrigen: React.Dispatch<React.SetStateAction<OrigenState>>;
  setAltaRapidaBloque: React.Dispatch<React.SetStateAction<"origen" | "destino" | null>>;
  setModo: React.Dispatch<React.SetStateAction<"individual" | "rapida">>;
  setCargados: React.Dispatch<React.SetStateAction<EnvioApi[]>>;
  session: SesionUsuario | null;
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
}) {
  const [filas, setFilas] = React.useState<FilaDestino[]>([]);
  // Reordenar destinos de Carga rápida arrastrando (drag & drop nativo, sin
  // librería nueva): dragId guarda qué fila se está arrastrando; al soltar
  // sobre otra fila, esa fila pasa a ocupar el lugar de la fila destino.
  // Puramente visual/organizativo — no cambia nada de lo que ya se guardó.
  const [dragId, setDragId] = React.useState<string | null>(null);
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

  // NOTA-2026-09-23-05: id de la fila que debe recibir el foco apenas se
  // monta — la que se acaba de agregar a mano, o la que se agrega sola
  // después de completar una alta (ver guardarFila).
  const [focoFilaId, setFocoFilaId] = React.useState<string | null>(null);

  function agregarDestino() {
    const nueva = filaEnBlanco(localidades, sectores, filas[filas.length - 1]);
    setFilas((prev) => [...prev, nueva]);
    setFocoFilaId(nueva.id);
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

  function moverFila(sourceId: string, targetId: string) {
    setFilas((prev) => {
      const from = prev.findIndex((f) => f.id === sourceId);
      const to = prev.findIndex((f) => f.id === targetId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [movida] = next.splice(from, 1);
      next.splice(to, 0, movida);
      return next;
    });
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
    // Si esta fila ya tiene un envio guardado (fila.resultado), "Editar" +
    // "Guardar" tiene que CORREGIR ese mismo envio via PATCH, no crear uno
    // nuevo por POST — antes de este cambio, volver a guardar una fila ya
    // guardada dejaba un envio duplicado (ver claude/plan-integracion-backend.md,
    // seccion 14). Se distingue por la presencia de fila.resultado, que solo
    // se setea la primera vez que la fila se guarda con exito.
    const esEdicion = !!fila.resultado;
    try {
      const datosComunes = {
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
        fleteImporte: permiteGastoYFlete(fila.tipo) ? (fila.flete === "" ? 0 : Number(fila.flete)) : 0,
        tipo: fila.tipo,
        lugarPago: fila.lugarPago,
        formaPago: permiteElegirFormaPago(fila.tipo) ? fila.formaPago : "contado",
        contrarreembolsoImporte: permiteContrarreembolso(fila.tipo)
          ? Number(fila.montoCrr)
          : undefined,
        remitoManualNumero: fila.remitoManual.trim() || undefined,
        valorDeclarado:
          permiteValorDeclarado(fila.tipo) && fila.valorDeclarado !== ""
            ? Number(fila.valorDeclarado)
            : undefined,
        gasto: permiteGastoYFlete(fila.tipo) && fila.gasto !== "" ? Number(fila.gasto) : undefined,
        observaciones: fila.observaciones.trim() || undefined,
      };

      const resultado = esEdicion
        ? await actualizarEnvioAction(fila.resultado!.id, datosComunes)
        : await crearEnvioAction(datosComunes as CrearEnvioInput);

      if (!resultado.ok) {
        const msg =
          resultado.code === "REGLA_DE_TIPO"
            ? resultado.message
            : resultado.title || resultado.message;
        actualizarFila(id, { status: "error", errorMsg: msg });
        toast.error(msg);
        return;
      }
      if (esEdicion) {
        setCargados((prev) =>
          prev.map((e) => (e.id === resultado.envio.id ? resultado.envio : e))
        );
        toast.success(`Encomienda ${guiaDeEnvio(resultado.envio)} corregida correctamente`);
      } else {
        setCargados((prev) => [resultado.envio, ...prev]);
        toast.success(`Encomienda ${guiaDeEnvio(resultado.envio)} cargada correctamente`);
      }
      actualizarFila(id, { status: "ok", resultado: resultado.envio, errorMsg: undefined });
      // NOTA-2026-09-23-05: si esta era la última fila pendiente, se agrega
      // sola la próxima y el foco vuelve al campo "Destino" — el operador
      // sigue tipeando el siguiente destino sin clickear "Agregar destino"
      // ni volver a hacer click en el campo.
      if (!esEdicion) {
        const esUltima = filas[filas.length - 1]?.id === id;
        if (esUltima) {
          agregarDestino();
        }
      }
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
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <ClienteSearchInput
                      value={origen.nombre}
                      onChange={(v) => setOrigen({ ...origen, nombre: v, clienteId: undefined })}
                      onSelectCliente={(c) => {
                        setOrigen({
                          nombre: c.nombre,
                          telefono: c.telefono,
                          clienteId: c.id,
                          calle: c.calle ?? "",
                          numero: c.numero ?? "",
                          piso: c.piso ?? "",
                          referencia: c.referencia ?? "",
                          localidadId: c.localidadId ?? origen.localidadId,
                        });
                        setRemitenteConfirmado(true);
                      }}
                      placeholder="Apellido y nombres — buscá por nombre o cargá uno nuevo"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Alta rápida de cliente"
                    aria-label="Alta rápida de cliente para el remitente de la carga"
                    onClick={() => setAltaRapidaBloque("origen")}
                  >
                    <UserPlus2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                <Input
                  value={origen.telefono}
                  onChange={(e) => setOrigen({ ...origen, telefono: e.target.value })}
                />
              </div>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Domicilio de origen (opcional)
              </summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Calle</Label>
                  <Input
                    value={origen.calle}
                    onChange={(e) => setOrigen({ ...origen, calle: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <Input
                      value={origen.numero}
                      onChange={(e) => setOrigen({ ...origen, numero: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Piso/Depto</Label>
                    <Input
                      value={origen.piso}
                      onChange={(e) => setOrigen({ ...origen, piso: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Referencia</Label>
                  <Input
                    value={origen.referencia}
                    onChange={(e) => setOrigen({ ...origen, referencia: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Localidad de origen</Label>
                  <Select
                    value={origen.localidadId}
                    onValueChange={(id) => setOrigen({ ...origen, localidadId: id })}
                  >
                    <SelectTrigger className="w-full">
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
            </details>

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
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    if (dragId) moverFila(dragId, fila.id);
                    setDragId(null);
                  }}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border border-success/30 bg-card p-3.5 shadow-xs transition-opacity",
                    dragId === fila.id && "opacity-40"
                  )}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.effectAllowed = "move";
                      setDragId(fila.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                    aria-label="Arrastrar para reordenar"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-success">
                    #{guiaDeEnvio(e)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{fila.destino.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {localidadNombre(fila.destino.localidadId)}
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
                    onClick={() =>
                      actualizarFila(fila.id, {
                        status: "editando",
                        previo: {
                          destino: fila.destino,
                          tipo: fila.tipo,
                          lugarPago: fila.lugarPago,
                          formaPago: fila.formaPago,
                          bultos: fila.bultos,
                          flete: fila.flete,
                          montoCrr: fila.montoCrr,
                          remitoManual: fila.remitoManual,
                          valorDeclarado: fila.valorDeclarado,
                          gasto: fila.gasto,
                          observaciones: fila.observaciones,
                        },
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
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
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    if (dragId) moverFila(dragId, fila.id);
                    setDragId(null);
                  }}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border border-destructive/35 bg-card p-3.5 shadow-xs transition-opacity",
                    dragId === fila.id && "opacity-40"
                  )}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.effectAllowed = "move";
                      setDragId(fila.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                    aria-label="Arrastrar para reordenar"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {fila.destino.nombre || "Destino sin nombre"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {localidadNombre(fila.destino.localidadId)}
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
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (dragId) moverFila(dragId, fila.id);
                  setDragId(null);
                }}
                className={cn(
                  "border-primary/50 ring-1 ring-primary/50 transition-opacity",
                  dragId === fila.id && "opacity-40"
                )}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      draggable
                      onDragStart={(ev) => {
                        ev.dataTransfer.effectAllowed = "move";
                        setDragId(fila.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                      aria-label="Arrastrar para reordenar"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <p className="text-sm font-semibold">
                      {fila.resultado
                        ? `Corrigiendo envío #${guiaDeEnvio(fila.resultado)}`
                        : "Destino"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Destino</Label>
                      <ClienteSearchInput
                        disabled={guardando}
                        value={fila.destino.nombre}
                        autoFocus={fila.id === focoFilaId}
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
                          actualizarFila(fila.id, {
                            destino: {
                              nombre: c.nombre,
                              telefono: c.telefono,
                              calle: c.calle ?? "",
                              numero: c.numero ?? "",
                              piso: c.piso ?? "",
                              referencia: c.referencia ?? "",
                              localidadId: c.localidadId ?? fila.destino.localidadId,
                              sectorId: c.sectorId ?? fila.destino.sectorId,
                              clienteId: c.id,
                            },
                          });
                        }}
                        placeholder="Apellido y nombres — buscá por nombre o cargá uno nuevo"
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
                    <div className="sm:col-span-2 grid gap-1.5">
                      <Label
                        htmlFor={`fila-${fila.id}-localidad`}
                        className="text-xs text-muted-foreground"
                      >
                        Localidad
                      </Label>
                      <Select
                        disabled={guardando}
                        value={fila.destino.localidadId}
                        onValueChange={(id) => {
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
                      >
                        <SelectTrigger id={`fila-${fila.id}-localidad`} className="w-full">
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
                      {fila.errores.localidad && (
                        <p className="mt-1 text-xs text-destructive">{fila.errores.localidad}</p>
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
                        onValueChange={(v) => {
                          // CONTRATO-2026-09-24-01 (punto 2, Sebastian): al
                          // cambiar el tipo de una fila hay que ajustar todo
                          // lo que dejo de valer para el tipo nuevo -- si no,
                          // el default viejo ("destino") manda un 400
                          // REGLA_DE_TIPO apenas se guarda un trámite o un
                          // interno. Ojo: cada fila nueva hereda tipo/lugar/
                          // forma de la anterior (filaEnBlanco en
                          // nueva-view.helpers.ts), así que sin este ajuste
                          // el error se hubiera propagado a todo el lote.
                          const nuevoTipo = v as TipoEnvioApi;
                          const patch: Partial<FilaDestino> = { tipo: nuevoTipo };
                          if (!lugarPagoValido(nuevoTipo, fila.lugarPago)) {
                            patch.lugarPago = lugarPagoPorDefecto(nuevoTipo);
                          }
                          if (!permiteElegirFormaPago(nuevoTipo)) patch.formaPago = "contado";
                          if (!permiteContrarreembolso(nuevoTipo)) patch.montoCrr = "";
                          if (!permiteValorDeclarado(nuevoTipo)) patch.valorDeclarado = "";
                          if (!permiteGastoYFlete(nuevoTipo)) {
                            patch.flete = "";
                            patch.gasto = "";
                          }
                          actualizarFila(fila.id, patch);
                        }}
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
                    {/* CONTRATO-2026-09-24-01 (punto 2): flete es
                        "prohibido" (= 0) para "interno". */}
                    {permiteGastoYFlete(fila.tipo) && (
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
                    )}
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Se paga en</Label>
                      {/* Solo se ofrecen los lugarPago validos para el tipo
                          de esta fila (CONTRATO-2026-09-24-01, punto 2). */}
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
                          {LUGARES_PAGO.filter((l) =>
                            LUGARES_PAGO_POR_TIPO[fila.tipo].includes(l.value)
                          ).map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Forma de pago</Label>
                      {/* "interno" va siempre por contado
                          (CONTRATO-2026-09-24-01, punto 2). */}
                      <Select
                        disabled={guardando || !permiteElegirFormaPago(fila.tipo)}
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

                  {permiteContrarreembolso(fila.tipo) && (
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

                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Más datos (opcional)
                    </summary>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {/* CONTRATO-2026-09-24-01 (punto 2): valor declarado
                          solo vale para "paqueteria". */}
                      {permiteValorDeclarado(fila.tipo) && (
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Valor declarado ($)
                          </Label>
                          <Input
                            disabled={guardando}
                            type="text"
                            inputMode="decimal"
                            value={fila.valorDeclarado}
                            onChange={(e) => {
                              const cleaned = sanitizeMoneyInput(e.target.value);
                              actualizarFila(fila.id, {
                                valorDeclarado: cleaned === "" ? "" : Math.max(0, Number(cleaned)),
                              });
                            }}
                          />
                        </div>
                      )}
                      {/* gasto es "prohibido" (= 0) para "interno". */}
                      {permiteGastoYFlete(fila.tipo) && (
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Pago billetera/digital ($)
                          </Label>
                          <Input
                            disabled={guardando}
                            type="text"
                            inputMode="decimal"
                            value={fila.gasto}
                            onChange={(e) => {
                              const cleaned = sanitizeMoneyInput(e.target.value);
                              actualizarFila(fila.id, {
                                gasto: cleaned === "" ? "" : Math.max(0, Number(cleaned)),
                              });
                            }}
                          />
                        </div>
                      )}
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Observaciones / contenido
                        </Label>
                        <Input
                          disabled={guardando}
                          value={fila.observaciones}
                          onChange={(e) =>
                            actualizarFila(fila.id, { observaciones: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </details>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={guardando}
                      onClick={() => {
                        if (fila.resultado && fila.previo) {
                          // Ya estaba guardada: "Cancelar" descarta los
                          // cambios sin enviar y vuelve a la tarjeta
                          // verde, no borra el envío (que sigue
                          // existiendo en el backend).
                          actualizarFila(fila.id, {
                            ...fila.previo,
                            status: "ok",
                            previo: undefined,
                            errores: {},
                          });
                        } else {
                          quitarFila(fila.id);
                        }
                      }}
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
                      {fila.resultado ? "Guardar corrección" : "Guardar destino"}
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
  );
}
