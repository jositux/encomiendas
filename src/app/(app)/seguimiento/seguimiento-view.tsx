"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Ban,
  Pencil,
  ArrowRightLeft,
  CheckCircle2,
  Undo2,
  Truck,
  AlertTriangle,
  Inbox,
  PackagePlus,
  FileWarning,
  MapPin,
  User,
  Tag,
  Clock,
  Lock,
  Printer,
  Store,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatImporte } from "@/lib/format";
import {
  TIPOS,
  LUGARES_PAGO,
  FORMAS_PAGO,
} from "@/app/(app)/encomiendas/nueva/nueva-view.helpers";
import { abrirRemito } from "@/app/(app)/encomiendas/nueva/imprimir-remito";
import { ModificarEnvioPanel } from "./modificar-envio-panel";
import {
  buscarSeguimientoAction,
  refrescarSeguimientoAction,
  anularEnvioAction,
  corregirSectorEnvioAction,
  moverEnvioDePlanillaAction,
  confirmarEnvioAction,
  confirmarEnvioConEntregaAction,
  revertirEntregaEnvioAction,
} from "@/server/actions";
import type { SeguimientoResponse, EventoSeguimiento, TipoEvento } from "@/server/services/seguimiento";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { EnvioApi } from "@/server/services/envios";

const UBICACION_LABEL: Record<string, string> = {
  en_origen: "En origen",
  en_transito: "En tránsito",
  en_deposito: "En depósito",
  en_base_destino: "En base destino",
  en_reparto: "En reparto",
  entregado: "Entregado",
  confirmado: "Confirmado",
  anulado: "Anulado",
  alta_incompleta: "Alta incompleta",
};

const UBICACION_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"
> = {
  en_origen: "secondary",
  en_transito: "info",
  en_deposito: "secondary",
  en_base_destino: "info",
  en_reparto: "warning",
  entregado: "success",
  confirmado: "success",
  anulado: "destructive",
  alta_incompleta: "outline",
};

const EVENTO_ICON: Record<TipoEvento, React.ElementType> = {
  alta: PackagePlus,
  carga: Truck,
  recepcion: Inbox,
  entrega: CheckCircle2,
  intento_fallido: AlertTriangle,
  incidencia: FileWarning,
  confirmacion: CheckCircle2,
  anulacion: Ban,
  correccion_sector: Pencil,
  reversion_entrega: Undo2,
  // Correccion generica via PATCH /envios/:id (changelog backend
  // 2026-09-15) — misma familia conceptual que "correccion_sector", mismo
  // ícono y mismo tono neutro (no entra en los checks de
  // destructivo/success de abajo, así que ya cae en el "bg-muted" por
  // default).
  modificacion: Pencil,
};

const DETALLE_LABEL: Record<string, string> = {
  recibidoPor: "Recibido por",
  documento: "Documento",
  observacion: "Observación",
  motivo: "Motivo",
  bultoNumero: "Bulto",
  detalle: "Detalle",
  sectorNuevo: "Sector nuevo",
  de: "De",
  a: "A",
  planillaDe: "Planilla de origen",
};

// Detalle desplegado de un evento "modificacion" (2026-10-01): `cambios`
// llega indexado por la columna real, en snake_case, con los valores
// crudos (los importes como texto de numeric, "10000.00"). Acá se traduce
// la columna a un nombre legible y se formatea el valor. La frase de una
// línea NO pasa por acá: la arma el backend y se pinta tal cual.
const CAMBIO_LABEL: Record<string, string> = {
  cantidad_bultos: "Bultos",
  flete_importe: "Flete",
  tipo: "Tipo",
  lugar_pago: "Lugar de pago",
  forma_pago: "Forma de pago",
  contrarreembolso_importe: "Contra reembolso",
  remito_manual_numero: "Remito N°",
  valor_declarado: "Valor declarado",
  gasto: "Gasto",
  observaciones: "Contenido / observaciones",
  remitente_nombre: "Remitente",
  remitente_telefono: "Teléfono del remitente",
  remitente_calle: "Calle del remitente",
  remitente_numero: "Número del remitente",
  remitente_piso: "Piso del remitente",
  remitente_referencia: "Referencia del remitente",
  destinatario_nombre: "Destinatario",
  destinatario_telefono: "Teléfono del destinatario",
  destinatario_calle: "Calle del destinatario",
  destinatario_numero: "Número del destinatario",
  destinatario_piso: "Piso del destinatario",
  destinatario_referencia: "Referencia del destinatario",
};

