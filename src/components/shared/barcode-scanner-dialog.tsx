"use client";

import * as React from "react";
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from "@zxing/library";
import { ScanBarcode } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lector de código de barras por cámara (2026-09-25), hermano de
// QrScannerDialog (mismo patrón de diálogo + <video> + manejo de error de
// permisos de cámara). Decodifica con `@zxing/library` en vez de `jsQR`
// (`jsQR` solo lee QR, no sirve para un código de barras 1D). Restringido a
// CODE_39 -- es el único formato de barras que usa este proyecto (ver
// `barcode39.tsx`/`jsbarcode`, usado para IMPRIMIR el número de remito) --
// restringir el formato hace la lectura más rápida y evita falsos
// positivos con otros formatos de barra que no se usan acá.
//
// A diferencia de QrScannerDialog (que decodifica cuadro a cuadro a mano
// con requestAnimationFrame + canvas), acá se usa `decodeFromStream` de
// ZXing, que ya administra el <video>/el loop de decodificación por dentro
// -- evita duplicar esa maquinaria para un segundo formato.
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = "Escanear código de barras",
  description = "Apuntá la cámara al código de barras (Code 39).",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (valor: string) => void;
  title?: string;
  description?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = React.useState(false);
  const setVideoRef = React.useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoReady(!!node);
  }, []);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Mismo motivo que en QrScannerDialog: `onScan` es una función nueva en
  // cada render del padre, así que se guarda en un ref para que el efecto
  // de abajo no reinicie la cámara en cada re-render mientras el diálogo
  // está abierto.
  const onScanRef = React.useRef(onScan);
  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  const detectedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open || !videoReady) return;
    const video = videoRef.current;
    if (!video) return;
    detectedRef.current = false;
    let cancelado = false;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39]);
    // BUG real encontrado en vivo (2026-09-26, probado con Josi contra un
    // remito impreso real -- no era tema de resolucion ni de encuadre, el
    // lector nunca detectaba nada). Causa: sin `TRY_HARDER`, OneDReader (la
    // base de todos los lectores 1D de ZXing, ver core/oned/OneDReader.ts)
    // solo escanea filas horizontales de la imagen cada `altura >> 5` px
    // (un puñado de lineas espaciadas); con el hint en `true` pasa a
    // `altura >> 8` (muchisimas mas lineas). Sin esto, si el codigo de
    // barras no cae justo sobre una de esas pocas lineas de muestreo --muy
    // probable con la camara quieta, ya que el video no cambia de cuadro a
    // cuadro salvo que el usuario mueva la mano-- el lector no lo
    // encuentra NUNCA, por mas cuadros que procese. Es la causa real de
    // "se queda esperando, no lee nada", no el tamaño del recuadro guia ni
    // la resolucion de camara (esos dos si valia la pena arreglarlos, pero
    // no alcanzaban solos).
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    const iniciar = async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Sin `width`/`height`, algunos navegadores (sobre todo Safari/iOS)
          // arrancan la camara trasera en una resolucion baja por default
          // (tipo 640x480). Un CODE 39 de varios digitos tiene barras finas
          // que a esa resolucion quedan borrosas/indistinguibles para ZXing
          // -- probablemente la causa real de "no lee nada" reportada en
          // vivo (2026-09-26). `ideal` es un pedido, no una garantia: si el
          // dispositivo no da para tanto, el navegador cae a lo que pueda
          // sin tirar error.
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        await reader.decodeFromStream(stream, video, (result) => {
          // ZXing llama a este callback en cada cuadro, con `result`
          // indefinido cuando todavía no encontró nada -- es el caso
          // normal mientras se apunta la cámara, no un error real.
          if (detectedRef.current || !result) return;
          detectedRef.current = true;
          onScanRef.current(result.getText());
        });
      } catch (err) {
        if (cancelado) return;
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "No se pudo acceder a la cámara — revisá los permisos del navegador."
            : "No se pudo iniciar la cámara en este dispositivo."
        );
      }
    };

    iniciar();

    return () => {
      cancelado = true;
      reader.reset();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      video.srcObject = null;
    };
  }, [open, videoReady]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-black">
          {/* Igual que en QrScannerDialog: el <video> se renderiza siempre
              que el diálogo está abierto, nunca condicionado por `error`,
              para que el nodo sea estable durante todo el efecto de
              arriba. El error se muestra como overlay encima. Proporción
              `aspect-video` (más ancha que alta) en vez de `aspect-square`
              -- un código de barras 1D es horizontal, conviene más marco a
              los costados que arriba/abajo.
              Recuadro guía: `inset-y-4` (no `inset-y-14` como antes) --
              bug reportado en vivo 2026-09-26 ("el espacio para poner el
              código es muy chico"). En un dialog angosto (celular), el
              contenedor `aspect-video` mide ~170px de alto: con 56px de
              inset arriba Y 56px abajo, el recuadro quedaba en ~55px de
              alto, apenas usable. `inset-y-4` deja ~80% del alto real del
              cuadro disponible. */}
          <video ref={setVideoRef} className="h-full w-full object-cover" muted playsInline />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 px-6">
              <p className="text-center text-sm text-white">{error}</p>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-6 inset-y-4 rounded-lg border-2 border-white/80" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
