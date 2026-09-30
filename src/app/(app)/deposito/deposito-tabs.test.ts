import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TABS, tabValida } from "./deposito-tabs";

describe("tabValida", () => {
  it("acepta cada pestaña real, incluida confirmaciones (landing de administracion)", () => {
    for (const t of TABS) expect(tabValida(t.key)).toBe(t.key);
    expect(tabValida("confirmaciones")).toBe("confirmaciones");
  });

  it("descarta valores que no son una pestaña", () => {
    expect(tabValida(undefined)).toBeUndefined();
    expect(tabValida("")).toBeUndefined();
    expect(tabValida("Confirmaciones")).toBeUndefined();
    expect(tabValida("no-existe")).toBeUndefined();
  });
});

// Regresión del 500 de /deposito (2026-09-29): page.tsx (Server Component)
// llama a tabValida, así que el módulo que la exporta NO puede ser "use
// client" -- ahí llega al server como client reference y falla en runtime,
// cosa que ni tsc ni next build detectan.
describe("deposito-tabs.ts es invocable desde el server", () => {
  it("no tiene la directiva \"use client\"", () => {
    const src = readFileSync(path.join(__dirname, "deposito-tabs.ts"), "utf-8");
    expect(src).not.toMatch(/^\s*["']use client["']/m);
  });

  it("page.tsx importa tabValida desde deposito-tabs, no desde deposito-view", () => {
    const page = readFileSync(path.join(__dirname, "page.tsx"), "utf-8");
    expect(page).toMatch(/import \{ tabValida \} from "\.\/deposito-tabs"/);
    expect(page).not.toMatch(/tabValida[^;]*from "\.\/deposito-view"/);
  });
});