const CAMBIO_ES_IMPORTE = new Set([
  "flete_importe",
  "contrarreembolso_importe",
  "valor_declarado",
  "gasto",
]);

const CAMBIO_OPCIONES: Record<string, { value: string; label: string }[]> = {
  tipo: TIPOS,
  lugar_pago: LUGARES_PAGO,
  forma_pago: FORMAS_PAGO,
};

function etiquetaDe(opciones: { value: string; label: string }[], valor: string): string {
  return opciones.find((o) => o.value === valor)?.label ?? valor;
}

function valorDeCambio(columna: string, valor: unknown): string {
  // Mismo texto que usa el backend en la frase para un valor vacío.
  if (valor === null || valor === undefined || valor === "") return "(vacío)";
  if (CAMBIO_ES_IMPORTE.has(columna)) return formatImporte(String(valor));
  const opciones = CAMBIO_OPCIONES[columna];
  if (opciones) return etiquetaDe(opciones, String(valor));
  return String(valor);
}

function tiempoRelativo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

function fechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

export function SeguimientoView({
  permisos,
  localidades,
  sectores,
  choferes,
  enviosRecientes,
}: {
  permisos: string[];
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  choferes: UsuarioApi[];
  enviosRecientes: EnvioApi[];
}) {
  const [query, setQuery] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [resultado, setResultado] = React.useState<SeguimientoResponse | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [buscoAlgunaVez, setBuscoAlgunaVez] = React.useState(false);
  const [eventoAbierto, setEventoAbierto] = React.useState<string | null>(null);

  const localidadNombre = React.useCallback(
    (id: string) => localidades.find((l) => l.id === id)?.nombre ?? "—",
    [localidades]
  );

  const puedeAccion = React.useCallback((permiso: string) => permisos.includes(permiso), [permisos]);

  async function buscar(q: string) {
    const texto = q.trim();
    if (!texto) return;
    setQuery(texto);
    setBuscando(true);
    setBuscoAlgunaVez(true);
    try {
      const r = await buscarSeguimientoAction(texto);
      if (r.ok) {
        setResultado(r.data);
        setNotFound(false);
      } else if (r.notFound) {
        setResultado(null);
        setNotFound(true);
      } else {
        setResultado(null);
        setNotFound(false);
        toast.error(r.title || r.message);
      }
    } finally {
      setBuscando(false);
    }
  }

  async function refrescar() {
    if (!resultado) return;
    const r = await refrescarSeguimientoAction(resultado.envio.numero);
    if (r.ok) setResultado(r.data);
  }

  function limpiar() {
    setResultado(null);
    setNotFound(false);
    setQuery("");
  }

  return (
    <div>
      <PageHeader
        title="Seguimiento de envío"
        description="Buscá un envío por número, remito manual o guía diaria y mirá su historia completa."
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar(query);
              }}
              placeholder="Número (000000123-6), remito manual o guía diaria (ej. A17)…"
              className="pl-9"
              autoFocus
            />
          </div>
          <Button onClick={() => buscar(query)} disabled={buscando || !query.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
          {resultado && (
            <Button variant="ghost" onClick={limpiar} className="text-muted-foreground">
              Ver recientes
            </Button>
          )}
        </CardContent>
      </Card>

      {notFound && (
        <Card className="mb-6">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos ningún envío con ese número, remito o guía.
          </CardContent>
        </Card>
      )}

      {!resultado && !buscando && (
        <EnviosRecientesList
          envios={enviosRecientes}
          onElegir={(e) => buscar(e.numero)}
          intro={
            buscoAlgunaVez
              ? "Mientras tanto, elegí uno de los envíos recientes:"
              : "Buscá un envío arriba, o elegí uno de los envíos recientes:"
          }
        />
      )}

      {resultado && (
        <SeguimientoResultado
          // Un envío distinto es una ficha distinta: el panel abierto y la
          // oferta de reimprimir no pasan de un envío al siguiente.
          key={resultado.envio.id}
          data={resultado}
          localidadNombre={localidadNombre}
          puedeAccion={puedeAccion}
          sectores={sectores}
          choferes={choferes}
          eventoAbierto={eventoAbierto}
          setEventoAbierto={setEventoAbierto}
          onRefrescar={refrescar}
        />
      )}
    </div>
  );
}

