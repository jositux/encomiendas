"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Truck, PackageCheck, Inbox, FileSpreadsheet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EncomiendaDetailSheet } from "@/components/encomiendas/encomienda-detail-sheet";
import { encomiendaMatches } from "@/components/encomiendas/encomienda-table";
import { updateEncomiendaAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import { sucursalNombre } from "@/lib/mock/sucursales";
import { personalNombre } from "@/lib/mock/personal";
import { ESTADO_LABEL, TIPO_LABEL } from "@/lib/mock/encomiendas";
import { formatDate } from "@/lib/format";
import { exportToXlsx, type ExportColumn } from "@/lib/spreadsheet-export";
import type { Encomienda, EstadoEncomienda, Personal } from "@/types";

type TabKey = "PENDIENTE" | "EN_TRANSITO" | "PARA_ENTREGAR" | "ENTREGADA" | "DEVUELTA" | "TODAS";

const TABS: { key: TabKey; label: string }[] = [
  { key: "PENDIENTE", label: "Pendientes" },
  { key: "EN_TRANSITO", label: "En tránsito" },
  { key: "PARA_ENTREGAR", label: "Para entregar" },
  { key: "ENTREGADA", label: "Entregadas" },
  { key: "DEVUELTA", label: "Devueltas" },
  { key: "TODAS", label: "Todas" },
];

const NEXT_ACTION: Partial<
  Record<
    EstadoEncomienda,
    {
      next: EstadoEncomienda;
      label: string;
      icon: typeof Truck;
      variant?: "default" | "success" | "outline";
      toastLabel: string;
    }
  >
> = {
  PENDIENTE: { next: "EN_TRANSITO", label: "Levantar", icon: Truck, toastLabel: "marcada en tránsito" },
  EN_TRANSITO: {
    next: "PARA_ENTREGAR",
    label: "Recibir",
    icon: PackageCheck,
    variant: "success",
    toastLabel: "recibida en depósito",
  },
  PARA_ENTREGAR: {
    next: "ENTREGADA",
    label: "Marcar entregada",
    icon: PackageCheck,
    variant: "success",
    toastLabel: "marcada como entregada",
  },
};

const EXPORT_COLUMNS: ExportColumn<Encomienda>[] = [
  { header: "Remito", value: (e) => e.remito, width: 12 },
  { header: "Fecha", value: (e) => formatDate(e.fechaAlta), width: 10 },
  { header: "Remitente", value: (e) => e.origen.nombre, width: 22 },
  { header: "Teléfono remitente", value: (e) => e.origen.telefono, width: 16 },
  { header: "Destinatario", value: (e) => e.destino.nombre, width: 22 },
  { header: "Teléfono destinatario", value: (e) => e.destino.telefono, width: 16 },
  { header: "Dirección destino", value: (e) => e.destino.direccion, width: 26 },
  { header: "Localidad destino", value: (e) => localidadNombre(e.destino.localidadId), width: 16 },
  { header: "Tipo", value: (e) => TIPO_LABEL[e.tipo], width: 16 },
  { header: "Estado", value: (e) => ESTADO_LABEL[e.estado], width: 14 },
  { header: "Designado", value: (e) => personalNombre(e.designadoId), width: 18 },
  { header: "Bultos", value: (e) => e.bultos, width: 8 },
  { header: "Flete", value: (e) => e.flete, width: 10 },
  { header: "Monto CRR", value: (e) => e.montoCrr ?? "", width: 12 },
];

export function DepositoView({
  encomiendas,
  repartidores,
  sucursalId,
}: {
  encomiendas: Encomienda[];
  repartidores: Personal[];
  sucursalId: string | null;
}) {
  const [tab, setTab] = React.useState<TabKey>("PENDIENTE");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Encomienda | null>(null);
  const [open, setOpen] = React.useState(false);
  // Radix Select cierra su listbox en el pointerdown, y el click resultante
  // "cae" sobre lo que haya debajo del cursor una vez cerrado — en esta
  // vista, la fila de la tabla, que abre el detalle. Esto no pasaba en la
  // vieja pantalla de Designaciones porque esa tabla no tenía onRowClick.
  // Se ignora el próximo click de fila justo después de elegir un
  // repartidor en el Select inline.
  const suppressRowClickRef = React.useRef(false);

  // Las eliminadas (soft-delete, vía "Eliminar" en el detalle) nunca se
  // listan acá — mismo comportamiento que tenían las 5 pantallas viejas.
  const activas = React.useMemo(
    () => encomiendas.filter((e) => e.estado !== "ELIMINADA"),
    [encomiendas]
  );

  const rowsByTab = React.useMemo(() => {
    const map = new Map<TabKey, Encomienda[]>();
    for (const t of TABS) {
      map.set(
        t.key,
        t.key === "TODAS" ? activas : activas.filter((e) => e.estado === t.key)
      );
    }
    return map;
  }, [activas]);

  const rows = rowsByTab.get(tab) ?? [];

  async function avanzar(e: Encomienda) {
    const accion = NEXT_ACTION[e.estado];
    if (!accion) return;
    setBusyId(e.id);
    await updateEncomiendaAction(e.id, {
      estado: accion.next,
      sucursalId: accion.next === "PARA_ENTREGAR" ? (sucursalId ?? e.sucursalId) : e.sucursalId,
      fechaFinalizado: accion.next === "ENTREGADA" ? new Date().toISOString() : e.fechaFinalizado,
      fechaBaja: accion.next === "ENTREGADA" ? new Date().toISOString() : e.fechaBaja,
    });
    setBusyId(null);
    toast.success(`Encomienda #${e.remito} ${accion.toastLabel}`);
  }

  async function avanzarLote(items: Encomienda[]) {
    if (items.length === 0) return;
    await Promise.all(items.map((e) => avanzar(e)));
  }

  async function asignar(e: Encomienda, personalId: string) {
    await updateEncomiendaAction(e.id, { designadoId: personalId });
    const persona = repartidores.find((p) => p.id === personalId);
    toast.success(`#${e.remito} asignada a ${persona?.apellidoNombre ?? "repartidor"}`);
  }

  function handleExport() {
    if (rows.length === 0) {
      toast.error("No hay encomiendas para exportar en esta pestaña.");
      return;
    }
    const fecha = new Date().toISOString().slice(0, 10);
    const tabInfo = TABS.find((t) => t.key === tab)!;
    exportToXlsx(
      `deposito-${tab.toLowerCase()}-${fecha}.xlsx`,
      tabInfo.label,
      EXPORT_COLUMNS,
      rows
    );
    toast.success(`${rows.length} encomienda${rows.length === 1 ? "" : "s"} exportada${rows.length === 1 ? "" : "s"}.`);
  }

  const columns = React.useMemo<ColumnDef<Encomienda>[]>(
    () => [
      {
        accessorKey: "remito",
        header: "Remito",
        cell: ({ row }) => <span className="font-mono font-medium">#{row.original.remito}</span>,
      },
      { accessorKey: "fechaAlta", header: "Fecha", cell: ({ row }) => formatDate(row.original.fechaAlta) },
      {
        id: "origen",
        header: "Origen",
        cell: ({ row }) => (
          <div>
            <p className="max-w-36 truncate">{row.original.origen.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {sucursalNombre(row.original.sucursalId)}
            </p>
          </div>
        ),
      },
      {
        id: "destinatario",
        header: "Destinatario",
        cell: ({ row }) => (
          <div>
            <p className="max-w-40 truncate font-medium">{row.original.destino.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {localidadNombre(row.original.destino.localidadId)}
            </p>
          </div>
        ),
      },
      { accessorKey: "tipo", header: "Tipo", cell: ({ row }) => <TipoBadge tipo={row.original.tipo} /> },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
      },
      {
        id: "designado",
        header: "Designado",
        cell: ({ row }) =>
          row.original.estado === "PARA_ENTREGAR" ? (
            <Select
              value={row.original.designadoId ?? "none"}
              onValueChange={(v) => {
                suppressRowClickRef.current = true;
                window.setTimeout(() => {
                  suppressRowClickRef.current = false;
                }, 300);
                asignar(row.original, v);
              }}
            >
              <SelectTrigger className="w-44" onClick={(ev) => ev.stopPropagation()}>
                <SelectValue placeholder="Sin designar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Sin designar
                </SelectItem>
                {repartidores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.apellidoNombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">{personalNombre(row.original.designadoId)}</span>
          ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => {
          const accion = NEXT_ACTION[row.original.estado];
          if (!accion) return null;
          const Icon = accion.icon;
          return (
            <Button
              size="sm"
              variant={accion.variant ?? "default"}
              className="gap-1.5"
              disabled={busyId === row.original.id}
              onClick={(ev) => {
                ev.stopPropagation();
                avanzar(row.original);
              }}
            >
              <Icon className="size-3.5" /> {accion.label}
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repartidores, busyId, sucursalId]
  );

  const toolbar =
    tab === "PENDIENTE" ? (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={rows.length === 0}
        onClick={() => avanzarLote(rows)}
      >
        <Truck className="size-3.5" /> Levantar todas ({rows.length})
      </Button>
    ) : tab === "EN_TRANSITO" ? (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={rows.length === 0}
        onClick={() => avanzarLote(rows)}
      >
        <Inbox className="size-3.5" /> Recibir todo ({rows.length})
      </Button>
    ) : undefined;

  return (
    <div>
      <PageHeader
        title="Depósito"
        description="Recepción, designaciones, devoluciones y encomiendas activas en un solo lugar."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <FileSpreadsheet className="size-3.5" /> Exportar a Excel
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} ({(rowsByTab.get(t.key) ?? []).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar por remito, cliente, destino o teléfono..."
        globalFilterFn={encomiendaMatches}
        emptyTitle="No hay encomiendas"
        emptyDescription="No encontramos encomiendas para esta pestaña."
        toolbar={toolbar}
        pageSize={12}
        onRowClick={(e) => {
          if (suppressRowClickRef.current) {
            suppressRowClickRef.current = false;
            return;
          }
          setSelected(e);
          setOpen(true);
        }}
      />

      <EncomiendaDetailSheet
        encomienda={selected}
        open={open}
        onOpenChange={setOpen}
        sucursalId={sucursalId}
      />
    </div>
  );
}
