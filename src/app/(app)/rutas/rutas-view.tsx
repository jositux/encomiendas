"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Route as RouteIcon, MapPin, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRutaAction,
  removeRutaAction,
  updateRutaAction,
  setLocalidadesRutaAction,
} from "@/server/actions";
import { cn } from "@/lib/utils";
import type { RecorridoBackend, PuntoBackend, LocalidadBackend } from "@/types";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { VehiculoBackend } from "@/types";

export function RutasView({
  rutas,
  bases,
  localidades,
  usuarios,
  vehiculos,
}: {
  rutas: RecorridoBackend[];
  bases: PuntoBackend[];
  localidades: LocalidadBackend[];
  usuarios: UsuarioApi[];
  vehiculos: VehiculoBackend[];
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(rutas[0]?.id ?? null);
  const [nuevoNombre, setNuevoNombre] = React.useState("");

  const selected = rutas.find((r) => r.id === selectedId) ?? null;

  // Helper compartido: envuelve updateRutaAction (que ahora devuelve
  // ResultadoConDato en vez de la entidad directamente) para que cualquier
  // edición inline (Selects, "Hora de corte", checkboxes de localidades)
  // muestre el detalle real del error de la API en vez de fallar en
  // silencio o dejar pasar un error genérico (ver plan doc, sección 21).
  async function updateRuta(id: string, patch: Parameters<typeof updateRutaAction>[1]) {
    const resultado = await updateRutaAction(id, patch);
    if (!resultado.ok) {
      toast.error(resultado.title, { description: resultado.message });
    }
    return resultado;
  }

  async function handleCreate() {
    if (!nuevoNombre.trim() || !bases[0]) return;
    const resultado = await createRutaAction({
      nombre: nuevoNombre.trim(),
      baseId: bases[0].id,
    });
    if (!resultado.ok) {
      toast.error(resultado.title, { description: resultado.message });
      return;
    }
    setNuevoNombre("");
    setSelectedId(resultado.data.id);
    toast.success("Recorrido creado");
  }

  async function handleRemove() {
    if (!selected) return;
    const resultado = await removeRutaAction(selected.id);
    if (!resultado.ok) {
      toast.error(resultado.title, { description: resultado.message });
      return;
    }
    setSelectedId(null);
    toast.success("Grupo de ruta eliminado");
  }

  async function handleToggleLocalidad(id: string, checked: boolean) {
    if (!selected) return;
    const next = checked
      ? [...selected.localidadIds, id]
      : selected.localidadIds.filter((existing) => existing !== id);
    const resultado = await setLocalidadesRutaAction(selected.id, next);
    if (!resultado.ok) {
      toast.error(resultado.title, { description: resultado.message });
    }
  }

  return (
    <div>
      <PageHeader
        title="Grupos de ruta"
        description="Recorridos, base que procesa y localidades cubiertas."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm">Nombre del nuevo recorrido</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 border-b py-3">
            <Input
              placeholder="Ej: 0 BASE OBERA"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button size="sm" className="gap-1.5" onClick={handleCreate}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          </CardContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {rutas.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 border-b px-4 py-2.5 text-left text-sm hover:bg-accent",
                  selectedId === r.id && "bg-accent"
                )}
              >
                <span className="flex items-center gap-2">
                  <RouteIcon className="size-3.5 text-muted-foreground" />
                  {r.nombre}
                </span>
                <Badge variant="outline">{r.baseNombre}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">
              {selected ? selected.nombre : "Seleccioná un grupo de ruta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            {!selected ? (
              <EmptyState
                icon={RouteIcon}
                title="Sin selección"
                description="Elegí un grupo de ruta de la lista para editar su base, chofer y localidades."
              />
            ) : (
              <>
                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">Base que procesa</label>
                  <Select
                    value={selected.baseId}
                    onValueChange={(v) => updateRuta(selected.id, { baseId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bases.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">Chofer predeterminado</label>
                  <Select
                    value={selected.choferPredeterminadoId ?? "none"}
                    onValueChange={(v) =>
                      updateRuta(selected.id, {
                        choferPredeterminadoId: v === "none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">Vehículo predeterminado</label>
                  <Select
                    value={selected.vehiculoPredeterminadoId ?? "none"}
                    onValueChange={(v) =>
                      updateRuta(selected.id, {
                        vehiculoPredeterminadoId: v === "none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {vehiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nombre}
                          {v.patente ? ` (${v.patente})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Hora de corte (respaldo automático)
                  </label>
                  <Input
                    type="time"
                    defaultValue={selected.horaCorte ?? ""}
                    className="h-8 w-32"
                    onBlur={(e) =>
                      updateRuta(selected.id, { horaCorte: e.target.value || null })
                    }
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Localidades cubiertas ({selected.localidadIds.length})
                  </p>
                  <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                    {localidades.map((l) => {
                      const checked = selected.localidadIds.includes(l.id);
                      return (
                        <label key={l.id} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => handleToggleLocalidad(l.id, !!v)}
                          />
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0 text-muted-foreground" />
                            {l.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleRemove}
                >
                  <Trash2 className="size-3.5" /> Eliminar grupo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
