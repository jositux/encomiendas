"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, Clock3, Search, X } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilaAcciones } from "@/components/deposito/fila-acciones";
import {
  consultarEnviosAction,
  listFallidosAction,
  listConfirmacionesPendientesAction,
} from "@/server/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import type {
  EstadoEnvio,
  PaginaEnvios,
  EnvioConFallidosApi,
  PendienteConfirmacionApi,
} from "@/server/services/consultas";
import type { EnvioApi } from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { LocalidadBackend } from "@/types";

// Pantalla real de Depósito (reemplaza la vieja pantalla 100% mock) —
// contrato completo del equipo de backend, "Nota 1 — Pantalla de
// Depósito" (2026-09-18), ver claude/plan-integracion-backend.md sección
// 35. Reglas clave que este archivo respeta:
//   1. Un solo endpoint (`GET /consultas/envios`) alimenta las 6 pestañas
//      principales — las pestañas se arman con `estado` + `ubicacion` de
//      cada fila, NUNCA con un estado propio inventado del lado del
//      cliente (por eso "En tránsito"/"Para entregar" piden el MISMO
//      estado EN_CUSTODIA y se separan acá abajo por `ubicacion`, ya que
//      el backend no tiene un query param `ubicacion`).
//   2. Dos pestañas más, de solo lectura, para que los casos no se
//      acumulen en silencio: Fallidos (`GET /consultas/fallidos`) y
//      Confirmaciones pendientes (`GET /confirmaciones/pendientes`).
//   3. Nada se borra: "Anular" dejó un evento a nombre de quien lo hizo.
//   4. Después de cada mutación se refresca la pestaña actual pidiendo
//      datos de nuevo — nunca se mueve una fila "a mano" del lado del
//      cliente.
//   5. "Devolver" queda explícitamente FUERA de esta primera etapa
//      (nota del backend: "hablemos antes de implementar algo").
type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info";

const ESTADO_LABEL: Record<string, string> = {
  ALTA_INCOMPLETA: "Alta incompleta",
  REGISTRADO: "Registrado",
  EN_CUSTODIA: "En custodia",
  ENTREGADO: "Entregado",
  CONFIRMADO: "Confirmado",
  ANULADO: "Anulado",
};

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  ALTA_INCOMPLETA: "outline",
  REGISTRADO: "secondary",
  EN_CUSTODIA: "info",
  ENTREGADO: "warning",
  CONFIRMADO: "success",
  ANULADO: "destructive",
};

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

const UBICACION_VARIANT: Record<string, BadgeVariant> = {
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

// La guía real (letra+número, ej. "C1") que usa el negocio en mostrador
// viene en `guiaDiaria` — no en `numero` (correlativo interno). Mismo
// criterio ya confirmado y usado en custodia-view.tsx/nueva-view.tsx.
function guiaDeEnvio(e: EnvioApi): string {
  return (e.guiaDiaria as string | undefined) || e.numero || e.id?.slice(0, 8) || "—";
}

type TabKey =
  | "pendientes"
  | "en_transito"
  | "para_entregar"
  | "entregadas"
  | "confirmadas"
  | "anuladas"
  | "fallidos"
  | "confirmaciones";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "en_transito", label: "En tránsito" },
  { key: "para_entregar", label: "Para entregar" },
  { key: "entregadas", label: "Entregadas" },
  { key: "confirmadas", label: "Confirmadas" },
  { key: "anuladas", label: "Anuladas" },
  { key: "fallidos", label: "Fallidos" },
  { key: "confirmaciones", label: "Conf. pendientes" },
];

// Pestaña -> `estado` real que se pide a /consultas/envios. "en_transito" y
// "para_entregar" comparten el mismo estado (EN_CUSTODIA); se separan más
// abajo por `ubicacion` (regla 1 del comentario de arriba).
const ESTADO_POR_TAB: Partial<Record<TabKey, EstadoEnvio>> = {
  pendientes: "REGISTRADO",
  en_transito: "EN_CUSTODIA",
  para_entregar: "EN_CUSTODIA",
  entregadas: "ENTREGADO",
  confirmadas: "CONFIRMADO",
  anuladas: "ANULADO",
};

