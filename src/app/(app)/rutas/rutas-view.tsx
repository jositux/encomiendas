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
import { createRutaAction, removeRutaAction, updateRutaAction } from "@/server/actions";
import { sucursalNombre } from "@/lib/mock/sucursales";
import { localidadNombre } from "@/lib/mock/localidades";
import { personalNombre } from "@/lib/mock/personal";
import { cn } from "@/lib/utils";
import type { GrupoRuta, Sucursal, Localidad, Personal } from "@/types";

export function RutasView({
  rutas,
  sucursales,
  localidades,
  personal,
}: {
  rutas: GrupoRuta[];
  sucursales: Sucursal[];
  localidades: Localidad[];
  personal: Personal[];
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(rutas[0]?.id ?? null);
  const [nuevoNombre, setNuevoNombre] = React.useState("");

  const selected = rutas.find((r) => r.id === selectedId) ?? null;

  async function handleCreate() {
    if (!nuevoNombre.trim()) return;
    const created = await createRutaAction({
      nombre: nuevoNombre.trim(),
      sucursalProcesaId: sucursales[0].id,
      localidadIds: [],
      activo: true,
    });
    setNuevoNombre("");
    setSelectedId(created.id);
    toast.success("Grupo de ruta creado");
  }

  return (
    <div>
      <PageHeader
        title="Grupos de ruta"
        description="Rutas de reparto, sucursal que procesa y localidades cubiertas."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm">Nombre del nuevo grupo</CardTitle>
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
                <Badge variant="outline">{sucursalNombre(r.sucursalProcesaId)}</Badge>
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
                description="Elegí un grupo de ruta de la lista para editar su sucursal, chofer y localidades."
              />
            ) : (
              <>
                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">Sucursal que procesa</label>
                  <Select
                    value={selected.sucursalProcesaId}
                    onValueChange={(v) => updateRutaAction(selected.id, { sucursalProcesaId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">Chofer</label>
                  <Select
                    value={selected.choferId ?? "none"}
                    onValueChange={(v) =>
                      updateRutaAction(selected.id, { choferId: v === "none" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {personal.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.apellidoNombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected.choferId && (
                    <p className="text-xs text-muted-foreground">
                      Actual: {personalNombre(selected.choferId)}
                    </p>
                  )}
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
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...selected.localidadIds, l.id]
                                : selected.localidadIds.filter((id) => id !== l.id);
                              updateRutaAction(selected.id, { localidadIds: next });
                            }}
                          />
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0 text-muted-foreground" />
                            {localidadNombre(l.id)}
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
                  onClick={async () => {
                    await removeRutaAction(selected.id);
                    setSelectedId(null);
                    toast.success("Grupo de ruta eliminado");
                  }}
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
