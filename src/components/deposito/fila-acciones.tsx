"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PackageCheck,
  CircleX,
  TriangleAlert,
  Ban,
  Pencil,
  ArrowRightLeft,
  CheckCircle2,
  Truck,
  Undo2,
  Loader2,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  entregarEnvioAction,
  registrarIntentoFallidoAction,
  registrarIncidenciaAction,
  anularEnvioAction,
  corregirSectorEnvioAction,
  moverEnvioDePlanillaAction,
  confirmarEnvioAction,
  confirmarEnvioConEntregaAction,
  revertirEntregaEnvioAction,
} from "@/server/actions";
import type { EnvioApi } from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";
import type { UsuarioApi } from "@/server/services/usuarios";

// Las 9 acciones del contrato de Depósito (sección 35 del plan): las 3 "de
// calle" (Entregar/Intento fallido/Incidencia, mismo permiso
// `entregas:registrar`, mismo body que ya usa /chofer) más las 6 "de
// oficina" (Anular/Corregir sector/Mover/Confirmar/Confirmar con
// entrega/Revertir, mismos permisos ya confirmados en vivo que usa
// /seguimiento). Construido de cero para esta pantalla (no se reusó el
// componente equivalente de seguimiento-view.tsx) para no arriesgar esa
// pantalla ya verificada — mismos endpoints/DTOs/permisos, código propio.
//
// Regla del contrato: "la tenencia no es un permiso" — si el usuario no
// tiene el envío en la mano, el backend responde 409, no 403. Esta UI no
// intenta adivinar tenencia: muestra el botón si el ESTADO lo permite, y
// deja que el mensaje real del backend (sea 403 o 409) aparezca tal cual
// en el toast si la acción no procede.
type AccionKey =
  | null
  | "entregar"
  | "intento"
  | "incidencia"
  | "anular"
  | "corregir_sector"
  | "mover"
  | "confirmar"
  | "confirmar_entrega"
  | "revertir";

type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

