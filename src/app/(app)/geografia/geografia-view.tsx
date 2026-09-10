"use client";

import * as React from "react";
import { MapPinned, Compass } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import type { LocalidadBackend, PuntoBackend } from "@/types";
import type { ProvinciaApi } from "@/server/services/provincias";
import type { SectorApi } from "@/server/services/sectores";

// Un solo item de menú para los cinco conceptos geográficos del backend
// (Provincia, Localidad, Sector, Zona, Punto) en vez de tenerlos repartidos
// en pantallas sueltas. Cada pestaña respeta lo que el backend soporta hoy
// en cada nivel: Provincia y Sector/Zona son solo lectura (confirmado en
// vivo que no hay alta/edición conectada todavía), Localidad y Punto tienen
// alta+listado / alta+edición como ya estaba.
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
          {provincias.length === 0 ? (
            <EmptyState icon={MapPinned} title="No hay provincias cargadas" />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Provincia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provincias.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="flex items-center gap-2 font-medium">
                        <MapPinned className="size-3.5 text-muted-foreground" />
                        {p.nombre}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Solo lectura: el backend todavía no tiene alta de provincias (hoy solo tiene Misiones cargada).
          </p>
        </TabsContent>

        <TabsContent value="localidades" className="mt-4">
          <LocalidadesView localidades={localidades} provincias={provincias} embedded />
        </TabsContent>

        <TabsContent value="sectores" className="mt-4">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Solo lectura por ahora: todavía no confirmamos que el backend permita crear o editar
            sectores y zonas desde acá. La columna Zona muestra el id tal como lo devuelve el
            backend porque todavía no hay una pantalla de zonas con nombre propio.
          </p>
        </TabsContent>

        <TabsContent value="puntos" className="mt-4">
          <SucursalesView sucursales={puntos} localidades={localidades} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
