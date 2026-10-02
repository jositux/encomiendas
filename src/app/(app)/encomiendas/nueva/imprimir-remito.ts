import { toast } from "sonner";

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
//
// 2026-10-02 (registro de impresión): sin registro no se imprime, y eso
// vale también acá. La página embebida registra la impresión en el backend
// ANTES de avisar "remito-listo"; si no pudo, avisa "remito-error" con el
// motivo. Esta ventana solo llama a print() con un "remito-listo". Si llega
// un error -- o no llega nada -- no hay diálogo: se muestra el aviso de
// abajo, con una acción que abre el remito en una pestaña para imprimirlo
// desde su botón (que vuelve a intentar el registro).
export const AVISO_IMPRESION_NO_REGISTRADA = "No se pudo registrar la impresión del remito";

function avisarQueNoSeImprimio(numero: string, detalle?: string) {
  toast.error(AVISO_IMPRESION_NO_REGISTRADA, {
    description: detalle || "El remito no se imprimió.",
    duration: 15000,
    action: {
      label: "Abrir remito",
      onClick: () => abrirRemito(numero),
    },
  });
}

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
    if (!ev.data) return;
    if (ev.data.tipo === "remito-listo") {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      limpiar();
    } else if (ev.data.tipo === "remito-error") {
      // La impresión no quedó registrada: NO se llama a print().
      avisarQueNoSeImprimio(numero, typeof ev.data.mensaje === "string" ? ev.data.mensaje : "");
      limpiar();
    }
  }

  window.addEventListener("message", onMessage);
  // Si el aviso nunca llega (remito no encontrado todavía, error de red,
  // etc.) no se traba nada -- el iframe se descarta solo más tarde. Como
  // tampoco hubo diálogo, se le avisa al operador igual que ante un error
  // (antes esto pasaba en silencio).
  setTimeout(() => {
    if (!limpiado) avisarQueNoSeImprimio(numero);
    limpiar();
  }, 20_000);

  iframe.src = `/remito/${encodeURIComponent(numero)}`;
  document.body.appendChild(iframe);
}

// La URL del remito para un botón o enlace de IMPRIMIR. Quien toca
// "Imprimir remito" quiere imprimir: con `?imprimir=1` la página registra
// la impresión y abre el diálogo sola al cargar, sin un segundo clic en su
// botón "Imprimir" (2026-10-02; ver remito-view.tsx). La página saca el
// parámetro de la URL apenas lo usa, así que recargar esa pestaña no vuelve
// a imprimir. `/remito/{numero}` a secas sigue siendo "solo ver".
//
// El iframe de la impresión automática NO usa esta URL: la página embebida
// ya registra por su cuenta y es esta ventana la que llama a print().
export function urlParaImprimirRemito(numero: string): string {
  return `/remito/${encodeURIComponent(numero)}?imprimir=1`;
}

// Impresión manual (el operador quiere reimprimir, o el automático no
// saltó): abre el remito en una pestaña nueva de verdad, que registra la
// impresión y abre el diálogo al cargar. Si el registro falla, la pestaña
// queda con el error y su botón "Imprimir" para reintentar.
export function abrirRemito(numero: string) {
  if (typeof window === "undefined") return;
  window.open(urlParaImprimirRemito(numero), "_blank", "noopener,noreferrer");
}
