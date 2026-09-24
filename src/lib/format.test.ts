import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, initials } from "./format";

// Intl.NumberFormat("es-AR", { style: "currency", ... }) separa el símbolo
// del monto con un espacio "duro" (U+00A0), no un espacio normal — se
// normaliza acá para no depender de ese detalle de ICU en los asserts.
function sinEspacioDuro(s: string): string {
  return s.replace(/ /g, " ");
}

describe("formatCurrency", () => {
  it("formatea en pesos argentinos sin decimales", () => {
    expect(sinEspacioDuro(formatCurrency(80000))).toBe("$ 80.000");
  });

  it("redondea a entero (maximumFractionDigits: 0)", () => {
    expect(sinEspacioDuro(formatCurrency(22000.6))).toBe("$ 22.001");
  });

  it("soporta 0", () => {
    expect(sinEspacioDuro(formatCurrency(0))).toBe("$ 0");
  });
});

describe("formatDate / formatDateTime", () => {
  it("devuelve un guion largo si no hay fecha", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formatea dd/mm/aa", () => {
    // Mediodía UTC para no cruzar de día por huso horario en CI.
    expect(formatDate("2026-09-18T12:00:00.000Z")).toBe("18/09/26");
  });

  it("formatDateTime incluye fecha, hora y minuto", () => {
    const out = formatDateTime("2026-09-18T12:34:00.000Z");
    expect(out).toContain("18/09/26");
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});

describe("initials", () => {
  it("toma la primera letra de las primeras dos palabras", () => {
    expect(initials("Josi Interfaz")).toBe("JI");
  });

  it("un solo nombre da una sola letra", () => {
    expect(initials("Sebastian")).toBe("S");
  });

  it("ignora espacios extra entre palabras", () => {
    expect(initials("  Ana   Garcia  ")).toBe("AG");
  });

  it("solo usa las primeras dos palabras aunque haya mas", () => {
    expect(initials("Juan Carlos Perez Gomez")).toBe("JC");
  });
});
