"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Barcode39 } from "@/components/shared/barcode39";
import { CopyButton } from "@/components/shared/copy-button";
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

function money(value: string | null) {
  // CONTRATO-2026-09-24-01 (punto 4, Sebastian): importes en null son un
  // renglon en blanco en el papel, no "$ 0" -- Number(null) da 0 y lo
  // confundia con un importe real (p.ej. los tres importes de un envio
  // "interno" vienen null).
  if (value === null) return "";
  return formatCurrency(Number(value));
}

export function RemitoView({ remito }: { remito: RemitoApi }) {
  // NOTA-2026-09-28-02: si esta página está embebida en el <iframe> oculto
  // de imprimir-remito.ts (impresión automática al terminar un alta),
  // avisarle a la ventana padre que ya terminó de pintar -- código de
  // barras incluido, que Barcode39 dibuja en su propio useEffect; por
  // orden de commit de React los efectos de los hijos corren antes que
  // los del padre, así que acá abajo el barcode ya está listo. Si la
  // página se abre suelta (pestaña nueva, visita directa) esto no hace
  // nada: window.parent es la misma ventana.
  React.useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { tipo: "remito-listo", numero: remito.numero },
        window.location.origin
      );
    }
  }, [remito.numero]);

  return (
    <div className="mx-auto max-w-5xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Remito #{remito.numero}</h1>
          <p className="text-sm text-muted-foreground">
            {remito.guiaDiaria ? `Guía ${remito.guiaDiaria} · ` : ""}
            {formatDateTime(remito.fechaAlta)}
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
      {/* Tamaño agrandado (2026-09-28): "ancho acotado" de arriba quedó en
          max-w-[220px] por las dudas cuando el código todavía compartía
          fila con el número -- ya apilado en su propia fila, ese límite no
          compite por espacio con nada y lo dejaba mucho más chico de lo
          que la columna realmente permite. Un CODE 39 de 10 dígitos recién
          decodifica de forma confiable con margen real por encima de
          ~220px de ancho EFECTIVO en la imagen que procesa la cámara (lo
          medí generando el mismo código y decodificándolo con la misma
          config de ZXing que usa el scanner) -- a 220px justo, cualquier
          variación de encuadre, foco o ángulo del celular lo empuja para
          el lado que no lee (reportado en vivo 2026-09-28: "lo logré hacer
          andar 1 vez y después no" / "que ocupe el ancho del contenedor,
          es que muy pequeño no lee eso nomás"). Se saca el `max-w` y se
          deja que ocupe el 100% del ancho real de la columna (`w-full`,
          controlado por el padre) -- ya no hay nada con quien compartir
          ese ancho, así que no hay motivo para acotarlo por debajo de lo
          que el layout deja disponible. */}
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1 whitespace-nowrap font-mono text-lg font-semibold">
          #{remito.numero}
          <CopyButton value={remito.numero} label="Número de envío" />
        </p>
        {/* `guiaDiaria` es nullable en el contrato (RemitoDeEnvioDto): un
            envío sin guía asignada no imprime "Guía" suelto -- queda solo
            el remito manual, o nada si tampoco lo tiene. */}
        {(remito.guiaDiaria || remito.remitoManualNumero) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground print:text-black">
            <span>
              {[
                remito.guiaDiaria ? `Guía ${remito.guiaDiaria}` : null,
                remito.remitoManualNumero ? `Remito manual ${remito.remitoManualNumero}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {remito.remitoManualNumero && (
              <CopyButton value={remito.remitoManualNumero} label="Remito manual" />
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground print:text-black">
          {formatDateTime(remito.fechaAlta)}
        </p>
        {completo && (
          <Barcode39
            value={remito.codigoBarras}
            // `preserveAspectRatio="xMidYMid meet"` (ver Barcode39) escala
            // el dibujo para que entre en el recuadro sin desbordar, atado
            // al eje mas chico -- si el alto de este recuadro fuera muy
            // bajo relativo al ancho del contenedor, terminaria limitando
            // el ANCHO real del codigo por debajo de lo que el contenedor
            // permite (el problema que se busca resolver con w-full de
            // arriba). El codigo tiene una proporcion fija ~7.1:1
            // (390x55 nativo de jsbarcode); h-20/print:h-14 le dan bastante
            // mas alto del que ese ancho jamas necesitaria, asi que en la
            // practica siempre queda atado al ANCHO -- ocupa el 100% del
            // contenedor tanto en pantalla como al imprimir.
            className="mt-1 h-20 w-full print:h-14"
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
          {/* Referencia del domicilio (p.ej. "casa verde frente a la
              plaza") -- solo del destinatario, en su propio renglón debajo
              del domicilio y un punto más chica: el domicilio va en
              text-xs (12px = 9pt), esto en 8pt. Solo se pinta si trae
              texto: con null, vacío o un backend que todavía no manda el
              campo no queda renglón en blanco. `break-words` para que una
              referencia larga corte en varias líneas en vez de salirse de
              la columna al imprimir. */}
          {remito.destinatario.referencia?.trim() && (
            <p className="break-words text-[8pt] leading-tight print:text-black">
              <span className="text-muted-foreground print:text-black">Ref.: </span>
              {remito.destinatario.referencia.trim()}
            </p>
          )}
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
        {remito.pagoServicio && (
          <p>
            <span className="text-muted-foreground print:text-black">Pago: </span>
            {LUGAR_LABEL[remito.pagoServicio.lugar] ?? remito.pagoServicio.lugar} ·{" "}
            {FORMA_LABEL[remito.pagoServicio.forma] ?? remito.pagoServicio.forma}
          </p>
        )}
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

      {/* CONTRATO-2026-09-24-01 / BUG-2026-09-24-02: hasta el 2026-09-24
          esto mostraba `total` en vez de `aCobrar` cuando habia contra
          reembolso, porque el backend viejo mandaba aCobrar en 0 en ese
          caso. Con la formula nueva del backend (2026-09-24, commit
          5492bd6) importes.aCobrar YA trae el contrarreembolso sumado --
          ese parche quedo redundante (coincidia con el valor correcto de
          casualidad) y ademas enmascaraba el campo real. Se saca en el
          mismo deploy que el resto de los ajustes de este contrato.
          La regla cambio de nuevo el 2026-10-01 (backend main a9c2e6f): el
          gasto lo cobra quien entrega, asi que con pago en origen cobrado
          = flete y aCobrar = gasto + CRR (antes cobrado = flete + gasto).
          Detalle por lugar de pago en RemitoApi (envios.ts). Aca no cambia
          nada: los tres importes se pintan tal como llegan. */}
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
