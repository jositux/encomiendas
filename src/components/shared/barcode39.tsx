"use client";

import * as React from "react";
import JsBarcode from "jsbarcode";

// Code 39 vía jsbarcode (en vez de escribir las tablas de barras a mano —
// una tabla mal transcripta produce un código que "parece" válido pero no
// escanea, así que se usa una librería probada). `value` es el número de
// envío YA SIN GUIÓN (`codigoBarras` de GET /envios/:numero/remito, que el
// backend devuelve pre-formateado para esto).
export function Barcode39({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, {
      format: "CODE39",
      displayValue: true,
      fontSize: 13,
      height: 42,
      margin: 4,
    });
  }, [value]);

  return <svg ref={ref} className={className} />;
}
