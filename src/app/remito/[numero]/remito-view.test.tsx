import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// El código de barras (jsbarcode sobre un <svg>) no hace a lo que se prueba
// acá y jsdom no lo dibuja -- se reemplaza por un stub.
vi.mock("@/components/shared/barcode39", () => ({
  Barcode39: () => null,
}));

import { RemitoView } from "./remito-view";
import type { RemitoApi } from "@/server/services/envios";

afterEach(() => {
  cleanup();
});

function remito(destinatario: Partial<RemitoApi["destinatario"]> = {}): RemitoApi {
  return {
    empresa: { nombre: "Empresa", telefono: "111", direccion: "Calle 1" },
    numero: "32-1",
    codigoBarras: "321",
    fechaAlta: "2026-10-01T12:00:00.000Z",
    guiaDiaria: "1",
    remitoManualNumero: null,
    origen: { localidad: "Posadas" },
    destino: { localidad: "Oberá" },
    remitente: { nombre: "Remitente", telefono: "222", domicilio: "Origen 123" },
    destinatario: {
      nombre: "Destinatario",
      telefono: "333",
      domicilio: "Destino 456",
      ...destinatario,
    },
    cantidadBultos: 1,
    tipo: "paqueteria",
    observaciones: null,
    valorDeclarado: null,
    flete: "10500.00",
    contrarreembolso: null,
    gasto: "0.00",
    pagoServicio: { lugar: "origen", forma: "contado" },
    importes: { cobrado: "10500.00", aCobrar: "0.00", total: "10500.00" },
    levanto: "Operador",
  };
}

describe("RemitoView — referencia del domicilio del destinatario", () => {
  it("la imprime en las dos copias, en su propio renglón debajo del domicilio", () => {
    render(<RemitoView remito={remito({ referencia: "casa verde frente a la plaza" })} />);

    const referencias = screen.getAllByText("casa verde frente a la plaza");
    // Original + Duplicado.
    expect(referencias).toHaveLength(2);
    for (const p of referencias) {
      expect(p.tagName).toBe("P");
      expect(p.textContent).toBe("Ref.: casa verde frente a la plaza");
      expect(p.previousElementSibling?.textContent).toBe("Destino 456");
      expect(p.nextElementSibling?.textContent).toBe("333");
    }
  });

  it("no pinta nada si viene null, vacía, en blanco o si el backend no manda el campo", () => {
    for (const destinatario of [
      { referencia: null },
      { referencia: "" },
      { referencia: "   " },
      {},
    ]) {
      render(<RemitoView remito={remito(destinatario)} />);
      expect(screen.queryByText(/Ref\.:/)).toBeNull();
      // Sin renglón de más: el teléfono sigue pegado al domicilio.
      for (const domicilio of screen.getAllByText("Destino 456")) {
        expect(domicilio.nextElementSibling?.textContent).toBe("333");
      }
      cleanup();
    }
  });
});
