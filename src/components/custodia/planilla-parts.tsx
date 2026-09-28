"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Truck,
  PackageCheck,
  Loader2,
  Search,
  CircleX,
  TriangleAlert,
  ClipboardList,
  QrCode,
} from "lucide-react";

import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cargarPlanillaAction,
  recibirPlanillaAction,
  entregarEnvioAction,
  registrarIntentoFallidoAction,
  registrarIncidenciaAction,
} from "@/server/actions";
import type { PlanillaApi, EnvioDePlanillaApi } from "@/server/services/custodia";

// NOTA-2026-09-28-03: piezas de UI de "planilla" (buscar por código,
// detalle con Cargar/Recibir, y las acciones por envío -- Entregar/Intento
// fallido/Incidencia) compartidas entre /chofer (rol chofer, sin cambios
// de comportamiento, solo el renombre "Buscar planilla") y la pantalla
// nueva /planillas (rol operador). Extraído de chofer-view.tsx tal cual
// estaba, para no duplicar esta lógica entre las dos pantallas.

export type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

export function guiaCorta(numero: string): string {
  return numero.replace(/^0+/, "") || numero;
}

// Un envío deja de aparecer en `planilla.envios` apenas la planilla pasa a
// "recibida" (confirmado en vivo, ver nota en el service de custodia) — a
// partir de ahí solo se lo puede volver a ubicar por número/guía, igual
// que en Seguimiento. Los buscadores de envío suelto (BuscadorEnvioSuelto
// en chofer-view.tsx, RecepcionView en recepcion-view.tsx) cubren ese caso
// convirtiendo el EnvioApi encontrado a esta forma más chica, para poder
// reusar EnvioDePlanillaRow de acá.
export function envioApiComoFilaDePlanilla(envio: {
  id: string;
  numero: string;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioCalle: string;
  destinatarioNumero: string | null;
  destinatarioPiso: string | null;
  destinatarioReferencia: string | null;
  cantidadBultos: number;
  tipo: string;
  lugarPago: string;
  formaPago: string;
  fleteImporte: string;
}): EnvioDePlanillaApi {
  return {
    id: envio.id,
    numero: envio.numero,
    destinatarioNombre: envio.destinatarioNombre,
    destinatarioTelefono: envio.destinatarioTelefono,
    destinatarioCalle: envio.destinatarioCalle,
    destinatarioNumero: envio.destinatarioNumero,
    destinatarioPiso: envio.destinatarioPiso,
    destinatarioReferencia: envio.destinatarioReferencia,
    cantidadBultos: envio.cantidadBultos,
    tipo: envio.tipo,
    lugarPago: envio.lugarPago,
    formaPago: envio.formaPago,
    fleteImporte: envio.fleteImporte,
  };
}

