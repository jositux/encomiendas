"use client";

import { MapPinned, PackageCheck, Route } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Modo, TipoDeModo } from "./recepcion-tanda";

export interface GrupoDeSectores {
  localidad: string;
  sectores: { id: string; nombre: string }[];
}

export interface RecorridoOfrecido {
  id: string;
  nombre: string;
  baseNombre: string;
}

const MODOS: { tipo: TipoDeModo; titulo: string; icono: typeof PackageCheck }[] = [
  { tipo: "recibir", titulo: "Sólo recibir", icono: PackageCheck },
  { tipo: "sector", titulo: "Cambiar sector", icono: MapPinned },
  { tipo: "recorrido", titulo: "Reservar recorrido", icono: Route },
];

const ESTILO_DEL_SELECT =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

// El modo de la tanda: tres opciones excluyentes y siempre a la vista. Los
// dos modos de cambio piden además un valor (un sector, un recorrido), que
// queda puesto hasta que el operador lo cambie. Solo se muestran los modos
// que los permisos del usuario le dan (ver modosDisponibles).
export function SelectorDeModo({
  modo,
  disponibles,
  sectores,
  recorridos,
  mostrarBase,
  onCambiar,
}: {
  modo: Modo;
  disponibles: TipoDeModo[];
  sectores: GrupoDeSectores[];
  recorridos: RecorridoOfrecido[];
  // Quien solo asigna ve recorridos de todas las bases: se le dice de cuál
  // sale cada uno.
  mostrarBase: boolean;
  onCambiar: (modo: Modo) => void;
}) {
  const opciones = MODOS.filter((m) => disponibles.includes(m.tipo));
  const todosLosSectores = sectores.flatMap((g) => g.sectores);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Modo de la tanda" className="grid gap-2 sm:grid-cols-3">
        {opciones.map(({ tipo, titulo, icono: Icono }) => {
          const activo = modo.tipo === tipo;
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={activo}
              // Cambiar de modo siempre arranca sin valor: nunca se hereda
              // un sector o un recorrido de un modo anterior.
              onClick={() => !activo && onCambiar({ tipo, valor: null })}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                activo
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icono className="size-4 shrink-0" />
              {titulo}
            </button>
          );
        })}
      </div>

      {modo.tipo === "sector" && (
        <div className="grid gap-1.5">
          <Label htmlFor="recepcion-sector" className="text-xs text-muted-foreground">
            Sector al que pasan los paquetes de esta tanda
          </Label>
          <select
            id="recepcion-sector"
            value={modo.valor?.id ?? ""}
            onChange={(e) => {
              const elegido = todosLosSectores.find((s) => s.id === e.target.value);
              onCambiar({ tipo: "sector", valor: elegido ?? null });
            }}
            className={ESTILO_DEL_SELECT}
          >
            <option value="">Elegí un sector</option>
            {sectores.map((grupo) => (
              <optgroup key={grupo.localidad} label={grupo.localidad}>
                {grupo.sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {todosLosSectores.length === 0 && (
            <p className="text-xs text-muted-foreground">No hay sectores para elegir.</p>
          )}
        </div>
      )}

      {modo.tipo === "recorrido" && (
        <div className="grid gap-1.5">
          <Label htmlFor="recepcion-recorrido" className="text-xs text-muted-foreground">
            Recorrido con el que salen los paquetes de esta tanda
          </Label>
          <select
            id="recepcion-recorrido"
            value={modo.valor?.id ?? ""}
            onChange={(e) => {
              const elegido = recorridos.find((r) => r.id === e.target.value);
              onCambiar({
                tipo: "recorrido",
                valor: elegido ? { id: elegido.id, nombre: elegido.nombre } : null,
              });
            }}
            className={ESTILO_DEL_SELECT}
          >
            <option value="">Elegí un recorrido</option>
            {recorridos.map((r) => (
              <option key={r.id} value={r.id}>
                {mostrarBase ? `${r.nombre} · sale de ${r.baseNombre}` : r.nombre}
              </option>
            ))}
          </select>
          {recorridos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay recorridos activos que salgan de tu base.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
