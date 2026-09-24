"use client";

import * as React from "react";
import jsQR from "jsqr";
import { QrCode } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lector de QR por cámara, genérico y reutilizable (2026-09-24, primer uso:
// BuscadorPlanillaPorCodigo en chofer-view.tsx, /chofer y /chofer-minimal
// comparten el mismo ChoferView así que no hace falta duplicar nada acá).
// Decodifica cuadro a cuadro con jsQR sobre un <canvas> oculto en vez de la
// BarcodeDetector nativa del navegador: BarcodeDetector no está soportado
// en Safari/iOS, que es justamente el navegador más probable en el celular
// de un chofer real — jsQR funciona igual en cualquier navegador con
// getUserMedia.
export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = "Escanear código QR",
  description = "Apuntá la cámara al código QR.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (valor: string) => void;
  title?: string;
  description?: string;
}) {
  // BUG real encontrado en vivo (2026-09-24, probado en Mac y celular): con
  // un useRef normal, videoRef.current podía seguir siendo null cuando el
  // efecto de abajo corría por primera vez -- DialogContent (Radix) monta
  // su contenido a través de un portal + Presence con su propio ciclo de
  // efectos, y no hay garantía de que el nodo <video> ya esté en el DOM en
  // la primera pasada de un efecto declarado en este componente. Con el
  // guard `if (!video) return;` de antes, eso hacía que el efecto cortara
  // en silencio SIN pedir la cámara nunca -- ni error, ni cartel de
  // permiso, el visor quedaba negro para siempre.
  //
  // Un callback ref dispara recién cuando el nodo realmente se monta. El
  // nodo en sí se guarda en un useRef normal (no en useState) porque el
  // video se muta imperativamente más abajo (srcObject, play()) -- mutar
  // directamente un valor de useState no está permitido (regla
  // react-hooks/immutability). `videoReady` es solo un booleano en
  // useState para que ese montaje dispare un re-render y, con él, la
  // re-ejecución del efecto de abajo (que depende de `videoReady`).
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = React.useState(false);
  const setVideoRef = React.useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoReady(!!node);
  }, []);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // onScan casi siempre es una función nueva en cada render del padre (se
  // arma inline). Si `onScan` estuviera en las deps del efecto de abajo,
  // el efecto reiniciaría la cámara en cada re-render del padre mientras
  // el diálogo está abierto. Con la ref, el efecto solo depende de `open`
  // y siempre llama a la versión más reciente de onScan.
  const onScanRef = React.useRef(onScan);
  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  // Evita procesar un frame de más (y potencialmente llamar a onScan() dos
  // veces) entre el instante en que se decodifica un QR y el que el efecto
  // de cierre termina de desmontar la cámara.
  const detectedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open || !videoReady) return;
    const video = videoRef.current;
    if (!video) return;
    detectedRef.current = false;
    let cancelado = false;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas || detectedRef.current) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const resultado = jsQR(imagen.data, imagen.width, imagen.height);
          if (resultado?.data) {
            detectedRef.current = true;
            onScanRef.current(resultado.data);
            return;
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    const iniciar = async () => {
      // Se limpia acá (dentro de la función async que dispara el efecto, no
      // en el cuerpo síncrono del efecto) para no disparar un setState
      // síncrono directamente dentro de useEffect (regla
      // react-hooks/set-state-in-effect).
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
        video.srcObject = stream;
        await video.play();
        tick();
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
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
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
            <QrCode className="size-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-black">
          {/* El <video> se renderiza siempre que el diálogo está abierto —
              nunca condicionado por `error` — para que el nodo sea estable
              durante todo el efecto de arriba (si se reemplazara por el
              mensaje de error, se perdería a mitad de un reintento). El
              error se muestra como overlay encima. */}
          <video ref={setVideoRef} className="h-full w-full object-cover" muted playsInline />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 px-6">
              <p className="text-center text-sm text-white">{error}</p>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/80" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