export function BuscadorPlanillaPorCodigo({
  onBuscar,
}: {
  onBuscar: (codigo: string) => Promise<boolean>;
}) {
  const [codigo, setCodigo] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  async function buscar(valorOverride?: string) {
    const texto = (valorOverride ?? codigo).trim();
    if (!texto) return;
    setBuscando(true);
    try {
      await onBuscar(texto);
    } finally {
      setBuscando(false);
    }
  }

  // El valor leído por cámara se usa directo (no se espera a que `codigo`
  // se actualice) para no depender del timing de la actualización de
  // estado de React -- mismo criterio que ya usa handleScan en los otros
  // buscadores por código.
  function handleScan(valor: string) {
    setScannerOpen(false);
    setCodigo(valor);
    buscar(valor);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div>
          {/* NOTA-2026-09-28-03: "Buscar planilla por código" -> "Buscar
              planilla" (solo el título, el comportamiento no cambia). */}
          <h3 className="font-semibold">Buscar planilla</h3>
          <p className="text-sm text-muted-foreground">
            Escaneá el QR o escribí el código corto de la planilla (ej. &quot;TAUDR7&quot;) para
            cargarla, recibirla, o entregar/marcar intento/incidencia de sus envíos.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: TAUDR7"
            className="font-mono"
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear código QR de la planilla"
            title="Escanear código QR"
          >
            <QrCode className="size-4" />
          </Button>
          <Button onClick={() => buscar()} disabled={buscando || !codigo.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
      </CardContent>
      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title="Escanear planilla"
        description="Apuntá la cámara al QR de la planilla."
      />
    </Card>
  );
}

export function PlanillaDetalle({
  planilla,
  onRefrescar,
  permisos,
}: {
  planilla: PlanillaApi;
  onRefrescar: () => Promise<void>;
  permisos: string[];
}) {
  const [enviando, setEnviando] = React.useState<"carga" | "recepcion" | null>(null);
  // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): Cargar y
  // Recibir planilla van los dos contra `POST /custodia/recepcion`, que
  // exige `custodia:registrar`. Si el usuario no lo tiene, no se muestran
  // los botones en vez de dejarlos habilitados para que fallen al
  // clickear — mismo criterio que ya se usó para ocultar el ítem "Chofer"
  // del menú cuando falta el permiso correspondiente.
  const puedeCustodia = permisos.includes("custodia:registrar");
  // 2026-09-17 (sección 27 del plan): confirmado en vivo contra el backend
  // real que una planilla en estado "recibida" NO admite un nuevo acto de
  // tipo "carga" (400: "una planilla en recibida no admite un acto de tipo
  // carga") — probamos con TAUDR7/chofer_obera. No tiene sentido dejar
  // "Cargar planilla" ni "Recibir planilla" clickeables sobre una planilla
  // ya recibida (el segundo botón fallaría por la misma razón, aunque eso
  // no se confirmó todavía en vivo). El backend no expone más estados
  // documentados todavía, así que por ahora solo se bloquea este caso
  // confirmado en vez de adivinar el resto del enum de `estado`.
  const yaRecibida = planilla.estado === "recibida";

  async function ejecutar(fn: () => Promise<AccionResultado>, exito: string, cual: "carga" | "recepcion") {
    setEnviando(cual);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(exito);
        await onRefrescar();
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <ClipboardList className="size-4" />
              Planilla {planilla.codigoCorto}
            </h3>
            <p className="text-sm text-muted-foreground">
              Destino: {planilla.localidadDestinoNombre} · {planilla.sectorDestinoNombre} · Estado: {planilla.estado}
            </p>
          </div>
          {puedeCustodia && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={enviando !== null || yaRecibida}
                title={yaRecibida ? "Esta planilla ya fue recibida" : undefined}
                onClick={() =>
                  ejecutar(
                    () => cargarPlanillaAction(planilla.codigoCorto),
                    "Planilla cargada",
                    "carga"
                  )
                }
              >
                {enviando === "carga" ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                Cargar planilla
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={enviando !== null || yaRecibida}
                title={yaRecibida ? "Esta planilla ya fue recibida" : undefined}
                onClick={() =>
                  ejecutar(
                    () => recibirPlanillaAction(planilla.codigoCorto),
                    "Planilla recibida",
                    "recepcion"
                  )
                }
              >
                {enviando === "recepcion" ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                Recibir planilla
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          {planilla.envios.map((e) => (
            <EnvioDePlanillaRow key={e.id} envio={e} onRefrescar={onRefrescar} permisos={permisos} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type DialogoAccion = null | "entregar" | "intento" | "incidencia";

export function EnvioDePlanillaRow({
  envio,
  onRefrescar,
  permisos,
}: {
  envio: EnvioDePlanillaApi;
  onRefrescar: () => Promise<void>;
  permisos: string[];
}) {
  const [dialogo, setDialogo] = React.useState<DialogoAccion>(null);
  // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): Entregar,
  // Intento fallido e Incidencia van los tres contra el mismo permiso
  // `entregas:registrar` (confirmado en vivo — los tres devuelven el mismo
  // 403 real cuando falta). Si el usuario no lo tiene, no se muestran los
  // botones en vez de dejarlos habilitados para que fallen al clickear.
  // NOTA-2026-09-28-03: esto es justo lo que hace que el operador (sin
  // `entregas:registrar`) no vea estos 3 botones ni en /chofer ni en la
  // nueva /planillas -- "igual que hoy", como pide la nota.
  const puedeEntregar = permisos.includes("entregas:registrar");
  const [enviando, setEnviando] = React.useState(false);
  const [recibidoPor, setRecibidoPor] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [observacion, setObservacion] = React.useState("");
  const [motivo, setMotivo] = React.useState("");

  function cerrar() {
    setDialogo(null);
    setRecibidoPor("");
    setDocumento("");
    setObservacion("");
    setMotivo("");
  }

  async function ejecutar(fn: () => Promise<AccionResultado>, exito: string) {
    setEnviando(true);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(exito);
        cerrar();
        await onRefrescar();
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="font-mono text-sm font-semibold">#{guiaCorta(envio.numero)}</p>
        <p className="text-sm">{envio.destinatarioNombre}</p>
        <p className="text-xs text-muted-foreground">
          {envio.destinatarioCalle} {envio.destinatarioNumero ?? ""} · {envio.destinatarioTelefono}
        </p>
        {/* NOTA-2026-09-23-07: el chofer toma custodia de N bultos, no de
            "un paquete" — sin este numero no puede contar contra lo que
            tiene en la mano. El dato ya viaja en la ficha del envio (no
            hizo falta nada del backend), asi que se muestra siempre, junto
            al numero y al destinatario (tambien cuando es 1, a proposito:
            no se esconde por ser singular). */}
        <p className="text-xs text-muted-foreground">
          {envio.cantidadBultos} bulto{envio.cantidadBultos === 1 ? "" : "s"}
        </p>
      </div>
      {puedeEntregar && (
        // BUG real visto en vivo en /chofer-minimal (2026-09-24, celular
        // real, ancho angosto): sin flex-wrap acá, cuando esta fila pasa a
        // su propia línea (el flex-wrap del contenedor de arriba ya hace
        // eso), los 3 botones seguían todos en una sola fila y "Incidencia"
        // quedaba cortado fuera de la pantalla en vez de acomodarse. Con
        // flex-wrap acá también, se acomodan en 2 líneas si no entran.
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setDialogo("entregar")}>
            <PackageCheck className="size-4" />
            Entregar
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogo("intento")}>
            <CircleX className="size-4" />
            Intento fallido
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setDialogo("incidencia")}>
            <TriangleAlert className="size-4" />
            Incidencia
          </Button>
        </div>
      )}

      <Dialog open={dialogo === "entregar"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>Envío #{guiaCorta(envio.numero)} — {envio.destinatarioNombre}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="recibido-por">Recibido por</Label>
              <Input id="recibido-por" value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="documento-entrega">Documento</Label>
              <Input id="documento-entrega" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="observacion-entrega">Observación</Label>
              <Textarea id="observacion-entrega" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando}
              onClick={() =>
                ejecutar(
                  () =>
                    entregarEnvioAction(envio.numero, {
                      recibidoPor: recibidoPor.trim() || undefined,
                      documento: documento.trim() || undefined,
                      observacion: observacion.trim() || undefined,
                    }),
                  "Entrega registrada"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Confirmar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "intento"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar intento fallido</DialogTitle>
            <DialogDescription>Envío #{guiaCorta(envio.numero)} — {envio.destinatarioNombre}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-intento">Motivo</Label>
            <Textarea id="motivo-intento" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando || !motivo.trim()}
              onClick={() =>
                ejecutar(
                  () => registrarIntentoFallidoAction(envio.numero, motivo.trim()),
                  "Intento fallido registrado"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "incidencia"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar incidencia</DialogTitle>
            <DialogDescription>Envío #{guiaCorta(envio.numero)} — {envio.destinatarioNombre}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-incidencia">Motivo / detalle</Label>
            <Textarea id="motivo-incidencia" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={enviando || !motivo.trim()}
              onClick={() =>
                ejecutar(
                  () => registrarIncidenciaAction(envio.numero, { motivo: motivo.trim() }),
                  "Incidencia registrada"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
