import { describe, expect, it } from "vitest";
import {
  esVisibleParaPermisos,
  esOperadorOSistema,
  NAV_GROUPS,
  ALL_NAV_ITEMS,
  type NavItem,
} from "./nav-config";
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

  it("`visiblePara`, cuando esta presente, manda por encima de `permiso`", () => {
    const conAmbos: NavItem = {
      ...item("clientes:leer"),
      visiblePara: (permisos) => permisos.includes("otra:cosa"),
    };
    // No tiene clientes:leer pero si otra:cosa -> visiblePara gana.
    expect(esVisibleParaPermisos(conAmbos, ["otra:cosa"])).toBe(true);
    // Tiene clientes:leer pero no otra:cosa -> visiblePara igual gana.
    expect(esVisibleParaPermisos(conAmbos, ["clientes:leer"])).toBe(false);
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

  it("Chofer ahora esta protegido por entregas:registrar (NOTA-2026-09-28-03)", () => {
    const chofer = ALL_NAV_ITEMS.find((i) => i.title === "Chofer");
    expect(chofer?.permiso).toBe("entregas:registrar");
  });

  it("Recepcion y Planillas usan visiblePara, no permiso (NOTA-2026-09-28-03)", () => {
    const recepcion = ALL_NAV_ITEMS.find((i) => i.title === "Recepción");
    const planillas = ALL_NAV_ITEMS.find((i) => i.title === "Planillas");
    expect(recepcion?.permiso).toBeUndefined();
    expect(planillas?.permiso).toBeUndefined();
    expect(typeof recepcion?.visiblePara).toBe("function");
    expect(typeof planillas?.visiblePara).toBe("function");
  });
});

// NOTA-2026-09-28-03: listas de permisos REALES de los cinco roles, mismas
// que landing.test.ts (sacadas de la base por agent-back, hilo de
// BUG-2026-09-25-01 en #cc-relay, mensaje de "Today at 8:33 AM") — "no
// listas inventadas".
const PERMISOS_CHOFER = [
  "custodia:registrar",
  "entregas:registrar",
  "envios:leer",
  "geografia:leer",
  "planillas:leer",
];

const PERMISOS_OPERADOR = [
  "clientes:escribir",
  "clientes:leer",
  "custodia:registrar",
  "despachos:crear",
  "despachos:leer",
  "envios:corregir_sector",
  "envios:crear",
  "envios:escribir",
  "envios:leer",
  "geografia:leer",
  "planillas:imprimir",
  "planillas:leer",
];

const PERMISOS_SUPERVISOR = [
  "clientes:escribir",
  "clientes:leer",
  "confirmaciones:confirmar",
  "confirmaciones:confirmar_con_entrega",
  "despachos:crear",
  "despachos:leer",
  "entregas:revertir",
  "envios:anular",
  "envios:corregir_sector",
  "envios:escribir",
  "envios:escribir_en_custodia",
  "envios:leer",
  "envios:mover_de_planilla",
  "geografia:leer",
  "planillas:imprimir",
  "planillas:leer",
  "reportes:leer",
];

const PERMISOS_ADMINISTRACION = [
  "clientes:leer",
  "confirmaciones:confirmar",
  "confirmaciones:confirmar_con_entrega",
  "despachos:leer",
  "entregas:revertir",
  "envios:escribir",
  "envios:escribir_en_custodia",
  "envios:leer",
  "geografia:leer",
  "planillas:leer",
  "reportes:leer",
  "usuarios:leer",
];

// "sistema" tiene los 25 permisos que existen hoy -- se arma con la union
// de las 4 listas reales de arriba, mismo criterio que landing.test.ts.
const PERMISOS_SISTEMA = Array.from(
  new Set([
    ...PERMISOS_CHOFER,
    ...PERMISOS_OPERADOR,
    ...PERMISOS_SUPERVISOR,
    ...PERMISOS_ADMINISTRACION,
  ])
);

describe("esOperadorOSistema (NOTA-2026-09-28-03)", () => {
  it("chofer: no", () => {
    expect(esOperadorOSistema(PERMISOS_CHOFER)).toBe(false);
  });

  it("operador: si", () => {
    expect(esOperadorOSistema(PERMISOS_OPERADOR)).toBe(true);
  });

  it("supervisor: no", () => {
    expect(esOperadorOSistema(PERMISOS_SUPERVISOR)).toBe(false);
  });

  it("administracion: no", () => {
    expect(esOperadorOSistema(PERMISOS_ADMINISTRACION)).toBe(false);
  });

  it("sistema: si", () => {
    expect(esOperadorOSistema(PERMISOS_SISTEMA)).toBe(true);
  });
});

describe("Tabla de visibilidad por rol (NOTA-2026-09-28-03)", () => {
  const chofer = () => ALL_NAV_ITEMS.find((i) => i.title === "Chofer")!;
  const recepcion = () => ALL_NAV_ITEMS.find((i) => i.title === "Recepción")!;
  const planillas = () => ALL_NAV_ITEMS.find((i) => i.title === "Planillas")!;

  it("chofer: Chofer si, Recepcion no, Planillas no", () => {
    expect(esVisibleParaPermisos(chofer(), PERMISOS_CHOFER)).toBe(true);
    expect(esVisibleParaPermisos(recepcion(), PERMISOS_CHOFER)).toBe(false);
    expect(esVisibleParaPermisos(planillas(), PERMISOS_CHOFER)).toBe(false);
  });

  it("operador: Chofer no, Recepcion si, Planillas si", () => {
    expect(esVisibleParaPermisos(chofer(), PERMISOS_OPERADOR)).toBe(false);
    expect(esVisibleParaPermisos(recepcion(), PERMISOS_OPERADOR)).toBe(true);
    expect(esVisibleParaPermisos(planillas(), PERMISOS_OPERADOR)).toBe(true);
  });

  // 2026-10-02: quien puede asignar sector o recorrido (`custodia:asignar`)
  // llega a Recepción aunque no reciba.
  it("con custodia:asignar: Recepcion si, aunque no sea operador", () => {
    expect(esVisibleParaPermisos(recepcion(), [...PERMISOS_SUPERVISOR, "custodia:asignar"])).toBe(
      true
    );
    expect(esVisibleParaPermisos(recepcion(), [...PERMISOS_CHOFER, "custodia:asignar"])).toBe(true);
  });

  it("supervisor: Chofer no, Recepcion no, Planillas no", () => {
    expect(esVisibleParaPermisos(chofer(), PERMISOS_SUPERVISOR)).toBe(false);
    expect(esVisibleParaPermisos(recepcion(), PERMISOS_SUPERVISOR)).toBe(false);
    expect(esVisibleParaPermisos(planillas(), PERMISOS_SUPERVISOR)).toBe(false);
  });

  it("administracion: Chofer no, Recepcion no, Planillas no", () => {
    expect(esVisibleParaPermisos(chofer(), PERMISOS_ADMINISTRACION)).toBe(false);
    expect(esVisibleParaPermisos(recepcion(), PERMISOS_ADMINISTRACION)).toBe(false);
    expect(esVisibleParaPermisos(planillas(), PERMISOS_ADMINISTRACION)).toBe(false);
  });

  it("sistema: Chofer si, Recepcion si, Planillas si", () => {
    expect(esVisibleParaPermisos(chofer(), PERMISOS_SISTEMA)).toBe(true);
    expect(esVisibleParaPermisos(recepcion(), PERMISOS_SISTEMA)).toBe(true);
    expect(esVisibleParaPermisos(planillas(), PERMISOS_SISTEMA)).toBe(true);
  });
});
