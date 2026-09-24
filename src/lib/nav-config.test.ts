import { describe, expect, it } from "vitest";
import { esVisibleParaPermisos, NAV_GROUPS, ALL_NAV_ITEMS, type NavItem } from "./nav-config";
import type { LucideIcon } from "lucide-react";

// Icono cualquiera solo para satisfacer el tipo — esVisibleParaPermisos no
// lo mira.
const iconoFalso = (() => null) as unknown as LucideIcon;

function item(permiso?: string): NavItem {
  return {
    title: "Item de prueba",
    href: "/x",
    icon: iconoFalso,
    description: "",
    permiso,
  };
}

describe("esVisibleParaPermisos", () => {
  it("un item sin `permiso` siempre es visible, sin importar la sesion", () => {
    expect(esVisibleParaPermisos(item(undefined), [])).toBe(true);
    expect(esVisibleParaPermisos(item(undefined), undefined)).toBe(true);
  });

  it("un item con `permiso` solo es visible si esta en la lista", () => {
    expect(esVisibleParaPermisos(item("clientes:leer"), ["clientes:leer"])).toBe(true);
    expect(esVisibleParaPermisos(item("clientes:leer"), ["usuarios:leer"])).toBe(false);
  });

  it("permisos undefined (sesion sin cargar) oculta items con `permiso`", () => {
    // Este es el caso real de (app)/page.tsx: session?.permisos puede ser
    // undefined. Antes de extraer el helper, cada archivo lo manejaba
    // distinto (uno con default [], el otro con optional chaining) — acá
    // se fija el mismo comportamiento para los dos.
    expect(esVisibleParaPermisos(item("clientes:leer"), undefined)).toBe(false);
  });

  it("lista vacia de permisos oculta cualquier item con `permiso`", () => {
    expect(esVisibleParaPermisos(item("planillas:leer"), [])).toBe(false);
  });
});

describe("NAV_GROUPS", () => {
  it("Clientes y Usuarios y roles siguen protegidos (NOTA 2026-09-24)", () => {
    const clientes = ALL_NAV_ITEMS.find((i) => i.title === "Clientes");
    const usuarios = ALL_NAV_ITEMS.find((i) => i.title === "Usuarios y roles");
    expect(clientes?.permiso).toBe("clientes:leer");
    expect(usuarios?.permiso).toBe("usuarios:leer");
  });

  it("Tablero principal y Levantes siguen ocultos del menu (NOTA-2026-09-23-06)", () => {
    const titles = ALL_NAV_ITEMS.map((i) => i.title);
    expect(titles).not.toContain("Tablero principal");
    expect(titles).not.toContain("Levantes");
  });

  it("no hay hrefs duplicados entre grupos", () => {
    const hrefs = ALL_NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("ningun grupo queda vacio", () => {
    for (const group of NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});