export function FilaAcciones({
  envio,
  sectores,
  usuarios,
  permisos,
  onRefrescar,
}: {
  envio: EnvioApi;
  sectores: SectorApi[];
  usuarios: UsuarioApi[];
  permisos: string[];
  onRefrescar: () => void | Promise<void>;
}) {
  const [dialogo, setDialogo] = React.useState<AccionKey>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [sectorId, setSectorId] = React.useState("");
  const [choferId, setChoferId] = React.useState("");
  const [recibidoPor, setRecibidoPor] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [observacion, setObservacion] = React.useState("");

  // "De calle" — mismo permiso y misma condición que ya usa
  // EnvioDePlanillaRow en /chofer (entregas:registrar, EN_CUSTODIA).
  const puedeEntregar =
    envio.estadoActual === "EN_CUSTODIA" && permisos.includes("entregas:registrar");

  // "De oficina" — mismos permisos/condiciones ya confirmados en vivo en
  // AccionesEnvio de /seguimiento.
  const puedeAnular =
    (envio.estadoActual === "REGISTRADO" || envio.estadoActual === "EN_CUSTODIA") &&
    envio.ubicacion !== "en_reparto" &&
    envio.ubicacion !== "en_transito" &&
    permisos.includes("envios:anular");

  const puedeCorregirSector =
    envio.estadoActual === "REGISTRADO" && permisos.includes("envios:corregir_sector");

  const puedeMover =
    envio.estadoActual === "EN_CUSTODIA" &&
    !!envio.planillaActualId &&
    permisos.includes("envios:mover_de_planilla");

  const puedeConfirmar =
    envio.estadoActual === "ENTREGADO" && permisos.includes("confirmaciones:confirmar");

  const puedeConfirmarConEntrega =
    envio.estadoActual === "EN_CUSTODIA" &&
    envio.ubicacion === "en_reparto" &&
    permisos.includes("confirmaciones:confirmar_con_entrega");

  const puedeRevertir =
    envio.estadoActual === "ENTREGADO" && permisos.includes("entregas:revertir");

  const sectoresDestino = sectores.filter(
    (s) => s.localidadId === envio.localidadDestinoId && s.id !== envio.sectorDestinoId
  );

  const hayAcciones =
    puedeEntregar ||
    puedeAnular ||
    puedeCorregirSector ||
    puedeMover ||
    puedeConfirmar ||
    puedeConfirmarConEntrega ||
    puedeRevertir;

  function cerrar() {
    setDialogo(null);
    setMotivo("");
    setSectorId("");
    setChoferId("");
    setRecibidoPor("");
    setDocumento("");
    setObservacion("");
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

  if (!hayAcciones) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {puedeEntregar && (
          <>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogo("entregar")}>
              <PackageCheck className="size-3.5" /> Entregar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogo("intento")}>
              <CircleX className="size-3.5" /> Intento fallido
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive"
              onClick={() => setDialogo("incidencia")}
            >
              <TriangleAlert className="size-3.5" /> Incidencia
            </Button>
          </>
        )}
        {puedeConfirmar && (
          <Button size="sm" className="gap-1.5" onClick={() => setDialogo("confirmar")}>
            <CheckCircle2 className="size-3.5" /> Confirmar
          </Button>
        )}
        {puedeConfirmarConEntrega && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogo("confirmar_entrega")}>
            <Truck className="size-3.5" /> Entregar y confirmar
          </Button>
        )}
        {puedeRevertir && (
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setDialogo("revertir")}>
            <Undo2 className="size-3.5" /> Revertir
          </Button>
        )}
        {puedeCorregirSector && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogo("corregir_sector")}>
            <Pencil className="size-3.5" /> Corregir sector
          </Button>
        )}
        {puedeMover && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogo("mover")}>
            <ArrowRightLeft className="size-3.5" /> Mover
          </Button>
        )}
        {puedeAnular && (
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setDialogo("anular")}>
            <Ban className="size-3.5" /> Anular
          </Button>
        )}
      </div>

      <Dialog open={dialogo === "entregar"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>
              Envío #{envio.numero} — {envio.destinatarioNombre}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dep-recibido-por">Recibido por</Label>
              <Input id="dep-recibido-por" value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-documento">Documento</Label>
              <Input id="dep-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-observacion">Observación</Label>
              <Textarea id="dep-observacion" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
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
            <DialogDescription>
              Envío #{envio.numero} — {envio.destinatarioNombre}. El envío sigue en tu custodia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="dep-motivo-intento">Motivo</Label>
            <Textarea id="dep-motivo-intento" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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
            <DialogDescription>
              Envío #{envio.numero} — {envio.destinatarioNombre}. No cambia estado ni custodia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="dep-motivo-incidencia">Motivo / detalle</Label>
            <Textarea id="dep-motivo-incidencia" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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

      <Dialog open={dialogo === "anular"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular envío</DialogTitle>
            <DialogDescription>
              El envío #{envio.numero} queda anulado. No existe borrar: esto deja un evento a tu nombre en la
              historia (append-only).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="dep-motivo-anular">Motivo</Label>
            <Textarea id="dep-motivo-anular" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={enviando || !motivo.trim()}
              onClick={() => ejecutar(() => anularEnvioAction(envio.id, motivo.trim()), "Envío anulado")}
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "corregir_sector"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir sector de destino</DialogTitle>
            <DialogDescription>Antes del corte. Cambia el sector dentro de la misma localidad de destino.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Sector nuevo</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectoresDestino.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-motivo-sector">Motivo</Label>
              <Textarea id="dep-motivo-sector" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando || !motivo.trim() || !sectorId}
              onClick={() =>
                ejecutar(
                  () => corregirSectorEnvioAction(envio.id, sectorId, motivo.trim()),
                  "Sector corregido"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "mover"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover a otro sector</DialogTitle>
            <DialogDescription>
              Solo si la planilla sigue pendiente. Saca el envío de la planilla actual y lo pasa al sector elegido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Sector</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectoresDestino.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-motivo-mover">Motivo</Label>
              <Textarea id="dep-motivo-mover" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando || !motivo.trim() || !sectorId}
              onClick={() =>
                ejecutar(
                  () => moverEnvioDePlanillaAction(envio.id, sectorId, motivo.trim()),
                  "Envío movido"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "confirmar"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar entrega</DialogTitle>
            <DialogDescription>
              Confirma que el envío #{envio.numero}, ya entregado, llegó correctamente a destino. Quien confirma no
              puede ser quien entregó — lo valida el backend.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando}
              onClick={() => ejecutar(() => confirmarEnvioAction(envio.numero), "Entrega confirmada")}
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "confirmar_entrega"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega y confirmar</DialogTitle>
            <DialogDescription>
              Para cuando el remito llega a la oficina y el chofer nunca marcó la entrega en su app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Chofer que entregó</Label>
              <Select value={choferId} onValueChange={setChoferId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un chofer" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-recibido-por-2">Recibido por (opcional)</Label>
              <Input id="dep-recibido-por-2" value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-documento-2">Documento (opcional)</Label>
              <Input id="dep-documento-2" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-observacion-2">Observación (opcional)</Label>
              <Textarea id="dep-observacion-2" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando || !choferId}
              onClick={() =>
                ejecutar(
                  () =>
                    confirmarEnvioConEntregaAction({
                      envioNumero: envio.numero,
                      choferId,
                      recibidoPor: recibidoPor.trim() || undefined,
                      documento: documento.trim() || undefined,
                      observacion: observacion.trim() || undefined,
                    }),
                  "Entrega registrada y confirmada"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Registrar y confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "revertir"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revertir entrega</DialogTitle>
            <DialogDescription>
              El envío vuelve a quedar en custodia de quien lo entregó. Solo desde ENTREGADO, nunca después de
              confirmar. Usalo solo si la entrega se marcó por error.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="dep-motivo-revertir">Motivo (mínimo 5 caracteres)</Label>
            <Textarea id="dep-motivo-revertir" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={enviando || motivo.trim().length < 5}
              onClick={() =>
                ejecutar(
                  () => revertirEntregaEnvioAction(envio.numero, motivo.trim()),
                  "Entrega revertida"
                )
              }
            >
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Revertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
