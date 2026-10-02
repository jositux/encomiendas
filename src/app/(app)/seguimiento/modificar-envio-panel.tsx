"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FORMAS_PAGO,
  LUGARES_PAGO,
  LUGARES_PAGO_POR_TIPO,
  TIPOS,
  permiteContrarreembolso,
  permiteElegirFormaPago,
  permiteGastoYFlete,
  permiteValorDeclarado,
} from "@/app/(app)/encomiendas/nueva/nueva-view.helpers";
import { cn } from "@/lib/utils";
import { sanitizeIntegerInput, sanitizeMoneyInput } from "@/lib/validation";
import { modificarEnvioAction } from "@/server/actions";
import type {
  EnvioApi,
  FormaPagoApi,
  LugarPagoApi,
  TipoEnvioApi,
} from "@/server/services/envios";
import {
  CODIGOS_DE_BLOQUEO,
  MOTIVO_MAX,
  cambiosDelFormulario,
  conTipo,
  formDesdeEnvio,
  validarFormulario,
  type FormModificarEnvio,
} from "./modificar-envio.helpers";

// Panel "Modificar datos" de Seguimiento (2026-10-01): un solo formulario
// con las tres secciones del envío, precargado, y el motivo obligatorio.
// Si se puede abrir o no lo decide el backend (`edicion` en la respuesta
// del seguimiento, ver seguimiento.ts) — acá no se recalcula esa regla.
//
// Fuera del panel a propósito: la localidad y el barrio de destino (el
// barrio tiene su acción propia, "Corregir sector") y la cuenta de cliente.
// Se muestran para dar contexto, sin campo para editarlos: el PATCH no los
// acepta.
export function ModificarEnvioPanel({
  envio,
  destino,
  abierto,
  onCerrar,
  onGuardado,
  onBloqueado,
}: {
  envio: EnvioApi;
  destino: { localidad: string; sector: string };
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
  onBloqueado: () => void;
}) {
  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {/* El contenido del Sheet se monta al abrir y se desmonta al
            cerrar: el formulario arranca siempre desde el envío actual y
            con un clientUuid nuevo, sin tener que resetear nada a mano. */}
        <Formulario
          envio={envio}
          destino={destino}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
          onBloqueado={onBloqueado}
        />
      </SheetContent>
    </Sheet>
  );
}

function nuevoClientUuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function Formulario({
  envio,
  destino,
  onCerrar,
  onGuardado,
  onBloqueado,
}: {
  envio: EnvioApi;
  destino: { localidad: string; sector: string };
  onCerrar: () => void;
  onGuardado: () => void;
  onBloqueado: () => void;
}) {
  const [inicial] = React.useState(() => formDesdeEnvio(envio));
  const [form, setForm] = React.useState(inicial);
  const [motivo, setMotivo] = React.useState("");
  const [errores, setErrores] = React.useState<Record<string, string>>({});
  const [errorAlGuardar, setErrorAlGuardar] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  // Uno por apertura del panel, el mismo en cada reintento: si el primer
  // intento llegó al backend pero la respuesta se perdió, reintentar no
  // deja un segundo evento en la historia.
  const [clientUuid] = React.useState(nuevoClientUuid);

  const cambios = cambiosDelFormulario(inicial, form);
  const sinCambios = Object.keys(cambios).length === 0;

  function set<K extends keyof FormModificarEnvio>(campo: K, valor: FormModificarEnvio[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: "" }));
  }

  function setImporte(campo: "flete" | "montoCrr" | "valorDeclarado" | "gasto", raw: string) {
    const cleaned = sanitizeMoneyInput(raw);
    set(campo, cleaned === "" ? "" : Math.max(0, Number(cleaned)));
  }

  async function guardar() {
    const next = validarFormulario(inicial, form, motivo);
    setErrores(next);
    if (Object.keys(next).length > 0 || sinCambios) return;

    setGuardando(true);
    setErrorAlGuardar("");
    try {
      const r = await modificarEnvioAction(envio.id, cambios, {
        motivo: motivo.trim(),
        clientUuid,
      });
      if (r.ok) {
        onGuardado();
        return;
      }
      if (CODIGOS_DE_BLOQUEO.includes(r.code)) {
        // El envío cambió de situación con el panel abierto (p. ej. entró
        // a una planilla): se cierra, se avisa y el seguimiento recargado
        // muestra el aviso de bloqueo que corresponda.
        toast.error(r.title, { description: r.message });
        onBloqueado();
        return;
      }
      // REGLA_DE_TIPO: el `detail` del backend nombra cada campo y qué le
      // pasa — se muestra entero. El resto de los rechazos, con su título.
      setErrorAlGuardar(r.code === "REGLA_DE_TIPO" ? r.message : r.title || r.message);
    } finally {
      setGuardando(false);
    }
  }

  const lugaresPago = LUGARES_PAGO.filter((l) => LUGARES_PAGO_POR_TIPO[form.tipo].includes(l.value));

  return (
    <>
      <SheetHeader>
        <SheetTitle>Modificar datos</SheetTitle>
        <SheetDescription>
          Envío #{envio.guiaDiaria ?? envio.numero} · {envio.numero}. Cada cambio queda registrado en la historia
          con tu nombre y el motivo.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <section className="flex flex-col gap-3" aria-labelledby="mod-remitente">
          <h3 id="mod-remitente" className="text-sm font-semibold">
            Remitente
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="mod-remitente-nombre" label="Nombre" error={errores.remitenteNombre}>
              <Input
                id="mod-remitente-nombre"
                value={form.remitenteNombre}
                onChange={(e) => set("remitenteNombre", e.target.value)}
                aria-invalid={!!errores.remitenteNombre}
              />
            </Campo>
            <Campo id="mod-remitente-telefono" label="Teléfono" error={errores.remitenteTelefono}>
              <Input
                id="mod-remitente-telefono"
                value={form.remitenteTelefono}
                onChange={(e) => set("remitenteTelefono", e.target.value)}
                aria-invalid={!!errores.remitenteTelefono}
              />
            </Campo>
            <Campo id="mod-remitente-calle" label="Calle">
              <Input
                id="mod-remitente-calle"
                value={form.remitenteCalle}
                onChange={(e) => set("remitenteCalle", e.target.value)}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="mod-remitente-numero" label="Número">
                <Input
                  id="mod-remitente-numero"
                  value={form.remitenteNumero}
                  onChange={(e) => set("remitenteNumero", e.target.value)}
                />
              </Campo>
              <Campo id="mod-remitente-piso" label="Piso / depto">
                <Input
                  id="mod-remitente-piso"
                  value={form.remitentePiso}
                  onChange={(e) => set("remitentePiso", e.target.value)}
                />
              </Campo>
            </div>
            <Campo id="mod-remitente-referencia" label="Referencia" className="sm:col-span-2">
              <Input
                id="mod-remitente-referencia"
                value={form.remitenteReferencia}
                onChange={(e) => set("remitenteReferencia", e.target.value)}
              />
            </Campo>
          </div>
          <SoloLectura>
            Cuenta de cliente: {envio.clienteRemitenteId ? "vinculada" : "sin vincular"}. No se
            modifica desde acá.
          </SoloLectura>
        </section>

        <Separator />

        <section className="flex flex-col gap-3" aria-labelledby="mod-destinatario">
          <h3 id="mod-destinatario" className="text-sm font-semibold">
            Destinatario
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="mod-destinatario-nombre" label="Nombre" error={errores.destinatarioNombre}>
              <Input
                id="mod-destinatario-nombre"
                value={form.destinatarioNombre}
                onChange={(e) => set("destinatarioNombre", e.target.value)}
                aria-invalid={!!errores.destinatarioNombre}
              />
            </Campo>
            <Campo
              id="mod-destinatario-telefono"
              label="Teléfono"
              error={errores.destinatarioTelefono}
            >
              <Input
                id="mod-destinatario-telefono"
                value={form.destinatarioTelefono}
                onChange={(e) => set("destinatarioTelefono", e.target.value)}
                aria-invalid={!!errores.destinatarioTelefono}
              />
            </Campo>
            <Campo id="mod-destinatario-calle" label="Calle" error={errores.destinatarioCalle}>
              <Input
                id="mod-destinatario-calle"
                value={form.destinatarioCalle}
                onChange={(e) => set("destinatarioCalle", e.target.value)}
                aria-invalid={!!errores.destinatarioCalle}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="mod-destinatario-numero" label="Número">
                <Input
                  id="mod-destinatario-numero"
                  value={form.destinatarioNumero}
                  onChange={(e) => set("destinatarioNumero", e.target.value)}
                />
              </Campo>
              <Campo id="mod-destinatario-piso" label="Piso / depto">
                <Input
                  id="mod-destinatario-piso"
                  value={form.destinatarioPiso}
                  onChange={(e) => set("destinatarioPiso", e.target.value)}
                />
              </Campo>
            </div>
            <Campo id="mod-destinatario-referencia" label="Referencia" className="sm:col-span-2">
              <Input
                id="mod-destinatario-referencia"
                value={form.destinatarioReferencia}
                onChange={(e) => set("destinatarioReferencia", e.target.value)}
              />
            </Campo>
          </div>
          <SoloLectura>
            Destino: {destino.localidad} · barrio {destino.sector}. La localidad no se modifica; el
            barrio se cambia con &quot;Corregir sector&quot;. Cuenta de cliente:{" "}
            {envio.clienteDestinatarioId ? "vinculada" : "sin vincular"}.
          </SoloLectura>
        </section>

        <Separator />

        <section className="flex flex-col gap-3" aria-labelledby="mod-envio">
          <h3 id="mod-envio" className="text-sm font-semibold">
            Envío e importes
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="mod-tipo" label="Tipo">
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((prev) => conTipo(prev, v as TipoEnvioApi))}
              >
                <SelectTrigger id="mod-tipo" className="w-full">
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
            </Campo>
            <Campo id="mod-bultos" label="Bultos" error={errores.bultos}>
              <Input
                id="mod-bultos"
                type="text"
                inputMode="numeric"
                value={form.bultos}
                onChange={(e) => {
                  const cleaned = sanitizeIntegerInput(e.target.value);
                  set("bultos", cleaned === "" ? 1 : Math.max(1, Number(cleaned)));
                }}
                aria-invalid={!!errores.bultos}
              />
            </Campo>
            <Campo id="mod-lugar-pago" label="Lugar de pago">
              <Select
                value={form.lugarPago}
                onValueChange={(v) => set("lugarPago", v as LugarPagoApi)}
              >
                <SelectTrigger id="mod-lugar-pago" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lugaresPago.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="mod-forma-pago" label="Forma de pago">
              <Select
                value={form.formaPago}
                onValueChange={(v) => set("formaPago", v as FormaPagoApi)}
                disabled={!permiteElegirFormaPago(form.tipo)}
              >
                <SelectTrigger id="mod-forma-pago" className="w-full">
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
            </Campo>
            {permiteGastoYFlete(form.tipo) && (
              <Campo id="mod-flete" label="Flete ($)" error={errores.flete}>
                <Input
                  id="mod-flete"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.flete}
                  onChange={(e) => setImporte("flete", e.target.value)}
                  aria-invalid={!!errores.flete}
                />
              </Campo>
            )}
            {permiteContrarreembolso(form.tipo) && (
              <Campo id="mod-crr" label="Contra reembolso ($)" error={errores.montoCrr}>
                <Input
                  id="mod-crr"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.montoCrr}
                  onChange={(e) => setImporte("montoCrr", e.target.value)}
                  aria-invalid={!!errores.montoCrr}
                />
              </Campo>
            )}
            {permiteGastoYFlete(form.tipo) && (
              <Campo id="mod-gasto" label="Gasto a cobrar en la entrega ($)" error={errores.gasto}>
                <Input
                  id="mod-gasto"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.gasto}
                  onChange={(e) => setImporte("gasto", e.target.value)}
                  aria-invalid={!!errores.gasto}
                />
              </Campo>
            )}
            {permiteValorDeclarado(form.tipo) && (
              <Campo
                id="mod-valor-declarado"
                label="Valor declarado ($)"
                error={errores.valorDeclarado}
              >
                <Input
                  id="mod-valor-declarado"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.valorDeclarado}
                  onChange={(e) => setImporte("valorDeclarado", e.target.value)}
                  aria-invalid={!!errores.valorDeclarado}
                />
              </Campo>
            )}
            <Campo id="mod-remito-manual" label="Remito N°">
              <Input
                id="mod-remito-manual"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={form.remitoManual}
                onChange={(e) => set("remitoManual", e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Campo>
            <Campo id="mod-observaciones" label="Contenido / observaciones" className="sm:col-span-2">
              <Textarea
                id="mod-observaciones"
                value={form.observaciones}
                onChange={(e) => set("observaciones", e.target.value)}
              />
            </Campo>
          </div>
        </section>

        <Separator />

        <Campo id="mod-motivo" label="Motivo del cambio" error={errores.motivo}>
          <Textarea
            id="mod-motivo"
            value={motivo}
            maxLength={MOTIVO_MAX}
            placeholder="Ej.: teléfono mal cargado"
            onChange={(e) => {
              setMotivo(e.target.value);
              if (errores.motivo) setErrores((prev) => ({ ...prev, motivo: "" }));
            }}
            aria-invalid={!!errores.motivo}
          />
        </Campo>

        {errorAlGuardar && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive"
          >
            {errorAlGuardar}
          </p>
        )}
      </div>

      <SheetFooter className="flex-row items-center justify-end border-t">
        {sinCambios && (
          <p className="mr-auto text-xs text-muted-foreground">Todavía no cambiaste ningún dato.</p>
        )}
        <Button variant="outline" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || sinCambios} className="gap-1.5">
          {guardando && <Loader2 className="size-4 animate-spin" />}
          Guardar cambios
        </Button>
      </SheetFooter>
    </>
  );
}

function Campo({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SoloLectura({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{children}</p>;
}
