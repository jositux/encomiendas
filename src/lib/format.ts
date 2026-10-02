export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

// Importe con centavos solo cuando los hay: "$ 10.000", "$ 10.500,50".
// formatCurrency() de arriba redondea siempre a pesos enteros; esto se usa
// donde el centavo importa (ficha del envío y detalle de una modificación
// en Seguimiento) y coincide con cómo el backend escribe los importes en
// la frase de un evento `modificacion`. Acepta el texto de un `numeric`
// ("10000.00"), que es como llegan los importes de la API.
export function formatImporte(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const decimales = Math.round(n * 100) % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}
