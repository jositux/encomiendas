import { describe, expect, it } from "vitest";
import { landingPathParaPermisos } from "./landing";

// NOTA-2026-09-24-01: landing por rol. `planillas:leer` es el mismo
// permiso que ya gatea el item "Chofer" del menu (ver nav-config.ts) --
// es el proxy real de "es un chofer" porque SesionUsuario no tiene un
// campo de rol legible.
describe("landingPathParaPermisos", () => {
  it("un usuario con planillas:leer aterriza en /chofer", () => {
    expect(landingPathParaPermisos(["planillas:leer", "custodia:registrar"])).toBe(
      "/chofer"
    );
  });

  it("un usuario sin planillas:leer aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos(["envios:leer", "clientes:leer"])).toBe(
      "/encomiendas/nueva"
    );
  });

  it("sin permisos (lista vacia) aterriza en /encomiendas/nueva", () => {
    expect(landingPathParaPermisos([])).toBe("/encomiendas/nueva");
  });
});
