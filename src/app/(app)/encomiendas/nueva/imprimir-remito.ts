// NOTA-2026-09-28-02, ajustada en vivo por el usuario (Josi): tiene que
// ser automático -- al terminar el alta, el diálogo de impresión del
// remito aparece solo, sin que el operador apriete nada. La spec
// original de Sebastian pedía un botón explícito ("Imprimir remito")
// justamente para esquivar el bloqueo de pop-ups de un `window.open`
// llamado después del `await` del POST (ya no cuenta como gesto del
// usuario para el navegador) -- ver el hilo de la nota. Automático de
// verdad con esa misma técnica sería justo lo que se bloquea.
//
// Acá se resuelve distinto: en vez de abrir una pestaña nueva, se crea un
// <iframe> oculto apuntando a /remito/{numero}. Un iframe no abre ninguna
// ventana nueva, así que ningún navegador lo trata como pop-up -- se
// puede crear en cualquier momento, gesto de usuario o no.
//
// El único cuidado real: remito-view.tsx dibuja el código de barras en un
// useEffect propio (Barcode39, ver ese componente) DESPUÉS del primer
// render, así que no se puede imprimir apenas el iframe dispara "load"
// (ahí el barcode todavía puede estar en blanco). Por eso esa página le
// avisa a este iframe por postMessage ("remito-listo") recién cuando ya
// terminó de pintar -- solo lo hace si detecta que está embebida, así que
// abrir /remito/{numero} suelto (pestaña nueva, visita directa) no cambia
// en nada.
export function imprimirRemitoAutomatico(numero: string) {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabIndex", "-1");

  let limpiado = false;
  function limpiar() {
    if (limpiado) return;
    limpiado = true;
    window.removeEventListener("message", onMessage);
    // Se retira recién después de un rato: sacar el iframe apenas se
    // llama a print() corta el diálogo recién abierto en algunos
    // navegadores (sobre todo Firefox).
    setTimeout(() => iframe.remove(), 60_000);
  }

  function onMessage(ev: MessageEvent) {
    if (ev.origin !== window.location.origin) return;
    if (ev.source !== iframe.contentWindow) return;
    if (!ev.data || ev.data.tipo !== "remito-listo") return;
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    limpiar();
  }

  window.addEventListener("message", onMessage);
  // Si el aviso nunca llega (remito no encontrado todavía, error de red,
  // etc.) no se traba nada -- el iframe se descarta solo más tarde y el
  // operador siempre tiene el link manual en "Envíos recientes".
  setTimeout(limpiar, 20_000);

  iframe.src = `/remito/${encodeURIComponent(numero)}`;
  document.body.appendChild(iframe);
}

// Fallback manual (p. ej. si el operador quiere reimprimir, o si el
// automático no saltó): abre el remito en una pestaña nueva de verdad,
// con su propio botón "Imprimir" (ver remito-view.tsx).
export function abrirRemito(numero: string) {
  if (typeof window === "undefined") return;
  window.open(`/remito/${encodeURIComponent(numero)}`, "_blank", "noopener,noreferrer");
}
