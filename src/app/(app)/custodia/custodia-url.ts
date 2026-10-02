// Parámetros de la URL de /custodia, compartidos por la página (server) y
// la vista (client). Sin "use client" a propósito: page.tsx llama a estas
// funciones desde el servidor (ver deposito-tabs.ts por el mismo caso).

export const TAMANO_DE_PAGINA = 25;

// Valor de `?persona=` para "lo que tengo yo". Cualquier otro valor no
// vacío es el id de una persona; vacío es la vista por defecto.
export const PERSONA_MIOS = "mios";

export function paginaValida(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function urlDeCustodia(persona: string, pagina: number): string {
  const qs = new URLSearchParams();
  if (persona) qs.set("persona", persona);
  if (pagina > 1) qs.set("pagina", String(pagina));
  const query = qs.toString();
  return query ? `/custodia?${query}` : "/custodia";
}
