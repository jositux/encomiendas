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
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
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
import {
  listPlanillasAction,
  buscarPlanillaPorCodigoAction,
  cargarPlanillaAction,
  recibirPlanillaAction,
  recibirEnvioSueltoAction,
  entregarEnvioAction,
  registrarIntentoFallidoAction,
  registrarIncidenciaAction,
  buscarSeguimientoAction,
} from "@/server/actions";
import type { DespachoApi, PlanillaApi, EnvioDePlanillaApi } from "@/server/services/custodia";
import type { EnvioApi } from "@/server/services/envios";
import type { LocalidadBackend } from "@/types";

// Un envío deja de aparecer en `planilla.envios` apenas la planilla pasa a
// "recibida" (confirmado en vivo, ver nota en buscarPlanillas) — a partir de
// ahí solo se lo puede volver a ubicar por número/guía, igual que en
// Seguimiento. Este buscador cubre ese caso y cualquier otro envío que el
// chofer necesite tocar sin pasar por el flujo de planilla (ej. reintentar
// una entrega al día siguiente).
function envioApiComoFilaDePlanilla(envio: {
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

type AccionResultado = { ok: true } | { ok: false; title: string; message: string };

function guiaCorta(numero: string): string {
  return numero.replace(/^0+/, "") || numero;
}

export function ChoferView({
  despachos,
  localidades,
  puedeVerDespachos,
  permisos,
  usuarioId,
}: {
  despachos: DespachoApi[];
  localidades: LocalidadBackend[];
  // false para un chofer real (sin `despachos:leer`, permiso de oficina) —
  // ver nota en page.tsx y sección 27 del plan. Con false, la búsqueda por
  // despacho+localidad no se muestra; el punto de entrada es
  // BuscadorPlanillaPorCodigo, más abajo.
  puedeVerDespachos: boolean;
  // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): se
  // pasa hacia abajo a PlanillaDetalle y EnvioDePlanillaRow para gatear en
  // la UI los botones de Cargar/Recibir (`custodia:registrar`) y
  // Entregar/Intento/Incidencia (`entregas:registrar`) — mismo patrón
  // `puedeAccion()` que ya usa seguimiento-view.tsx. Antes de esto, esos 5
  // botones se mostraban siempre habilitados sin importar el permiso
  // real, y el usuario recién se enteraba de que le faltaba al clickear y
  // recibir el toast de error del backend.
  permisos: string[];
  // 2026-09-17 (sección 31 del plan): para decidir en BuscadorEnvioSuelto
  // si un envío EN_CUSTODIA ya está en mi custodia (mostrar Entregar/
  // Intento/Incidencia) o en la de otro (mostrar Recibir).
  usuarioId: string;
}) {
  const [despachoId, setDespachoId] = React.useState(despachos[0]?.id ?? "");
  const [localidadId, setLocalidadId] = React.useState("");
  const [planillas, setPlanillas] = React.useState<PlanillaApi[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [buscado, setBuscado] = React.useState(false);
  const [planillaActiva, setPlanillaActiva] = React.useState<PlanillaApi | null>(null);
  // De dónde salió `planillaActiva`, para saber cómo refrescarla después de
  // una acción (cargar/recibir/entregar/...): por código no depende de
  // ningún despacho/localidad elegido, así que no puede reusar
  // `buscarPlanillas()`.
  const [origenActiva, setOrigenActiva] = React.useState<"despacho" | "codigo" | null>(null);

  async function buscarPlanillas() {
    if (!despachoId || !localidadId) return;
    setBuscando(true);
    setBuscado(false);
    try {
      const data = await listPlanillasAction(despachoId, { localidadId });
      setPlanillas(data);
      setBuscado(true);
      if (planillaActiva) {
        const actualizada = data.find((p) => p.id === planillaActiva.id);
        if (actualizada) {
          // Confirmado en vivo el 2026-09-17: apenas la planilla pasa a
          // "recibida" (POST /custodia/recepcion), GET /planillas deja de
          // devolver sus envíos (pasan a seguimiento individual, ya sueltos
          // de la planilla). Si no conserváramos la última lista no vacía,
          // la UI perdería la referencia a esos envíos justo cuando hace
          // falta entregarlos/marcar intento o incidencia uno por uno — se
          // mantiene la lista anterior cuando el backend ya no la manda.
          setPlanillaActiva(
            actualizada.envios.length > 0
              ? actualizada
              : { ...actualizada, envios: planillaActiva.envios }
          );
          setOrigenActiva("despacho");
        } else {
          setPlanillaActiva(null);
          setOrigenActiva(null);
        }
      }
    } catch (err) {
      toast.error("No se pudo buscar planillas", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBuscando(false);
    }
  }

  async function buscarPorCodigo(codigo: string): Promise<boolean> {
    const r = await buscarPlanillaPorCodigoAction(codigo);
    if (!r.ok) {
      toast.error(r.title, { description: r.message });
      return false;
    }
    const data = r.data!;
    setPlanillaActiva((prev) =>
      // Mismo cuidado que en buscarPlanillas(): si ya está "recibida" y el
      // backend ya no manda envios, conservamos los que ya teníamos.
      prev && prev.id === data.id && data.envios.length === 0 && prev.envios.length > 0
        ? { ...data, envios: prev.envios }
        : data
    );
    setOrigenActiva("codigo");
    return true;
  }

  async function refrescarActiva() {
    if (origenActiva === "codigo" && planillaActiva) {
      await buscarPorCodigo(planillaActiva.codigoCorto);
    } else {
      await buscarPlanillas();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chofer"
        description="Cargar y recibir planillas, y registrar entregas, intentos fallidos e incidencias por envío."
      />

      <BuscadorPlanillaPorCodigo
        onBuscar={(codigo) =>
          buscarPorCodigo(codigo).then((encontrada) => {
            if (!encontrada) return false;
            // Al encontrar por código, limpiamos el resultado de la
            // búsqueda por despacho para que no queden dos "activas"
            // compitiendo visualmente.
            setPlanillas([]);
            setBuscado(false);
            return true;
          })
        }
      />

      {puedeVerDespachos && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-6">
              <div className="grid gap-1.5">
                <Label>Despacho</Label>
                <Select value={despachoId} onValueChange={setDespachoId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Elegí un despacho" />
                  </SelectTrigger>
                  <SelectContent>
                    {despachos.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.recorridoNombre} · {d.fecha} #{d.secuencia} ({d.envios} envíos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Localidad de destino</Label>
                <Select value={localidadId} onValueChange={setLocalidadId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Elegí una localidad" />
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
              <Button onClick={buscarPlanillas} disabled={!despachoId || !localidadId || buscando} className="gap-1.5">
                {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Buscar planillas
              </Button>
            </CardContent>
          </Card>

          {buscado && planillas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay planillas para ese despacho y localidad.
            </p>
          )}

          {planillas.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planillas.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-colors ${planillaActiva?.id === p.id ? "border-primary" : ""}`}
                  onClick={() => {
                    setPlanillaActiva(p);
                    setOrigenActiva("despacho");
                  }}
                >
                  <CardContent className="flex flex-col gap-1.5 pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{p.codigoCorto}</span>
                      <Badge variant="outline">{p.estado}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{p.localidadDestinoNombre} · {p.sectorDestinoNombre}</span>
                    <span className="text-sm">{p.envios.length} envío{p.envios.length === 1 ? "" : "s"}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {planillaActiva && (
        <PlanillaDetalle planilla={planillaActiva} onRefrescar={refrescarActiva} permisos={permisos} />
      )}

      <BuscadorEnvioSuelto permisos={permisos} usuarioId={usuarioId} />
    </div>
  );
}

function BuscadorPlanillaPorCodigo({
  onBuscar,
}: {
  onBuscar: (codigo: string) => Promise<boolean>;
}) {
  const [codigo, setCodigo] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);

  async function buscar() {
    const texto = codigo.trim();
    if (!texto) return;
    setBuscando(true);
    try {
      await onBuscar(texto);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div>
          <h3 className="font-semibold">Buscar planilla por código</h3>
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
          <Button onClick={buscar} disabled={buscando || !codigo.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Los 3 estados en los que puede estar un envío suelto que este buscador
// necesita distinguir (ver sección 31 del plan): REGISTRADO/EN_CUSTODIA-de-
// otro (se puede "Recibir"), EN_CUSTODIA-mío (Entregar/Intento/Incidencia,
// igual que un envío de planilla), o un estado terminal (ENTREGADO/
// CONFIRMADO/ANULADO, sin ninguna acción posible acá).
function BuscadorEnvioSuelto({
  permisos,
  usuarioId,
}: {
  permisos: string[];
  // 2026-09-17 (sección 31 del plan): para saber si `custodiaActualUsuarioId`
  // del envío encontrado soy yo (Entregar/Intento/Incidencia) u otro
  // usuario/nadie (Recibir).
  usuarioId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  // Se guarda el envío completo (no el recorte EnvioDePlanillaApi de antes)
  // porque acá hace falta estadoActual/custodiaActualUsuarioId para decidir
  // qué mostrar — envioApiComoFilaDePlanilla() se sigue usando recién al
  // pasarlo a EnvioDePlanillaRow, que no necesita esos campos.
  const [envio, setEnvio] = React.useState<(EnvioApi & { etiquetas: string[] }) | null>(null);
  const [noEncontrado, setNoEncontrado] = React.useState(false);
  const [recibiendo, setRecibiendo] = React.useState(false);
  // Mismo permiso que Cargar/Recibir planilla — el backend no distingue
  // "recibir una planilla" de "recibir un envío suelto", los dos van por
  // POST /custodia/recepcion y piden custodia:registrar (confirmado por el
  // equipo de backend, sección 31).
  const puedeRecibir = permisos.includes("custodia:registrar");

  async function buscar() {
    const texto = query.trim();
    if (!texto) return;
    setBuscando(true);
    setNoEncontrado(false);
    setEnvio(null);
    try {
      const r = await buscarSeguimientoAction(texto);
      if (r.ok) {
        setEnvio(r.data.envio);
      } else if (r.notFound) {
        setNoEncontrado(true);
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setBuscando(false);
    }
  }

  async function recibir() {
    if (!envio) return;
    setRecibiendo(true);
    try {
      const r = await recibirEnvioSueltoAction(envio.numero);
      if (r.ok) {
        toast.success(r.data.evento.duplicado ? "Ya estaba en tu custodia" : "Envío recibido");
        await buscar();
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setRecibiendo(false);
    }
  }

  const estado = envio?.estadoActual;
  const enMiCustodia = estado === "EN_CUSTODIA" && envio?.custodiaActualUsuarioId === usuarioId;
  const puedeSerRecibido = estado === "REGISTRADO" || (estado === "EN_CUSTODIA" && !enMiCustodia);
  const estadoFinal = estado === "ENTREGADO" || estado === "CONFIRMADO" || estado === "ANULADO";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div>
          <h3 className="font-semibold">Buscar envío suelto</h3>
          <p className="text-sm text-muted-foreground">
            Para recibir, entregar, marcar intento fallido o incidencia de un envío que ya no
            aparece en ninguna planilla (por número, remito o guía).
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: 000000009-3 o A17"
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <Button onClick={buscar} disabled={buscando || !query.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
        {noEncontrado && <p className="text-sm text-muted-foreground">No se encontró ningún envío.</p>}

        {envio && puedeSerRecibido && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-mono text-sm font-semibold">#{guiaCorta(envio.numero)}</p>
              <p className="text-sm">{envio.destinatarioNombre}</p>
              <p className="text-xs text-muted-foreground">
                {estado === "EN_CUSTODIA"
                  ? "En custodia de otro usuario — \"Recibir acá\" te lo transfiere a este punto."
                  : "Registrado, todavía sin custodia — \"Recibir acá\" lo toma para este punto."}
              </p>
            </div>
            {puedeRecibir && (
              <Button size="sm" className="gap-1.5" disabled={recibiendo} onClick={recibir}>
                {recibiendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                Recibir acá
              </Button>
            )}
          </div>
        )}

        {envio && enMiCustodia && (
          <EnvioDePlanillaRow
            envio={envioApiComoFilaDePlanilla(envio)}
            onRefrescar={async () => buscar()}
            permisos={permisos}
          />
        )}

        {envio && estadoFinal && (
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-mono text-sm font-semibold">#{guiaCorta(envio.numero)}</p>
              <p className="text-sm">{envio.destinatarioNombre}</p>
            </div>
            <Badge variant="outline">{estado}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanillaDetalle({
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
  // del menú cuando falta `planillas:leer`.
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

function EnvioDePlanillaRow({
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
      </div>
      {puedeEntregar && (
        <div className="flex gap-2">
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
