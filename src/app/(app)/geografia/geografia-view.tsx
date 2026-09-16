"use client";

import * as React from "react";
import { toast } from "sonner";
import { MapPinned, Compass, Plus, Pencil } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalidadesView } from "../localidades/localidades-view";
import { SucursalesView } from "../sucursales/sucursales-view";
import { createProvinciaAction, updateProvinciaAction, createSectorAction, updateSectorAction } from "@/server/actions";
import type { LocalidadBackend, PuntoBackend } from "@/types";
import type { ProvinciaApi } from "@/server/services/provincias";
import type { SectorApi } from "@/server/services/sectores";

// Un solo item de menú para los cinco conceptos geográficos del backend
// (Provincia, Localidad, Sector, Zona, Punto) en vez de tenerlos repartidos
// en pantallas sueltas. 2026-09-16: Provincia y Sector pasaron a tener
// alta+edición también (confirmado en vivo — ver sección 20 del plan de
// integración) — las cinco pestañas tienen alta+edición ahora, excepto
// "Zona" en sí, que sigue sin pantalla ni concepto propio del lado del
// frontend (el campo `zonaId` de cada sector viene `null` en los datos
// reales, no hay endpoint de zona confirmado).
export function GeografiaView({
  provincias,
  localidades,
  sectores,
  puntos,
}: {
  provincias: ProvinciaApi[];
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  puntos: PuntoBackend[];
}) {
  const localidadNombre = React.useMemo(() => {
    const map = new Map(localidades.map((l) => [l.id, l.nombre]));
    return (id: string) => map.get(id) ?? "—";
  }, [localidades]);

  const [provinciaAEditar, setProvinciaAEditar] = React.useState<ProvinciaApi | null>(null);
  const [sectorAEditar, setSectorAEditar] = React.useState<SectorApi | null>(null);

  return (
    <div>
      <PageHeader
        title="Geografía"
        description="Provincias, localidades, sectores, zonas y puntos de la empresa, todo en un solo lugar."
      />

      <Tabs defaultValue="localidades">
        <TabsList>
          <TabsTrigger value="provincias">Provincias</TabsTrigger>
          <TabsTrigger value="localidades">Localidades</TabsTrigger>
          <TabsTrigger value="sectores">Sectores y zonas</TabsTrigger>
          <TabsTrigger value="puntos">Puntos y sucursales</TabsTrigger>
        </TabsList>

        <TabsContent value="provincias" className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{provincias.length} provincias cargadas.</p>
            <ProvinciaFormDialog />
          </div>
          {provincias.length === 0 ? (
            <EmptyState icon={MapPinned} title="No hay provincias cargadas" />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Provincia</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provincias.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="flex items-center gap-2 font-medium">
                        <MapPinned className="size-3.5 text-muted-foreground" />
                        {p.nombre}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setProvinciaAEditar(p)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {provinciaAEditar && (
            <ProvinciaFormDialog
              provincia={provinciaAEditar}
              open={!!provinciaAEditar}
              onOpenChange={(v) => !v && setProvinciaAEditar(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="localidades" className="mt-4">
          <LocalidadesView localidades={localidades} provincias={provincias} embedded />
        </TabsContent>

        <TabsContent value="sectores" className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{sectores.length} sectores cargados.</p>
            <SectorFormDialog localidades={localidades} />
          </div>
          {sectores.length === 0 ? (
            <EmptyState icon={Compass} title="No hay sectores cargados" />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sector</TableHead>
                    <TableHead>Localidad</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {localidadNombre(s.localidadId)}
                      </TableCell>
                      <TableCell>
                        {s.zonaId ? (
                          <Badge variant="outline">{s.zonaId}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin zona</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setSectorAEditar(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            La columna Zona muestra el id tal como lo devuelve el backend porque todavía no hay una
            pantalla de zonas con nombre propio (alta/edición de sector no la tocan).
          </p>

          {sectorAEditar && (
            <SectorFormDialog
              localidades={localidades}
              sector={sectorAEditar}
              open={!!sectorAEditar}
              onOpenChange={(v) => !v && setSectorAEditar(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="puntos" className="mt-4">
          <SucursalesView sucursales={puntos} localidades={localidades} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Alta/edición de Provincia — POST/PATCH /provincias confirmados en vivo
// 2026-09-16 (ver provincias.ts). Mismo patrón controlado/no-controlado
// que LocalidadFormDialog y cliente-form-dialog.tsx.
function ProvinciaFormDialog({
  provincia,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  provincia?: ProvinciaApi;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const esEdicion = !!provincia;
  const [openUncontrolled, setOpenUncontrolled] = React.useState(false);
  const open = openControlled ?? openUncontrolled;
  const [nombre, setNombre] = React.useState(provincia?.nombre ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) setNombre(provincia?.nombre ?? "");
    onOpenChangeControlled?.(next);
    setOpenUncontrolled(next);
  }

  async function handleSubmit() {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre de la provincia.");
      return;
    }
    setSubmitting(true);
    try {
      const resultado =
        esEdicion && provincia
          ? await updateProvinciaAction(provincia.id, { nombre: nombre.trim() })
          : await createProvinciaAction({ nombre: nombre.trim() });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(esEdicion ? "Provincia actualizada" : "Provincia agregada");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la provincia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {openControlled === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-1.5">
            <Plus className="size-4" /> Nueva provincia
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar provincia" : "Nueva provincia"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {esEdicion ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Alta/edición de Sector — POST/PATCH /sectores confirmados en vivo
// 2026-09-16 (ver sectores.ts). No pide zona: no hay pantalla ni concepto
// propio de "zona" del lado del frontend todavía.
function SectorFormDialog({
  localidades,
  sector,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  localidades: LocalidadBackend[];
  sector?: SectorApi;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const esEdicion = !!sector;
  const [openUncontrolled, setOpenUncontrolled] = React.useState(false);
  const open = openControlled ?? openUncontrolled;
  const [nombre, setNombre] = React.useState(sector?.nombre ?? "");
  const [localidadId, setLocalidadId] = React.useState(
    sector?.localidadId ?? localidades[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) {
      setNombre(sector?.nombre ?? "");
      setLocalidadId(sector?.localidadId ?? localidades[0]?.id ?? "");
    }
    onOpenChangeControlled?.(next);
    setOpenUncontrolled(next);
  }

  async function handleSubmit() {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre del sector.");
      return;
    }
    if (!localidadId) {
      toast.error("Elegí una localidad.");
      return;
    }
    setSubmitting(true);
    try {
      const resultado =
        esEdicion && sector
          ? await updateSectorAction(sector.id, { nombre: nombre.trim(), localidadId })
          : await createSectorAction({ nombre: nombre.trim(), localidadId });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(esEdicion ? "Sector actualizado" : "Sector agregado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el sector.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {openControlled === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-1.5">
            <Plus className="size-4" /> Nuevo sector
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar sector" : "Nuevo sector"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Localidad</Label>
            <Select value={localidadId} onValueChange={setLocalidadId}>
              <SelectTrigger className="w-full">
                <SelectValue />
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {esEdicion ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
