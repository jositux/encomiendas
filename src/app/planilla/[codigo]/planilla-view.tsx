"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import type { PlanillaApi } from "@/server/services/custodia";

// Vista de impresión de una planilla (Feature A, sección 32 del plan de
// integración). Mismo patrón visual que /remito/[numero]/remito-view.tsx:
// bloque no-print con el botón "Imprimir", contenido debajo pensado para
// la hoja impresa (print:*).
//
// QR real (agregado 2026-09-18, tras instalar `qrcode`): mismo patrón que
// Barcode39 (src/components/shared/barcode39.tsx) — un ref a un elemento
// gráfico (acá un <canvas>, porque `qrcode` no tiene un modo "dibujar sobre
// un <svg> que le paso" como jsbarcode; sí tiene toCanvas/toDataURL/toString)
// que se dibuja en un useEffect. Se deja el texto de `codigoQr` debajo del
// QR como respaldo, porque es lo que el criterio de aceptación del pedido
// efectivamente ejercita (tipearlo en /chofer), y porque una cámara de
// depósito puede no leer bien un QR impreso en una hoja común.
function PlanillaQr({ value }: { value: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !value) return;
    QRCode.toCanvas(canvas, value, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: "M",
    }).catch((err: unknown) => {
      console.error("No se pudo generar el QR de la planilla", err);
    });
  }, [value]);

  return (
    <canvas
      ref={ref}
      className="size-40 self-center rounded border bg-white p-1 print:border-black"
      aria-label="Código QR de la planilla"
    />
  );
}

function totalBultos(envios: PlanillaApi["envios"]): number {
  return envios.reduce((acc, e) => acc + e.cantidadBultos, 0);
}

export function PlanillaPrintView({ planilla }: { planilla: PlanillaApi }) {
  return (
    <div className="mx-auto max-w-2xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Planilla {planilla.codigoCorto}</h1>
          <p className="text-sm text-muted-foreground">
            {planilla.localidadDestinoNombre} · {planilla.sectorDestinoNombre}
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-6 text-sm print:rounded-none print:border-black">
        <div className="flex items-start justify-between gap-2 border-b pb-3 print:border-black">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-black">
              Planilla
            </p>
            <p className="flex items-center gap-1.5 text-4xl font-bold tracking-wide print:text-black">
              {planilla.codigoCorto}
              <CopyButton value={planilla.codigoCorto} label="Código de planilla" />
            </p>
          </div>
          <span className="rounded border px-2 py-0.5 text-xs font-medium print:border-black">
            {planilla.estado}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <PlanillaQr value={planilla.codigoQr} />
          <p className="flex items-center justify-center gap-1 break-all text-center font-mono text-xs text-muted-foreground print:text-black">
            {planilla.codigoQr}
            <CopyButton value={planilla.codigoQr} label="Código QR" />
          </p>
        </div>

        <div className="rounded bg-primary/10 px-3 py-2 text-center print:border print:border-black print:bg-transparent">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground print:text-black">
            Próximo salto
          </p>
          <p className="text-xl font-bold leading-tight print:text-black">
            {planilla.localidadDestinoNombre}
          </p>
          <p className="text-sm print:text-black">{planilla.sectorDestinoNombre}</p>
        </div>

        <div className="border-t pt-3 print:border-black">
          {/* NOTA-2026-09-23-03 (pedido de Sebastian): total de bultos junto
              a la cantidad de envíos — un envío puede traer más de un
              bulto, así que "12 envíos" solo no le alcanza al chofer/
              depósito para cuadrar lo que sube al camión. */}
          <p className="mb-2 text-xs font-medium text-muted-foreground print:text-black">
            {planilla.envios.length} envío{planilla.envios.length === 1 ? "" : "s"} ·{" "}
            {totalBultos(planilla.envios)} bulto{totalBultos(planilla.envios) === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-col gap-1 text-xs print:text-black">
            {planilla.envios.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 border-b border-dashed pb-1">
                <span className="flex items-center gap-1 font-mono">
                  #{e.numero}
                  <CopyButton value={e.numero} label="Número de envío" />
                </span>
                <span className="truncate">{e.destinatarioNombre}</span>
                <span className="shrink-0 text-muted-foreground">
                  {e.cantidadBultos} bulto{e.cantidadBultos === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
