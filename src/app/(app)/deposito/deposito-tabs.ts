// Pestañas de Depósito, en un módulo SIN "use client" a propósito: page.tsx
// (Server Component) necesita llamar a `tabValida` para validar `?tab=`, y
// una función exportada desde un módulo "use client" (deposito-view.tsx)
// llega al server como client reference, no como función -- invocarla
// tira en runtime ("Attempted to call tabValida() from the server...") y
// Next.js lo muestra como "This page couldn't load" para cualquier rol.
// tsc/eslint/next build no lo detectan. Ver deposito-tabs.test.ts.

export type TabKey =
  | "pendientes"
  | "en_transito"
  | "para_entregar"
  | "entregadas"
  | "confirmadas"
  | "anuladas"
  | "fallidos"
  | "confirmaciones";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "en_transito", label: "En tránsito" },
  { key: "para_entregar", label: "Para entregar" },
  { key: "entregadas", label: "Entregadas" },
  { key: "confirmadas", label: "Confirmadas" },
  { key: "anuladas", label: "Anuladas" },
  { key: "fallidos", label: "Fallidos" },
  { key: "confirmaciones", label: "Conf. pendientes" },
];

// NOTA-2026-09-28-01 (opcion 1, landing por rol): administracion aterriza
// directo en la pestaña "Conf. pendientes" (`/deposito?tab=confirmaciones`,
// ver landing.ts). `tabValida` deja que page.tsx (Server Component, ve el
// query string) valide el valor sin duplicar la lista de keys ahi.
export function tabValida(valor: string | undefined): TabKey | undefined {
  return TABS.some((t) => t.key === valor) ? (valor as TabKey) : undefined;
}
