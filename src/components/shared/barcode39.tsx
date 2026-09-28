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

    // BUG REAL encontrado en vivo (2026-09-28, este era el motivo de fondo
    // de "el lector no lee nada" reportado desde el 09-26 -- no era la
    // camara ni la resolucion). `svg.getAttribute("width")` no siempre
    // devuelve un numero pelado: jsbarcode puede fijarlo como "390px" (con
    // unidad). El codigo de arriba lo pegaba tal cual dentro del viewBox
    // ("0 0 390px 55px"), y un viewBox con unidades es INVALIDO por spec --
    // el navegador lo descarta (`svg.viewBox.baseVal` queda en 0,0,0,0), lo
    // que apaga el escalado por completo. Sin escalado, el dibujo interno
    // se posiciona con sus coordenadas crudas (hasta x=390) dentro de un
    // recuadro CSS de apenas 220px de ancho -- el ~43% derecho del codigo
    // queda directamente RECORTADO (no achicado: invisible), confirmado
    // inspeccionando el DOM real de un remito (`getBoundingClientRect` =
    // 220x40 contra barras posicionadas hasta x=390). Un codigo de barras
    // al que le falta un tercio de sus caracteres (incluido el caracter de
    // stop) no lo lee NINGUNA camara, sea cual sea su resolucion o foco --
    // de ahi que agrandar el recuadro guia y pedir mas resolucion de
    // camara (fixes anteriores) no arreglara nada por si solos. Fix:
    // `parseFloat` pela cualquier unidad ("390px" -> 390) antes de armar el
    // viewBox, y se valida que el resultado sea un numero positivo real
    // antes de aplicarlo (si jsbarcode alguna vez no fija width/height, o
    // los fija en 0, se deja el <svg> como esta en vez de escribir un
    // viewBox invalido de nuevo).
    const width = parseFloat(svg.getAttribute("width") ?? "");
    const height = parseFloat(svg.getAttribute("height") ?? "");
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
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
