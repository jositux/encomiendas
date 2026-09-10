// ---------------------------------------------------------------------------
// Validación de campos numéricos (bultos, flete, contra reembolso).
//
// Dos capas, a propósito:
//  1. Los `sanitize*Input` se usan en el onChange de cada campo — hacen
//     imposible tipear (o pegar) un signo, una letra o notación científica:
//     el campo nunca llega a tener un valor inválido en primer lugar.
//  2. Los schemas de zod son la validación "de verdad" antes de guardar —
//     documentan la regla de negocio (entero positivo / no negativo) en un
//     solo lugar y devuelven el mensaje de error si por lo que sea el número
//     igual no es válido (campo vacío, etc).
// ---------------------------------------------------------------------------

import { z } from "zod";

export const bultosSchema = z
  .number({ invalid_type_error: "Ingresá un número entero." })
  .int("No se permiten decimales.")
  .positive("Tiene que ser al menos 1.");

// Flete: puede ser 0 (envío sin costo), nunca negativo.
export const montoNoNegativoSchema = z
  .number({ invalid_type_error: "Ingresá un número." })
  .nonnegative("No se permiten valores negativos.");

// Monto a reembolsar (CRR): tiene que ser mayor a 0, nunca negativo.
export const montoPositivoSchema = z
  .number({ invalid_type_error: "Ingresá un número." })
  .positive("Ingresá el monto a reembolsar.");

// Deja pasar solo dígitos — sin "-", "+", "e"/"E" ni ".", así nunca se puede
// tipear un negativo o notación científica en un campo de cantidad entera.
export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

// Deja pasar dígitos y un único punto decimal — sin signos ni letras. Sirve
// para montos de dinero (flete, contra reembolso).
export function sanitizeMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
