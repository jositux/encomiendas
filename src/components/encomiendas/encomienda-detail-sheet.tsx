"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  MapPin,
  Phone,
  Truck,
  PackageCheck,
  Undo2,
  Trash2,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge";
import { updateEncomiendaAction } from "@/server/actions";
import { localidadNombre } from "@/lib/mock/localidades";
import { sucursalNombre } from "@/lib/mock/sucursales";
import { personalNombre } from "@/lib/mock/personal";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Encomienda, EstadoEncomienda } from "@/types";

export function EncomiendaDetailSheet({
  encomienda,
  open,
  onOpenChange,
  sucursalId,
}: {
  encomienda: Encomienda | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Sucursal del usuario que está operando la pantalla (session.puntoId).
  // Se usa solo en la transición EN_TRANSITO -> PARA_ENTREGAR ("Recibir en
  // destino"), para que la encomienda quede registrada en la sucursal que
  // la recibió — mismo comportamiento que tenía la pantalla de Recepción
  // antes de consolidarse en /deposito. Opcional: si no se pasa, se
  // conserva la sucursalId que ya tenía la encomienda (comportamiento
  // anterior de este componente).
  sucursalId?: string | null;
}) {
  if (!encomienda) return null;

  async function setEstado(estado: EstadoEncomienda, label: string) {
    if (!encomienda) return;
    await updateEncomiendaAction(encomienda.id, {
      estado,
      sucursalId:
        estado === "PARA_ENTREGAR" ? (sucursalId ?? encomienda.sucursalId) : encomienda.sucursalId,
      fechaFinalizado:
        estado === "ENTREGADA" ? new Date().toISOString() : encomienda.fechaFinalizado,
      fechaBaja:
        estado === "ENTREGADA" || estado === "DEVUELTA"
          ? new Date().toISOString()
          : encomienda.fechaBaja,
    });
    toast.success(`Encomienda #${encomienda.remito} ${label}`);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-mono">
            #{encomienda.remito}
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-sans text-muted-foreground">
              Letra {encomienda.letraDia}
            </span>
          </SheetTitle>
          <SheetDescription>
            Cargada el {formatDateTime(encomienda.fechaAlta)} en{" "}
            {sucursalNombre(encomienda.sucursalId)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge estado={encomienda.estado} />
            <TipoBadge tipo={encomienda.tipo} />
            {encomienda.esSobre && (
              <span className="rounded-md border px-2 py-0.5 text-xs">Sobre</span>
            )}
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-4 text-sm">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Origen</p>
              <p className="font-medium">{encomienda.origen.nombre}</p>
              <p className="text-muted-foreground">{encomienda.origen.direccion}</p>
              <p className="text-muted-foreground">
                {localidadNombre(encomienda.origen.localidadId)}, {encomienda.origen.provincia}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3" /> {encomienda.origen.telefono || "—"}
              </p>
            </div>

            <div className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ArrowRight className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Destino</p>
              <p className="font-medium">{encomienda.destino.nombre}</p>
              <p className="text-muted-foreground">{encomienda.destino.direccion}</p>
              <p className="text-muted-foreground">
                {localidadNombre(encomienda.destino.localidadId)}, {encomienda.destino.provincia}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3" /> {encomienda.destino.telefono || "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoField label="Bultos" value={String(encomienda.bultos)} />
            <InfoField label="Flete" value={formatCurrency(encomienda.flete)} />
            {encomienda.montoCrr !== undefined && (
              <InfoField label="Monto CRR" value={formatCurrency(encomienda.montoCrr)} />
            )}
            <InfoField
              label="Designado"
              value={personalNombre(encomienda.designadoId)}
            />
            <InfoField
              label="Flete cobrado"
              value={encomienda.fleteCobrado ? "Sí" : "No"}
            />
            {encomienda.tipo === "CRR" && (
              <InfoField
                label="CRR cobrado"
                value={encomienda.crrCobrado ? "Sí" : "No"}
              />
            )}
          </div>

          {encomienda.observaciones && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Observaciones
                </p>
                <p className="text-sm">{encomienda.observaciones}</p>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-row flex-wrap gap-2 border-t pt-4">
          {encomienda.estado === "PENDIENTE" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setEstado("EN_TRANSITO", "marcada en tránsito")}
            >
              <Truck className="size-3.5" /> Levantar
            </Button>
          )}
          {encomienda.estado === "EN_TRANSITO" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setEstado("PARA_ENTREGAR", "recibida en destino")}
            >
              <PackageCheck className="size-3.5" /> Recibir en destino
            </Button>
          )}
          {encomienda.estado === "PARA_ENTREGAR" && (
            <Button
              size="sm"
              variant="success"
              className="gap-1.5"
              onClick={() => setEstado("ENTREGADA", "marcada como entregada")}
            >
              <PackageCheck className="size-3.5" /> Marcar entregada
            </Button>
          )}
          {(encomienda.estado === "EN_TRANSITO" || encomienda.estado === "PARA_ENTREGAR") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEstado("DEVUELTA", "marcada como devuelta")}
            >
              <Undo2 className="size-3.5" /> Devolver
            </Button>
          )}
          {encomienda.estado !== "ELIMINADA" && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setEstado("ELIMINADA", "eliminada")}
            >
              <Trash2 className="size-3.5" /> Eliminar
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
