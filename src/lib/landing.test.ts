import { describe, expect, it } from "vitest";
import { landingPathParaPermisos } from "./landing";

// NOTA-2026-09-24-01: landing por rol. BUG-2026-09-25-01 (dos rondas) y
// NOTA-2026-09-28-01 (a donde entran supervisor/administracion) -- ver
// comentario completo en landing.ts.
//
// Listas de permisos REALES de los cinco roles, sacadas de la base por
// agent-back (hilo de BUG-2026-09-25-01 en #cc-relay, mensaje de
// "Today at 8:33 AM") -- no listas inventadas. Es justo lo que la ronda 1
// de ese bug no tenia y lo que dejo pasar el error sin que ningun test lo
// agarrara: con listas inventadas los tests habrian pasado igual.
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

// "sistema" tiene los 25 permisos que existen hoy -- agent-back no volco
// la enumeracion completa de los 25 en el hilo, solo confirmo que incluye
// `envios:crear` y `entregas:registrar` (las dos banderas de las que
// depende landingPathParaPermisos). En vez de inventar los que faltan
// para completar "25", se arma con la union de las 4 listas reales de
// arriba -- cada permiso de esta lista es uno que agent-back confirmo
// real para algun rol, y sistema los tiene todos.
const PERMISOS_SISTEMA = Array.from(
  new Set([
    ...PERMISOS_CHOFER,
    ...PERMISOS_OPERADOR,
    ...PERMISOS_SUPERVISOR,
    ...PERMISOS_ADMINISTRACION,
  ])
);

describe("landingPathParaPermisos", () => {
  it("chofer (permisos reales) aterriza en /chofer", () => {
    expect(landingPathParaPermisos(PERMISOS_CHOFER)).toBe("/chofer");
  });

  it("operador (permisos reales, BUG-2026-09-25-01) aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos(PERMISOS_OPERADOR)).toBe("/encomiendas/nueva");
  });

  it("supervisor (permisos reales, NOTA-2026-09-28-01 opcion 1) aterriza en /despachos", () => {
    expect(landingPathParaPermisos(PERMISOS_SUPERVISOR)).toBe("/despachos");
  });

  it("administracion (permisos reales, NOTA-2026-09-28-01 opcion 1) aterriza en /deposito?tab=confirmaciones", () => {
    expect(landingPathParaPermisos(PERMISOS_ADMINISTRACION)).toBe(
      "/deposito?tab=confirmaciones"
    );
  });

  it("sistema (los 25 permisos, incluye entregas:registrar Y envios:crear) aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos(PERMISOS_SISTEMA)).toBe("/encomiendas/nueva");
  });

  it("un usuario sin ningun permiso distintivo aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos(["envios:leer", "clientes:leer"])).toBe(
      "/encomiendas/nueva"
    );
  });

  it("sin permisos (lista vacia) aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos([])).toBe("/encomiendas/nueva");
  });

  it("entregas:registrar + envios:crear (caso limite explicito, como sistema) no es chofer", () => {
    expect(
      landingPathParaPermisos(["entregas:registrar", "envios:crear"])
    ).toBe("/encomiendas/nueva");
  });
});
