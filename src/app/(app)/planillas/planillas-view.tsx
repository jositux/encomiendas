"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPlanillasAction, buscarPlanillaPorCodigoAction } from "@/server/actions";
import { BuscadorPlanillaPorCodigo, PlanillaDetalle } from "@/components/custodia/planilla-parts";
import type { DespachoApi, PlanillaApi } from "@/server/services/custodia";
import type { LocalidadBackend } from "@/types";

// NOTA-2026-09-28-03 (menús por rol): todo lo que el operador usaba dentro
// de /chofer para trabajar con planillas -- buscar por código, buscar por
// Despacho + Localidad de destino (gateado por `despachos:leer`, permiso
// de oficina que el operador sí tiene), y el detalle con Cargar/Recibir --
// se movió a esta pantalla propia. La búsqueda por despacho/localidad de
// acá es la misma que tenía chofer-view.tsx antes de que
// NOTA-2026-09-28-01 la sacara de esa pantalla (recuperada de
// `git show c241a87^` -- ver esa nota en chofer/page.tsx): tenía sentido
// sacarla de /chofer porque un chofer real nunca tiene `despachos:leer`,
// pero acá vuelve a tener sentido porque esta pantalla es del operador.
// Las acciones por envío (Entregar/Intento fallido/Incidencia) siguen
// gateadas por `entregas:registrar` dentro de PlanillaDetalle/
// EnvioDePlanillaRow -- el operador no lo tiene, así que no las ve, igual
// que hoy dentro de /chofer.
export function PlanillasView({
  despachos,
  localidades,
  puedeVerDespachos,
  permisos,
}: {
  despachos: DespachoApi[];
  localidades: LocalidadBackend[];
  puedeVerDespachos: boolean;
  permisos: string[];
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
          // devolver sus envíos (pasan a seguimiento individual, ya
          // sueltos de la planilla). Si no conserváramos la última lista
          // no vacía, la UI perdería la referencia a esos envíos justo
          // cuando hace falta entregarlos/marcar intento o incidencia uno
          // por uno — se mantiene la lista anterior cuando el backend ya
          // no la manda.
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
        title="Planillas"
        description="Buscar, cargar y recibir planillas por código o por despacho y localidad de destino."
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
                    <span className="text-sm text-muted-foreground">
                      {p.localidadDestinoNombre} · {p.sectorDestinoNombre}
                    </span>
                    <span className="text-sm">
                      {p.envios.length} envío{p.envios.length === 1 ? "" : "s"}
                    </span>
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
    </div>
  );
}
