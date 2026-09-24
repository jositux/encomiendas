// jsqr no publica sus propios tipos ni hay @types/jsqr en DefinitelyTyped
// activamente mantenido para esta versión — se declara acá el subconjunto
// mínimo que usa qr-scanner-dialog.tsx en vez de agregar una dependencia
// de tipos extra. Firma tomada de la documentación del paquete (jsQR(data,
// width, height, options?) => QRCode | null).
declare module "jsqr" {
  export interface QRCodeLocation {
    topRightCorner: { x: number; y: number };
    topLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    topRightFinderPattern: { x: number; y: number };
    topLeftFinderPattern: { x: number; y: number };
    bottomLeftFinderPattern: { x: number; y: number };
    bottomRightAlignmentPattern?: { x: number; y: number };
  }

  export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: unknown[];
    version: number;
    location: QRCodeLocation;
  }

  export interface Options {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null;
}