function EnviosRecientesList({
  envios,
  onElegir,
  intro,
}: {
  envios: EnvioApi[];
  onElegir: (envio: EnvioApi) => void;
  intro: string;
}) {
  if (envios.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Todavía no hay envíos cargados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{intro}</p>
        <div className="flex flex-col gap-2">
          {envios.map((e) => {
            const ubicacionLabel = UBICACION_LABEL[e.ubicacion] ?? e.ubicacion;
            const ubicacionVariant = UBICACION_VARIANT[e.ubicacion] ?? "secondary";
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onElegir(e)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">#{e.guiaDiaria ?? e.numero}</span>
                    <Badge variant={ubicacionVariant}>{ubicacionLabel}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {e.remitenteNombre} → {e.destinatarioNombre}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tiempoRelativo(e.creadoEn)}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SeguimientoResultado({
  data,
  localidadNombre,
  puedeAccion,
  sectores,
  choferes,
  eventoAbierto,
  setEventoAbierto,
  onRefrescar,
}: {
  data: SeguimientoResponse;
  localidadNombre: (id: string) => string;
  puedeAccion: (p: string) => boolean;
  sectores: SectorApi[];
  choferes: UsuarioApi[];
  eventoAbierto: string | null;
  setEventoAbierto: (id: string | null) => void;
  onRefrescar: () => Promise<void>;
}) {
  const { envio, custodiaActual, eventos, edicion } = data;
  const [panelAbierto, setPanelAbierto] = React.useState(false);
  const [ofrecerRemito, setOfrecerRemito] = React.useState(false);
  const sectorNombre = sectores.find((s) => s.id === envio.sectorDestinoId)?.nombre ?? "—";
  const ubicacionLabel = UBICACION_LABEL[envio.ubicacion] ?? envio.ubicacion;
  const ubicacionVariant = UBICACION_VARIANT[envio.ubicacion] ?? "secondary";
  const ultimoEvento = eventos[eventos.length - 1];
  const eventosDesc = [...eventos].reverse();

  const quienLoTiene = custodiaActual.usuario?.nombre;
  const dondeEsta = custodiaActual.punto?.nombre;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold">#{envio.guiaDiaria ?? envio.numero}</span>
                <Badge variant={ubicacionVariant}>{ubicacionLabel}</Badge>
                <span className="text-xs text-muted-foreground">{envio.estadoActual}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {quienLoTiene ? (
                  <>
                    Lo tiene <span className="font-medium text-foreground">{quienLoTiene}</span>
                    {dondeEsta ? <> · en {dondeEsta}</> : null}
                  </>
                ) : dondeEsta ? (
                  <>En {dondeEsta}</>
                ) : (
                  "Sin custodia asignada"
                )}
                {ultimoEvento && (
                  <>
                    {" "}
                    · <Clock className="inline size-3.5 -translate-y-px" /> {tiempoRelativo(ultimoEvento.occurredAt)}
                  </>
                )}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="flex items-center justify-end gap-1">
                Número {envio.numero}
                <CopyButton value={envio.numero} label="Número de envío" />
              </p>
              {envio.remitoManualNumero && (
                <p className="flex items-center justify-end gap-1">
                  Remito {envio.remitoManualNumero}
                  <CopyButton value={envio.remitoManualNumero} label="Remito manual" />
                </p>
              )}
              <p>{envio.cantidadBultos} bulto{envio.cantidadBultos === 1 ? "" : "s"}</p>
            </div>
          </div>

          <Separator />

          {/* Ficha completa del envío (2026-10-01): hasta ahora solo se veía
              el destinatario y la calle de destino. Remitente, piso,
              referencia, tipo, pago e importes ya venían en la respuesta —
              son justo los datos que se corrigen con "Modificar datos". */}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Remitente</p>
                <p className="font-medium">{envio.remitenteNombre}</p>
                <p className="text-xs text-muted-foreground">{envio.remitenteTelefono}</p>
                {envio.remitenteCalle && (
                  <p className="text-xs text-muted-foreground">
                    {envio.remitenteCalle} {envio.remitenteNumero ?? ""}
                    {envio.remitentePiso ? ` · ${envio.remitentePiso}` : ""}
                  </p>
                )}
                {envio.remitenteReferencia && (
                  <p className="text-xs text-muted-foreground">Ref.: {envio.remitenteReferencia}</p>
                )}
                <p className="text-xs text-muted-foreground">{localidadNombre(envio.localidadOrigenId)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Destinatario</p>
                <p className="font-medium">{envio.destinatarioNombre}</p>
                <p className="text-xs text-muted-foreground">{envio.destinatarioTelefono}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-start-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Destino</p>
                <p className="font-medium">
                  {envio.destinatarioCalle} {envio.destinatarioNumero ?? ""}
                  {envio.destinatarioPiso ? ` · ${envio.destinatarioPiso}` : ""}
                </p>
                {envio.destinatarioReferencia && (
                  <p className="text-xs text-muted-foreground">Ref.: {envio.destinatarioReferencia}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {localidadNombre(envio.localidadDestinoId)} · sector {sectorNombre}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <DatoEnvio label="Tipo" valor={etiquetaDe(TIPOS, envio.tipo)} />
            <DatoEnvio
              label="Pago"
              valor={`${etiquetaDe(LUGARES_PAGO, envio.lugarPago)} · ${etiquetaDe(FORMAS_PAGO, envio.formaPago)}`}
            />
            <DatoEnvio label="Flete" valor={formatImporte(envio.fleteImporte)} />
            {envio.contrarreembolsoImporte !== null && (
              <DatoEnvio label="Contra reembolso" valor={formatImporte(envio.contrarreembolsoImporte)} />
            )}
            <DatoEnvio label="Gasto" valor={formatImporte(envio.gasto ?? "0")} />
            {envio.valorDeclarado != null && (
              <DatoEnvio label="Valor declarado" valor={formatImporte(envio.valorDeclarado)} />
            )}
            {envio.observaciones && (
              <DatoEnvio
                label="Contenido / observaciones"
                valor={envio.observaciones}
                className="col-span-2 sm:col-span-3"
              />
            )}
          </dl>

          {envio.etiquetas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="size-3.5 text-muted-foreground" />
              {envio.etiquetas.map((et) => (
                <span key={et} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  {et}
                </span>
              ))}
            </div>
          )}

          {/* Si se puede modificar lo decide el backend para el usuario que
              consulta (`edicion`, ver seguimiento.ts): permitida -> botón;
              con bloqueo -> su mensaje como aviso; sin ninguno (sin permiso,
              o un backend que todavía no manda `edicion`) -> nada. */}
          {edicion?.permitida ? (
            <div className="flex justify-end">
              <Button variant="outline" className="gap-1.5" onClick={() => setPanelAbierto(true)}>
                <Pencil className="size-4" />
                Modificar datos
              </Button>
            </div>
          ) : edicion?.bloqueo ? (
            <p
              role="note"
              className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground"
            >
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              {edicion.bloqueo.mensaje}
            </p>
          ) : null}

          {/* Casi todos los datos modificables salen en el papel: tras
              guardar se ofrece reimprimir, cualquiera haya sido el cambio. */}
          {ofrecerRemito && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 p-2.5 text-sm"
            >
              <span>Los datos se modificaron. El remito impreso antes quedó desactualizado.</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => abrirRemito(envio.numero)}
              >
                <Printer className="size-4" />
                Reimprimir remito
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ModificarEnvioPanel
        envio={envio}
        destino={{ localidad: localidadNombre(envio.localidadDestinoId), sector: sectorNombre }}
        // Qué puede modificar lo dice el backend. Sin el campo (backend
        // anterior) el panel se comporta como siempre: todos los campos.
        campos={edicion?.campos === "sin_importes" ? "sin_importes" : "todos"}
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        onGuardado={async () => {
          setPanelAbierto(false);
          setOfrecerRemito(true);
          toast.success("Datos modificados");
          await onRefrescar();
        }}
        onBloqueado={async () => {
          setPanelAbierto(false);
          await onRefrescar();
        }}
      />

      <AccionesEnvio
        envio={envio}
        puedeAccion={puedeAccion}
        sectores={sectores}
        choferes={choferes}
        onRefrescar={onRefrescar}
      />

      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-semibold">Historia</p>
          <div className="flex flex-col">
            {eventosDesc.map((ev, i) => (
              <EventoRow
                key={ev.id}
                evento={ev}
                esUltimo={i === eventosDesc.length - 1}
                abierto={eventoAbierto === ev.id}
                onToggle={() => setEventoAbierto(eventoAbierto === ev.id ? null : ev.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DatoEnvio({
  label,
  valor,
  className,
}: {
  label: string;
  valor: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

function EventoRow({
  evento,
  esUltimo,
  abierto,
  onToggle,
}: {
  evento: EventoSeguimiento;
  esUltimo: boolean;
  abierto: boolean;
  onToggle: () => void;
}) {
  const Icon = EVENTO_ICON[evento.tipo] ?? Clock;
  const detalleEntries = Object.entries(evento.detalle ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    // En una modificación se lee primero qué cambió y después por qué.
    .sort(([a], [b]) =>
      evento.tipo === "modificacion" ? Number(a === "motivo") - Number(b === "motivo") : 0
    );
  const tieneDetalle =
    detalleEntries.length > 0 || evento.registradoPor || evento.punto || evento.planilla || evento.relojSospechoso;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            evento.tipo === "anulacion" || evento.tipo === "intento_fallido" || evento.tipo === "reversion_entrega"
              ? "bg-destructive/15 text-destructive"
              : evento.tipo === "confirmacion" || evento.tipo === "entrega"
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-3.5" />
        </div>
        {!esUltimo && <div className="w-px flex-1 bg-border" />}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 pb-4 text-left"
        disabled={!tieneDetalle}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm">
              {evento.frase}
              {evento.relojSospechoso && (
                <Badge variant="warning" className="ml-2 align-middle">
                  Reloj sospechoso
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{tiempoRelativo(evento.occurredAt)} · {fechaHora(evento.occurredAt)}</p>
          </div>
          {tieneDetalle && (
            <span className="mt-0.5 shrink-0 text-muted-foreground">
              {abierto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </span>
          )}
        </div>
        {abierto && tieneDetalle && (
          <div className="mt-2 flex flex-col gap-1 rounded-md bg-muted/50 p-2.5 text-xs">
            <p className="text-muted-foreground">Registrado {fechaHora(evento.recordedAt)}</p>
            {evento.registradoPor && (
              <p>
                Registrado por <span className="font-medium">{evento.registradoPor.nombre}</span>
              </p>
            )}
            {evento.punto && <p>Punto: {evento.punto.nombre}</p>}
            {evento.planilla && (
              <p>
                Planilla {evento.planilla.codigoCorto} ({evento.planilla.codigoQr})
              </p>
            )}
            {detalleEntries.map(([k, v]) => {
              // "cambios" (evento tipo "modificacion", changelog backend
              // 2026-09-15) es un objeto anidado {columna: {antes,
              // despues}}, no un valor plano — String(v) daría
              // "[object Object]". Se muestra cada columna cambiada como
              // "antes → después" en vez de eso, con el nombre legible de
              // la columna y el valor formateado (ver CAMBIO_LABEL). El
              // resumen de una línea ya lo cubre `evento.frase` (armada
              // por el backend); esto es solo el detalle expandido.
              if (k === "cambios" && v && typeof v === "object") {
                return (
                  <div key={k} className="flex flex-col gap-0.5">
                    {Object.entries(v as Record<string, { antes?: unknown; despues?: unknown }>).map(
                      ([campo, diff]) => (
                        <p key={campo}>
                          {CAMBIO_LABEL[campo] ?? campo}: {valorDeCambio(campo, diff?.antes)} →{" "}
                          {valorDeCambio(campo, diff?.despues)}
                        </p>
                      )
                    )}
                  </div>
                );
              }
              return (
                <p key={k}>
                  {DETALLE_LABEL[k] ?? k}: {String(v)}
                </p>
              );
            })}
          </div>
        )}
      </button>
    </div>
  );
}

// -- Acciones contextuales ---------------------------------------------------

type DialogoAccion =
  | null
  | "anular"
  | "corregir_sector"
  | "mover"
  | "confirmar"
  | "confirmar_entrega"
  | "revertir";

function AccionesEnvio({
  envio,
  puedeAccion,
  sectores,
  choferes,
  onRefrescar,
}: {
  envio: SeguimientoResponse["envio"];
  puedeAccion: (p: string) => boolean;
  sectores: SectorApi[];
  choferes: UsuarioApi[];
  onRefrescar: () => Promise<void>;
}) {
  const [dialogo, setDialogo] = React.useState<DialogoAccion>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [sectorId, setSectorId] = React.useState("");
  const [choferId, setChoferId] = React.useState("");
  const [recibidoPor, setRecibidoPor] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [observacion, setObservacion] = React.useState("");

  const puedeAnular =
    (envio.estadoActual === "REGISTRADO" || envio.estadoActual === "EN_CUSTODIA") &&
    envio.ubicacion !== "en_reparto" &&
    envio.ubicacion !== "en_transito" &&
    puedeAccion("envios:anular");

  const puedeCorregirSector =
    envio.estadoActual === "REGISTRADO" && puedeAccion("envios:corregir_sector");

  const puedeMover =
    envio.estadoActual === "EN_CUSTODIA" &&
    !!envio.planillaActualId &&
    puedeAccion("envios:mover_de_planilla");

  const puedeConfirmar = envio.estadoActual === "ENTREGADO" && puedeAccion("confirmaciones:confirmar");

  const puedeConfirmarConEntrega =
    envio.estadoActual === "EN_CUSTODIA" &&
    envio.ubicacion === "en_reparto" &&
    puedeAccion("confirmaciones:confirmar_con_entrega");

  const puedeRevertir = envio.estadoActual === "ENTREGADO" && puedeAccion("entregas:revertir");

  const sectoresDestino = sectores.filter(
    (s) => s.localidadId === envio.localidadDestinoId && s.id !== envio.sectorDestinoId
  );

  const hayAcciones =
    puedeAnular || puedeCorregirSector || puedeMover || puedeConfirmar || puedeConfirmarConEntrega || puedeRevertir;

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
        toast.error(r.title || r.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (!hayAcciones) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {puedeAnular && (
          <Button variant="outline" className="gap-1.5" onClick={() => setDialogo("anular")}>
            <Ban className="size-4" />
            Anular
          </Button>
        )}
        {puedeCorregirSector && (
          <Button variant="outline" className="gap-1.5" onClick={() => setDialogo("corregir_sector")}>
            <Pencil className="size-4" />
            Corregir sector
          </Button>
        )}
        {puedeMover && (
          <Button variant="outline" className="gap-1.5" onClick={() => setDialogo("mover")}>
            <ArrowRightLeft className="size-4" />
            Mover de planilla
          </Button>
        )}
        {puedeConfirmar && (
          <Button className="gap-1.5" onClick={() => setDialogo("confirmar")}>
            <CheckCircle2 className="size-4" />
            Confirmar entrega
          </Button>
        )}
        {puedeConfirmarConEntrega && (
          <Button variant="outline" className="gap-1.5" onClick={() => setDialogo("confirmar_entrega")}>
            <Truck className="size-4" />
            Registrar entrega y confirmar
          </Button>
        )}
        {puedeRevertir && (
          <Button variant="outline" className="gap-1.5 text-destructive" onClick={() => setDialogo("revertir")}>
            <Undo2 className="size-4" />
            Revertir entrega
          </Button>
        )}
      </div>

      <Dialog open={dialogo === "anular"} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular envío</DialogTitle>
            <DialogDescription>El envío #{envio.guiaDiaria ?? envio.numero} queda anulado. Esta acción se registra en la historia.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-anular">Motivo</Label>
            <Textarea id="motivo-anular" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={enviando || !motivo.trim()}
              onClick={() =>
                ejecutar(() => anularEnvioAction(envio.id, motivo.trim()), "Envío anulado")
              }
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
            <DialogDescription>Cambia el sector dentro de la misma localidad de destino.</DialogDescription>
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
              <Label htmlFor="motivo-sector">Motivo</Label>
              <Textarea id="motivo-sector" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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
            <DialogTitle>Mover a otra planilla</DialogTitle>
            <DialogDescription>Saca el envío de la planilla actual y lo pasa al sector elegido, dentro de la misma localidad de destino.</DialogDescription>
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
              <Label htmlFor="motivo-mover">Motivo</Label>
              <Textarea id="motivo-mover" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando || !motivo.trim() || !sectorId}
              onClick={() =>
                ejecutar(
                  () => moverEnvioDePlanillaAction(envio.id, sectorId, motivo.trim()),
                  "Envío movido de planilla"
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
              Confirma que el envío #{envio.guiaDiaria ?? envio.numero}, ya entregado, llegó correctamente a destino. Quien confirma no puede ser quien entregó.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              disabled={enviando}
              onClick={() =>
                ejecutar(() => confirmarEnvioAction(envio.numero), "Entrega confirmada")
              }
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
              Para cuando el chofer entregó pero no lo marcó en su app — carga la entrega y la confirmación juntas.
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
                  {choferes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recibido-por">Recibido por (opcional)</Label>
              <Input id="recibido-por" value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="documento">Documento (opcional)</Label>
              <Input id="documento" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="observacion">Observación (opcional)</Label>
              <Textarea id="observacion" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
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
              El envío vuelve a quedar en custodia del chofer que lo entregó. Usalo solo si la entrega se marcó por error.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-revertir">Motivo (mínimo 5 caracteres)</Label>
            <Textarea id="motivo-revertir" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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
