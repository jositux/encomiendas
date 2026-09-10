"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserCheck, MapPin, PackageX } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { EnvioApi } from "@/server/services/envios";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { PuntoBackend } from "@/types";

// La guía real (letra+número, ej. "C1") que usa el negocio en mostrador
// viene en guiaDiaria — no en `numero` (correlativo interno). Mismo criterio
// que nueva-view.tsx (confirmado en vivo ahí).
function guiaDeEnvio(e: EnvioApi): string {
  return e.guiaDiaria ?? e.numero ?? e.id?.slice(0, 8) ?? "—";
}

export function CustodiaView({
  envios,
  usuarios,
  puntos,
}: {
  envios: EnvioApi[];
  usuarios: UsuarioApi[];
  puntos: PuntoBackend[];
}) {
  const usuarioNombre = React.useMemo(() => {
    const map = new Map(usuarios.map((u) => [u.id, u.nombre]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : null);
  }, [usuarios]);

  const puntoNombre = React.useMemo(() => {
    const map = new Map(puntos.map((p) => [p.id, p.nombre]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : null);
  }, [puntos]);

  const columns = React.useMemo<ColumnDef<EnvioApi>[]>(
    () => [
      {
        id: "guia",
        header: "Guía",
        cell: ({ row }) => <span className="font-mono font-semibold">#{guiaDeEnvio(row.original)}</span>,
      },
      {
        id: "trayecto",
        header: "Remitente → Destinatario",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.remitenteNombre ?? "—"} → {row.original.destinatarioNombre ?? "—"}
          </span>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) =>
          row.original.estadoActual ? (
            <Badge variant="outline">{row.original.estadoActual}</Badge>
          ) : (
            "—"
          ),
      },
      {
        id: "custodia",
        header: "Custodia actual",
        cell: ({ row }) => {
          const nombre = usuarioNombre(row.original.custodiaActualUsuarioId);
          return nombre ? (
            <Badge variant="info" className="gap-1">
              <UserCheck className="size-3" /> {nombre}
            </Badge>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <PackageX className="size-3.5" /> Sin asignar
            </span>
          );
        },
      },
      {
        id: "punto",
        header: "En qué punto",
        cell: ({ row }) => {
          const nombre = puntoNombre(row.original.custodiaActualPuntoId);
          return nombre ? (
            <span className="flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 text-muted-foreground" /> {nombre}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "fecha",
        header: "Alta",
        cell: ({ row }) =>
          row.original.creadoEn ? (
            <span className="text-sm text-muted-foreground">
              {new Date(row.original.creadoEn).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          ) : (
            "—"
          ),
      },
    ],
    [usuarioNombre, puntoNombre]
  );

  return (
    <div>
      <PageHeader
        title="Custodia"
        description="Quién tiene cada envío ahora y en qué punto está — dato de custodia que ya trae el backend por cada encomienda."
      />

      <DataTable
        columns={columns}
        data={envios}
        searchPlaceholder="Buscar por guía, remitente o destinatario..."
        emptyTitle="No hay envíos cargados"
        pageSize={15}
      />

      <p className="mt-3 text-xs text-muted-foreground">
        Muestra la custodia actual de cada envío (el último dato que tiene el backend). Todavía no
        confirmamos si existe un historial de movimientos de custodia a través del tiempo — por
        ahora esta pantalla es una foto del estado actual, no una línea de tiempo.
      </p>
    </div>
  );
}
