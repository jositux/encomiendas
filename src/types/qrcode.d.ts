// Tipos mínimos para la librería `qrcode` (agregada 2026-09-18 a pedido para
// el QR real de /planilla/[codigo]). No hay @types/qrcode instalado — en vez
// de pedir otra instalación, se declara acá solo la superficie que usamos
// (`QRCode.toCanvas`), tipada de verdad en lugar de `declare module "qrcode";`
// a secas (que dejaría todo en `any`). Si más adelante se instala
// `@types/qrcode`, este archivo se puede borrar sin tocar nada más.
declare module "qrcode" {
  export interface QRCodeToCanvasOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToCanvasOptions
  ): Promise<HTMLCanvasElement>;

  const QRCode: {
    toCanvas: typeof toCanvas;
  };

  export default QRCode;
}
