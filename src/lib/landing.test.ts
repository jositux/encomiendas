import { describe, expect, it } from "vitest";
import { landingPathParaPermisos } from "./landing";

// NOTA-2026-09-24-01: landing por rol.
//
// BUG-2026-09-25-01: la version anterior solo miraba `planillas:leer`,
// que NO es exclusivo del chofer (lo tienen tambien operador, supervisor
// y administracion) -- por eso los tres casos de abajo usan las listas
// de permisos REALES de cada rol (las del propio reporte del bug), no
// listas inventadas: es justamente lo que faltaba la vez pasada y lo que
// dejo pasar el bug sin que ningun test lo agarrara.
//
// Listas de permisos reales (BUG-2026-09-25-01, confirmadas por
// agent-back):
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

describe("landingPathParaPermisos", () => {
  it("un chofer (permisos reales) aterriza en /chofer", () => {
    expect(landingPathParaPermisos(PERMISOS_CHOFER)).toBe("/chofer");
  });

  it("un operador (permisos reales, BUG-2026-09-25-01) NO aterriza en /chofer", () => {
    expect(landingPathParaPermisos(PERMISOS_OPERADOR)).toBe("/encomiendas/nueva");
  });

  it("un usuario sin planillas:leer aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos(["envios:leer", "clientes:leer"])).toBe(
      "/encomiendas/nueva"
    );
  });

  it("sin permisos (lista vacia) aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos([])).toBe("/encomiendas/nueva");
  });

  it("planillas:leer + envios:crear (caso limite explicito del fix) no es chofer", () => {
    expect(
      landingPathParaPermisos(["planillas:leer", "envios:crear"])
    ).toBe("/encomiendas/nueva");
  });
});
