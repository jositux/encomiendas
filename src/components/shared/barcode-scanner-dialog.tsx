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
    const reader = new BrowserMultiFormatReader(hints);

    const iniciar = async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
              los costados que arriba/abajo. */}
          <video ref={setVideoRef} className="h-full w-full object-cover" muted playsInline />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 px-6">
              <p className="text-center text-sm text-white">{error}</p>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-8 inset-y-14 rounded-lg border-2 border-white/80" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
