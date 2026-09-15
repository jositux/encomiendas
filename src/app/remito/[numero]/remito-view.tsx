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
        <Panel remito={remito} etiqueta="Original" />
        <Panel remito={remito} etiqueta="Duplicado" />
      </div>
    </div>
  );
}

function Panel({ remito, etiqueta }: { remito: RemitoApi; etiqueta: string }) {
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

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-semibold">#{remito.numero}</p>
          <p className="text-xs text-muted-foreground print:text-black">
            Guía {remito.guiaDiaria}
            {remito.remitoManualNumero ? ` · Remito manual ${remito.remitoManualNumero}` : ""}
          </p>
          <p className="text-xs text-muted-foreground print:text-black">
            {formatDateTime(remito.fechaAlta)}
          </p>
        </div>
        <Barcode39 value={remito.codigoBarras} className="h-12 shrink-0" />
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

      {/* Bloque de firma de entrega — 3 campos separados en blanco, para
          completar a mano al momento de la entrega (no hay datos de esto en
          el alta). "Levantó" ya se muestra arriba con dato real. Espeja al
          sistema anterior (Entregó / Firma / DNI), a pedido explícito del
          usuario. */}
      <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-3 text-xs print:border-black">
        <div className="border-t border-dashed pt-1 text-muted-foreground print:border-black print:text-black">
          Entregó
        </div>
        <div className="border-t border-dashed pt-1 text-muted-foreground print:border-black print:text-black">
          Firma
        </div>
        <div className="border-t border-dashed pt-1 text-muted-foreground print:border-black print:text-black">
          DNI
        </div>
      </div>
    </div>
  );
}