function esTabDeEnvios(tab: TabKey): boolean {
  return tab in ESTADO_POR_TAB;
}

export function DepositoView({
  inicial,
  localidades,
  sectores,
  usuarios,
  permisos,
}: {
  inicial: PaginaEnvios;
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  usuarios: UsuarioApi[];
  permisos: string[];
}) {
  const [tab, setTab] = React.useState<TabKey>("pendientes");
  const [cargando, setCargando] = React.useState(false);
  const [envios, setEnvios] = React.useState<EnvioApi[]>(inicial.datos);
  const [fallidos, setFallidos] = React.useState<EnvioConFallidosApi[]>([]);
  const [pendientesConfirmar, setPendientesConfirmar] = React.useState<PendienteConfirmacionApi[]>([]);

  // Filtros de /consultas/envios (pestañas principales).
  const [numero, setNumero] = React.useState("");
  const [guia, setGuia] = React.useState("");
  const [fechaGuia, setFechaGuia] = React.useState("");
  const [localidadDestinoId, setLocalidadDestinoId] = React.useState("__todas");
  const [desde, setDesde] = React.useState("");
  const [hasta, setHasta] = React.useState("");

  // Filtro propio de Confirmaciones pendientes.
  const [fechaConfirmaciones, setFechaConfirmaciones] = React.useState("");
  const [choferId, setChoferId] = React.useState("__todos");

  const localidadNombre = React.useCallback(
    (id: string) => localidades.find((l) => l.id === id)?.nombre ?? "—",
    [localidades]
  );

  const cargarEnvios = React.useCallback(
    async (t: TabKey) => {
      const estado = ESTADO_POR_TAB[t];
      if (!estado) return;
      setCargando(true);
      try {
        const pagina = await consultarEnviosAction({
          estado,
          numero: numero.trim() || undefined,
          guia: guia.trim() || undefined,
          fecha: guia.trim() ? fechaGuia || undefined : undefined,
          localidadDestinoId: localidadDestinoId === "__todas" ? undefined : localidadDestinoId,
          desde: desde || undefined,
          hasta: hasta || undefined,
        });
        setEnvios(pagina.datos);
      } catch (err) {
        toast.error("No se pudo cargar la lista de envíos", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setCargando(false);
      }
    },
    [numero, guia, fechaGuia, localidadDestinoId, desde, hasta]
  );

  const cargarFallidos = React.useCallback(async () => {
    setCargando(true);
    try {
      const datos = await listFallidosAction({
        localidadDestinoId: localidadDestinoId === "__todas" ? undefined : localidadDestinoId,
      });
      setFallidos(datos);
    } catch (err) {
      toast.error("No se pudo cargar los envíos con intentos fallidos", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCargando(false);
    }
  }, [localidadDestinoId]);

  const cargarConfirmaciones = React.useCallback(async () => {
    setCargando(true);
    try {
      const datos = await listConfirmacionesPendientesAction({
        fecha: fechaConfirmaciones || undefined,
        choferId: choferId === "__todos" ? undefined : choferId,
      });
      setPendientesConfirmar(datos);
    } catch (err) {
      toast.error("No se pudo cargar las confirmaciones pendientes", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCargando(false);
    }
  }, [fechaConfirmaciones, choferId]);

  const refrescarTabActual = React.useCallback(async () => {
    if (esTabDeEnvios(tab)) await cargarEnvios(tab);
    else if (tab === "fallidos") await cargarFallidos();
    else await cargarConfirmaciones();
  }, [tab, cargarEnvios, cargarFallidos, cargarConfirmaciones]);

  // Al cambiar de pestaña se vuelve a pedir esa pestaña — excepto la
  // primera vez con "Pendientes", que ya llega resuelta desde el servidor
  // (page.tsx). El `useEffect` no hace ningún `setState` síncrono propio:
  // solo dispara la función async de arriba, que ya maneja su propio
  // loading/error — evita el problema de `react-hooks/set-state-in-effect`.
  const primerRender = React.useRef(true);
  React.useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      if (tab === "pendientes") return;
    }
    void refrescarTabActual();
    // Deliberado: solo se dispara al cambiar de pestaña. Cambiar un filtro
    // no dispara esto solo — el usuario confirma con "Buscar" (abajo), para
    // no golpear al backend en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function buscar() {
    void refrescarTabActual();
  }

  function limpiarFiltros() {
    setNumero("");
    setGuia("");
    setFechaGuia("");
    setLocalidadDestinoId("__todas");
    setDesde("");
    setHasta("");
  }

  // "En tránsito" vs "Para entregar" — mismo `estado` (EN_CUSTODIA),
  // separados acá por `ubicacion` de cada fila (regla 1, arriba).
  const enviosVisibles = React.useMemo(() => {
    if (tab === "en_transito") return envios.filter((e) => e.ubicacion !== "en_reparto");
    if (tab === "para_entregar") return envios.filter((e) => e.ubicacion === "en_reparto");
    return envios;
  }, [envios, tab]);

  const columnasEnvios = React.useMemo<ColumnDef<EnvioApi>[]>(
    () => [
      {
        id: "guia",
        header: "Guía",
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-semibold">#{guiaDeEnvio(row.original)}</span>
            <p className="text-xs text-muted-foreground">{row.original.numero}</p>
          </div>
        ),
      },
      {
        id: "trayecto",
        header: "Remitente → Destinatario",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.remitenteNombre || "—"} → {row.original.destinatarioNombre || "—"}
          </span>
        ),
      },
      {
        id: "destino",
        header: "Destino",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {localidadNombre(row.original.localidadDestinoId)}
          </span>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={ESTADO_VARIANT[row.original.estadoActual] ?? "outline"}>
            {ESTADO_LABEL[row.original.estadoActual] ?? row.original.estadoActual}
          </Badge>
        ),
      },
      {
        id: "ubicacion",
        header: "Ubicación",
        cell: ({ row }) => (
          <Badge variant={UBICACION_VARIANT[row.original.ubicacion] ?? "outline"}>
            {UBICACION_LABEL[row.original.ubicacion] ?? row.original.ubicacion}
          </Badge>
        ),
      },
      {
        id: "fecha",
        header: "Alta",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.creadoEn)}</span>
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <FilaAcciones
            envio={row.original}
            sectores={sectores}
            usuarios={usuarios}
            permisos={permisos}
            onRefrescar={refrescarTabActual}
          />
        ),
      },
    ],
    [localidadNombre, sectores, usuarios, permisos, refrescarTabActual]
  );

  const columnasFallidos = React.useMemo<ColumnDef<EnvioConFallidosApi>[]>(
    () => [
      {
        id: "numero",
        header: "Envío",
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.numero}</span>,
      },
      {
        id: "destino",
        header: "Destino",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {localidadNombre(row.original.localidadDestinoId)}
          </span>
        ),
      },
      {
        id: "intentos",
        header: "Intentos",
        cell: ({ row }) => (
          <Badge variant={row.original.cantidadIntentos >= 3 ? "destructive" : "warning"}>
            <AlertTriangle className="size-3" /> {row.original.cantidadIntentos}
          </Badge>
        ),
      },
      {
        id: "motivo",
        header: "Último motivo",
        cell: ({ row }) => <span className="text-sm">{row.original.ultimoMotivo || "—"}</span>,
      },
      {
        id: "ultimoIntento",
        header: "Último intento",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(row.original.ultimoIntentoEn)}</span>
        ),
      },
    ],
    [localidadNombre]
  );

  const columnasConfirmaciones = React.useMemo<ColumnDef<PendienteConfirmacionApi>[]>(
    () => [
      {
        id: "numero",
        header: "Envío",
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.numero}</span>,
      },
      {
        id: "destinatario",
        header: "Destinatario",
        cell: ({ row }) => <span className="text-sm">{row.original.destinatarioNombre || "—"}</span>,
      },
      {
        id: "recibidoPor",
        header: "Recibido por",
        cell: ({ row }) => <span className="text-sm">{row.original.recibidoPor || "—"}</span>,
      },
      {
        id: "entregadoEn",
        header: "Entregado",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(row.original.entregadoEn)}</span>
        ),
      },
      {
        id: "chofer",
        header: "Chofer",
        cell: ({ row }) => (
          <Badge variant="info" className="gap-1">
            <Clock3 className="size-3" /> {row.original.choferNombre || "—"}
          </Badge>
        ),
      },
    ],
    []
  );

  const esTabPrincipal = esTabDeEnvios(tab);

  return (
    <div>
      <PageHeader
        title="Depósito"
        description="Vista operativa de los envíos en tu punto — todo el dato sale de /consultas/envios; las pestañas siguen estado + ubicación reales, no un estado propio."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={buscar} disabled={cargando}>
            <RefreshCw className={cargando ? "size-4 animate-spin" : "size-4"} /> Actualizar
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {esTabPrincipal && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-numero">Número</Label>
              <Input
                id="dep-f-numero"
                className="w-36"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-guia">Guía</Label>
              <Input
                id="dep-f-guia"
                className="w-28"
                value={guia}
                onChange={(e) => setGuia(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-fecha-guia">Fecha de guía</Label>
              <Input
                id="dep-f-fecha-guia"
                type="date"
                className="w-40"
                value={fechaGuia}
                onChange={(e) => setFechaGuia(e.target.value)}
                disabled={!guia.trim()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Localidad destino</Label>
              <Select value={localidadDestinoId} onValueChange={setLocalidadDestinoId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas">Todas</SelectItem>
                  {localidades.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-desde">Desde</Label>
              <Input
                id="dep-f-desde"
                type="date"
                className="w-40"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-hasta">Hasta</Label>
              <Input
                id="dep-f-hasta"
                type="date"
                className="w-40"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <Button size="sm" className="gap-1.5" onClick={buscar} disabled={cargando}>
              <Search className="size-4" /> Buscar
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={limpiarFiltros}>
              <X className="size-4" /> Limpiar
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "fallidos" && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="grid gap-1.5">
              <Label>Localidad destino</Label>
              <Select value={localidadDestinoId} onValueChange={setLocalidadDestinoId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas">Todas</SelectItem>
                  {localidades.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1.5" onClick={buscar} disabled={cargando}>
              <Search className="size-4" /> Buscar
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "confirmaciones" && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="dep-f-fecha-conf">Fecha</Label>
              <Input
                id="dep-f-fecha-conf"
                type="date"
                className="w-40"
                value={fechaConfirmaciones}
                onChange={(e) => setFechaConfirmaciones(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Chofer</Label>
              <Select value={choferId} onValueChange={setChoferId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos">Todos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1.5" onClick={buscar} disabled={cargando}>
              <Search className="size-4" /> Buscar
            </Button>
          </CardContent>
        </Card>
      )}

      {esTabPrincipal && (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {enviosVisibles.length} resultado{enviosVisibles.length === 1 ? "" : "s"}
          </p>
          <DataTable
            columns={columnasEnvios}
            data={enviosVisibles}
            searchPlaceholder="Buscar en esta pestaña..."
            emptyTitle="Sin envíos"
            emptyDescription="No hay envíos que coincidan con esta pestaña y estos filtros."
            pageSize={15}
          />
        </>
      )}

      {tab === "fallidos" && (
        <DataTable
          columns={columnasFallidos}
          data={fallidos}
          searchPlaceholder="Buscar..."
          emptyTitle="Sin intentos fallidos"
          emptyDescription="No hay envíos en custodia con intentos de entrega fallidos."
          pageSize={15}
        />
      )}

      {tab === "confirmaciones" && (
        <DataTable
          columns={columnasConfirmaciones}
          data={pendientesConfirmar}
          searchPlaceholder="Buscar..."
          emptyTitle="Sin confirmaciones pendientes"
          emptyDescription="No hay entregas del día esperando confirmación."
          pageSize={15}
        />
      )}
    </div>
  );
}
