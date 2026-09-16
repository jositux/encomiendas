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
    const svg = ref.current;
    if (!svg || !value) return;
    JsBarcode(svg, value, {
      format: "CODE39",
      displayValue: true,
      fontSize: 11,
      height: 36,
      margin: 3,
    });

    // Bug encontrado 2026-09-16 (remito impreso, panel "Original"): jsbarcode
    // fija `width`/`height` como atributos en píxeles absolutos sobre el
    // <svg>, sin `viewBox`. Sin viewBox, el tamaño que le demos por CSS
    // (la prop `className`, p.ej. una altura más chica) NO reescala el
    // dibujo: el navegador lo deja desbordar tal cual a su tamaño natural
    // (que para un código de ~11 dígitos es bastante más ancho que la
    // columna del remito), y como el <svg> es la raíz de su propio
    // contexto SVG, el overflow por defecto es visible — el código de
    // barras se salía del recuadro "Original" y tapaba el panel
    // "Duplicado" de al lado. Copiamos acá el tamaño real que dibujó
    // jsbarcode a un `viewBox` y soltamos el width/height fijo, para que el
    // tamaño final quede 100% controlado por CSS (className) y escale de
    // verdad manteniendo la proporción, sin desbordar ni recortarse.
    const width = svg.getAttribute("width");
    const height = svg.getAttribute("height");
    if (width && height) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
    }
  }, [value]);

  return (
    <svg
      ref={ref}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
