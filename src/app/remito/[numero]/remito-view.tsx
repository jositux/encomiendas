"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Barcode39 } from "@/components/shared/barcode39";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { RemitoApi } from "@/server/services/envios";

const TIPO_LABEL: Record<string, string> = {
  paqueteria: "Paquetería",
  efectivo: "Contra reembolso",
  tramite: "Trámite",
  interno: "Interno",
};

const LUGAR_LABEL: Record<string, string> = {
  origen: "Origen",
  destino: "Destino",
  regreso: "Contra entrega (regreso)",
};

const FORMA_LABEL: Record<string, string> = {
  contado: "Contado",
  cuenta_corriente: "Cuenta corriente",
};

function money(value: string) {
  return formatCurrency(Number(value));
}

export function RemitoView({ remito }: { remito: RemitoApi }) {
  return (
    <div className="mx-auto max-w-5xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Remito #{remito.numero}</h1>
          <p className="text-sm text-muted-foreground">
            Guía {remito.guiaDiaria} · {formatDateTime(remito.fechaAlta)}
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Panel remito={remito} etiqueta="Original" completo />
        <Panel remito={remito} etiqueta="Duplicado" completo={false} />
      </div>
    </div>
  );
}

function Panel({
  remito,
  etiqueta,
  completo,
}: {
  remito: RemitoApi;
  etiqueta: string;
  // Original = se queda con la empresa y acompaña el envío por depósito:
  // lleva código de barras y el bloque de firma de entrega. Duplicado = se
  // lo lleva el cliente en el momento del alta, antes de que exista ninguna
  // firma de entrega real — a pedido explícito (feedback de backend/revisión
  // 2026-09-15): omitir a propósito código de barras y firmas en esta copia,
  // para que no se escanee ni se firme por error una copia que no corresponde.
  completo: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm print:break-inside-avoid print:rounded-none print:border-black print:p-3">
      <div className="flex items-start justify-between gap-2 border-b pb-2 print:border-black">
        <div>
          <p className="font-semibold">{remito.empresa.nombre}</p>
          <p className="text-xs text-muted-foreground print:text-black">
            {remito.empresa.direccion}
          </p>
          <p className="text-xs text-muted-foreground print:text-black">
            {remito.empresa.telefono}
          </p>
        </div>
        <span className="rounded border px-2 py-0.5 text-xs font-medium print:border-black">
          {etiqueta}
        </span>
      </div>

      {/* Número de seguimiento + código de barras: antes iban en la misma
          fila (número a la izquierda, barra a la derecha) y el código de
          barras se salía de su recuadro y tapaba el panel de al lado (ver
          comentario en Barcode39 — bug del 2026-09-16). Ahora van apilados:
          el número/guía/fecha arriba, sin competir por ancho con nada, y el
          código de barras abajo en su propia fila, con un alto fijo chico y
          ancho acotado para que entre cómodo dentro de la columna. */}
      <div className="flex flex-col gap-1.5">
        <p className="whitespace-nowrap font-mono text-lg font-semibold">
          #{remito.numero}
        </p>
        <p className="text-xs text-muted-foreground print:text-black">
          Guía {remito.guiaDiaria}
          {remito.remitoManualNumero ? ` · Remito manual ${remito.remitoManualNumero}` : ""}
        </p>
        <p className="text-xs text-muted-foreground print:text-black">
          {formatDateTime(remito.fechaAlta)}
        </p>
        {completo && (
          <Barcode39
            value={remito.codigoBarras}
            className="mt-1 h-10 w-full max-w-[220px] print:h-9"
          />
        )}
      </div>

      {/* Destino grande y destacado — no es decoración: el depósito ordena
          los envíos por localidad de destino a simple vista, igual que en
          el sistema anterior (el destacado ahí no era estético). Antes esto
          quedaba perdido dentro del bloque chico de "Destinatario". */}
      <div className="rounded bg-primary/10 px-3 py-2 text-center print:border print:border-black print:bg-transparent">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground print:text-black">
          Destino
        </p>
        <p className="text-xl font-bold leading-tight print:text-black">
          {remito.destino.localidad}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-2 print:border-black">
        <div>
          <p className="text-xs font-medium text-muted-foreground print:text-black">
            Remitente ({remito.origen.localidad})
          </p>
          <p className="font-medium">{remito.remitente.nombre}</p>
          <p className="text-xs print:text-black">{remito.remitente.domicilio}</p>
          <p className="text-xs print:text-black">{remito.remitente.telefono}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground print:text-black">
            Destinatario ({remito.destino.localidad})
          </p>
          <p className="font-medium">{remito.destinatario.nombre}</p>
          <p className="text-xs print:text-black">{remito.destinatario.domicilio}</p>
          <p className="text-xs print:text-black">{remito.destinatario.telefono}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-2 text-xs print:border-black">
        <p>
          <span className="text-muted-foreground print:text-black">Tipo: </span>
          {TIPO_LABEL[remito.tipo] ?? remito.tipo}
        </p>
        <p>
          <span className="text-muted-foreground print:text-black">Bultos: </span>
          {remito.cantidadBultos}
        </p>
        <p>
          <span className="text-muted-foreground print:text-black">Pago: </span>
          {LUGAR_LABEL[remito.pagoServicio.lugar] ?? remito.pagoServicio.lugar} ·{" "}
          {FORMA_LABEL[remito.pagoServicio.forma] ?? remito.pagoServicio.forma}
        </p>
        <p>
          <span className="text-muted-foreground print:text-black">Levantó: </span>
          {remito.levanto}
        </p>
        {remito.valorDeclarado && (
          <p>
            <span className="text-muted-foreground print:text-black">V/D: </span>
            {money(remito.valorDeclarado)}
          </p>
        )}
        {remito.observaciones && (
          <p className="col-span-2">
            <span className="text-muted-foreground print:text-black">Contenido: </span>
            {remito.observaciones}
          </p>
        )}
      </div>

      {/* Desglose de flete/contra reembolso/gasto — el backend ya lo manda
          en /remito pero antes no se mostraba, solo los 3 totales de abajo.
          Contra reembolso es nullable (solo aplica a envíos "efectivo"); flete
          y gasto siempre vienen, aunque sean "0.00". */}
      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs print:border-black">
        <p>
          <span className="text-muted-foreground print:text-black">Flete: </span>
          {money(remito.flete)}
        </p>
        {remito.contrarreembolso !== null && (
          <p>
            <span className="text-muted-foreground print:text-black">Contra reembolso: </span>
            {money(remito.contrarreembolso)}
          </p>
        )}
        <p>
          <span className="text-muted-foreground print:text-black">Gasto: </span>
          {money(remito.gasto)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center print:border-black">
        <div>
          <p className="text-xs text-muted-foreground print:text-black">Cobrado</p>
          <p className="font-semibold">{money(remito.importes.cobrado)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground print:text-black">A cobrar</p>
          <p className="font-semibold">{money(remito.importes.aCobrar)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground print:text-black">Total</p>
          <p className="font-semibold">{money(remito.importes.total)}</p>
        </div>
      </div>

      {/* Bloque de firma de entrega — SOLO en la copia "Original" (ver nota
          en `completo` arriba). Son campos en blanco para completar a mano
          al momento de la entrega, no hay estos datos en el alta. "Levantó"
          ya se muestra arriba con dato real; acá van los 5 campos que
          faltaban del sistema anterior: hora y fecha de entrega, y quién
          entregó/recibió (entregó + aclaración + firma + DNI) — restaurados
          a pedido explícito de revisión (2026-09-15): "la boleta es la
          prueba de entrega, y este cambio es sobre trazabilidad". */}
      {completo ? (
        <div className="mt-2 border-t pt-3 text-xs print:border-black">
          {/* Antes el renglón punteado quedaba pegado al texto de abajo
              (pt-1 nomás) — no dejaba espacio en blanco arriba para
              completar a mano. El usuario lo notó imprimiendo un remito
              real: "para poner la fecha no hay espacio" (2026-09-16). El
              espacio en blanco para escribir va ARRIBA de cada renglón
              punteado (pt-6/pt-7 en vez de pt-1) — el renglón + la
              etiqueta de abajo quedan como referencia de qué va ahí. */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Hora y fecha
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Entregó
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Aclaración
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Firma
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              DNI
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 border-t pt-3 text-center text-xs text-muted-foreground print:border-black print:text-black">
          Gracias por elegirnos
        </div>
      )}
    </div>
  );
}
