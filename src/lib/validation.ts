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

// ---------------------------------------------------------------------------
// Validación de campos de Clientes (nombre, teléfono, DNI/CUIT, email).
//
// Mismo criterio de dos capas que arriba: sanitizers en el onChange (nunca
// dejan tipear un carácter que ya sabemos inválido) + schemas de zod como
// validación "de verdad" antes de guardar, con el mensaje de error.
//
// DNI/CUIT: se valida SOLO la cantidad de dígitos (ignorando espacios y
// guiones), no un formato exacto con guiones en posiciones fijas — así no
// se rompe al editar clientes ya cargados con formatos previos a esta
// validación (ver cliente-form-dialog.tsx, sección 19 del plan de
// integración). DNI (persona): 7 u 8 dígitos. CUIT (empresa): 11 dígitos.
// ---------------------------------------------------------------------------

export const nombreClienteSchema = z
  .string()
  .trim()
  .min(2, "Ingresá el nombre completo.");

export const telefonoClienteSchema = z
  .string()
  .trim()
  .min(6, "Ingresá un teléfono válido.");

const soloDigitos = (s: string) => s.replace(/\D/g, "");

export const dniSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || [7, 8].includes(soloDigitos(v).length), {
    message: "El DNI tiene que tener 7 u 8 dígitos.",
  });

export const cuitSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || soloDigitos(v).length === 11, {
    message: "El CUIT tiene que tener 11 dígitos.",
  });

export const emailOpcionalSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Ingresá un email válido.",
  });

// Deja pasar dígitos, espacios y guiones — sirve para teléfono, que
// legítimamente se tipea con guiones (ej. "3757-410007").
export function sanitizeTelefonoInput(raw: string): string {
  return raw.replace(/[^0-9\s-]/g, "");
}

// DNI/CUIT: a diferencia del teléfono, el usuario pidió explícitamente que
// sean estrictamente numéricos (sin guiones/espacios) y con tope de
// longitud mientras se tipea — no solo validado al guardar (2026-09-16:
// "Telefono: mascara numero telefono / CUIT: numerico. max: 11"). DNI
// (persona) tope 8 dígitos, CUIT (empresa) tope 11.
export function sanitizeDocumentoInput(raw: string, tipo: "persona" | "empresa"): string {
  const soloDigitos = raw.replace(/[^0-9]/g, "");
  const tope = tipo === "empresa" ? 11 : 8;
  return soloDigitos.slice(0, tope);
}

// Deja pasar los caracteres válidos de un email mientras se tipea (letras,
// dígitos, "@", ".", "_", "-", "+") — bloquea acentos/ñ/espacios/símbolos
// que nunca pueden ser parte de una dirección válida, sin esperar a la
// validación de zod al guardar (pedido 2026-09-16: "email: mask email").
export function sanitizeEmailInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9@._+-]/g, "");
}
