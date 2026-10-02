// "Dónde está" un envío, en palabras: el campo `ubicacion` que el backend
// calcula para cada envío. Mismos textos que ya usan Depósito y
// Seguimiento, que por ahora conservan su propia copia de este mapa.
export const UBICACION_LABEL: Record<string, string> = {
  en_origen: "En origen",
  en_transito: "En tránsito",
  en_deposito: "En depósito",
  en_base_destino: "En base destino",
  en_reparto: "En reparto",
  entregado: "Entregado",
  confirmado: "Confirmado",
  anulado: "Anulado",
  alta_incompleta: "Alta incompleta",
};

export const UBICACION_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"
> = {
  en_origen: "secondary",
  en_transito: "info",
  en_deposito: "secondary",
  en_base_destino: "info",
  en_reparto: "warning",
  entregado: "success",
  confirmado: "success",
  anulado: "destructive",
  alta_incompleta: "outline",
};

export function ubicacionEnPalabras(ubicacion: string): string {
  return UBICACION_LABEL[ubicacion] ?? ubicacion;
}
