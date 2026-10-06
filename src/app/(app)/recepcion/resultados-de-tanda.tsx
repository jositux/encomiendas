"use client";

import { Loader2, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { guiaCorta } from "@/components/custodia/planilla-parts";
import {
  sePuedeDeshacer,
  type Lectura,
  type ResumenDeTanda,
  type Tono,
} from "./recepcion-tanda";

// Tres tonos, tres colores (y tres sonidos, ver src/lib/sonidos.ts).
const COLOR_DEL_TONO: Record<Tono, string> = {
  correcto: "border-success/40 bg-success/10 text-success",
  aviso: "border-warning/50 bg-warning/10 text-warning",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

function horaDeLectura(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// El último resultado, en grande: lo que el operador mira de reojo entre un
// escaneo y el siguiente.
export function UltimoResultado({ lectura }: { lectura: Lectura | null }) {
  if (!lectura?.resultado) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Acá aparece el resultado de cada lectura.
      </div>
    );
  }
  const { resultado } = lectura;
  const envio = resultado.envio;

  return (
    <div
      role="status"
      aria-live="polite"
      data-tono={resultado.tono}
      className={cn("rounded-lg border-2 p-4", COLOR_DEL_TONO[resultado.tono])}
    >
      <p className="text-xl font-bold leading-tight sm:text-2xl">{resultado.titulo}</p>
      {resultado.detalle && <p className="mt-1 text-sm">{resultado.detalle}</p>}
      {envio ? (
        <div className="mt-3 text-foreground">
          <p className="font-mono text-lg font-semibold">#{guiaCorta(envio.numero)}</p>
          <p className="text-sm font-medium">{envio.destinatarioNombre}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {/* Con `?.`: un backend anterior a este contrato no manda
                sector ni localidad en la respuesta de la recepción. */}
            <Dato label="Localidad" valor={envio.localidadDestinoNombre ?? "—"} />
            <Dato label="Sector" valor={envio.sector?.nombre ?? "—"} />
            <Dato label="Ruta reservada" valor={envio.recorrido?.nombre ?? "—"} />
            <Dato
              label="Bultos"
              valor={`${envio.cantidadBultos} bulto${envio.cantidadBultos === 1 ? "" : "s"}`}
            />
          </dl>
        </div>
      ) : (
        <p className="mt-3 font-mono text-lg font-semibold text-foreground">{lectura.texto}</p>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

export function ResumenDeLaTanda({ resumen }: { resumen: ResumenDeTanda }) {
  const datos: [string, number][] = [
    ["Recibidos", resumen.recibidos],
    ["Ya los tenías", resumen.yaLosTenias],
    ["Con aviso", resumen.conAviso],
    ["Con error", resumen.conError],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumen de la tanda">
      {datos.map(([label, valor]) => (
        <div key={label} className="rounded-md border p-2.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-xl font-semibold">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// El historial de la tanda, la lectura más nueva arriba. Por fila: deshacer
// la asignación (vuelve al valor anterior; la recepción no se deshace) y
// reintentar una lectura que quedó sin respuesta.
export function HistorialDeTanda({
  lecturas,
  deshaciendoId,
  onDeshacer,
  onReintentar,
}: {
  lecturas: Lectura[];
  deshaciendoId: string | null;
  onDeshacer: (lectura: Lectura) => void;
  onReintentar: (id: string) => void;
}) {
  if (lecturas.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2" aria-label="Historial de la tanda">
      {lecturas.map((lectura) => {
        const { resultado } = lectura;
        const envio = resultado?.envio;
        const anterior = resultado?.asignacion?.anterior;
        const reservaQuitada = resultado?.asignacion?.reservaQuitada;
        return (
          <li
            key={lectura.id}
            data-tono={resultado?.tono ?? "en_cola"}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{horaDeLectura(lectura.hora)}</p>
              <p className="font-mono text-sm font-semibold">
                #{envio ? guiaCorta(envio.numero) : lectura.texto}
              </p>
              {envio && (
                <p className="text-sm">
                  {envio.destinatarioNombre} · {envio.cantidadBultos} bulto
                  {envio.cantidadBultos === 1 ? "" : "s"} · {envio.localidadDestinoNombre ?? "—"} ·
                  sector {envio.sector?.nombre ?? "—"}
                </p>
              )}
              {resultado?.detalle && (
                <p className="text-xs text-muted-foreground">{resultado.detalle}</p>
              )}
              {resultado?.deshecha && (
                <p className="text-xs text-muted-foreground">
                  Asignación deshecha
                  {anterior ? `: volvió a ${anterior.nombre}` : ": quedó sin reserva"}.
                  {/* Deshacer el cambio de sector no devuelve la reserva
                      de recorrido que ese cambio había borrado. */}
                  {reservaQuitada && ` La reserva de ${reservaQuitada.nombre} no se restauró.`}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {resultado ? (
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium",
                    COLOR_DEL_TONO[resultado.tono]
                  )}
                >
                  {resultado.titulo}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> En cola
                </span>
              )}
              {sePuedeDeshacer(lectura) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={deshaciendoId !== null}
                  onClick={() => onDeshacer(lectura)}
                >
                  {deshaciendoId === lectura.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="size-3.5" />
                  )}
                  Deshacer
                </Button>
              )}
              {resultado?.reintentable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onReintentar(lectura.id)}
                >
                  <RotateCcw className="size-3.5" /> Reintentar
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
