import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// El código de barras (jsbarcode sobre un <svg>) no hace a lo que se prueba
// acá y jsdom no lo dibuja -- se reemplaza por un stub.
vi.mock("@/components/shared/barcode39", () => ({
  Barcode39: () => null,
}));

// Registro de impresión (2026-10-02): se mockea el borde -- la Server
// Action que registra, el router (para la recarga tras un bloqueo) y
// window.print, que jsdom no implementa.
vi.mock("@/server/actions", () => ({
  registrarImpresionRemitoAction: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { registrarImpresionRemitoAction } from "@/server/actions";
import { RemitoView, leyendaDeReimpresion } from "./remito-view";
import type { ImpresionRegistradaApi, RemitoApi } from "@/server/services/envios";

const print = vi.fn();

beforeEach(() => {
  window.print = print;
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function remito(destinatario: Partial<RemitoApi["destinatario"]> = {}): RemitoApi {
  return {
    empresa: { nombre: "Empresa", telefono: "111", direccion: "Calle 1" },
    envioId: "envio-uuid-1",
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
    impresion: { permitida: true, bloqueo: null },
  };
}

function impresion(numero: number): ImpresionRegistradaApi {
  return {
    numero,
    impresoEn: "2026-10-02T15:30:00",
    impresoPor: { id: "u-luis", nombre: "Luis" },
  };
}

function registroOk(numero: number) {
  return { ok: true as const, impresion: impresion(numero) };
}

const ERROR_DE_RED = {
  ok: false as const,
  code: "ERROR_DESCONOCIDO",
  title: "Error",
  message: "Ocurrió un error al comunicarse con el servidor.",
};

function habilitado(container: HTMLElement): boolean {
  return container.querySelector("[data-remito-habilitado]")?.getAttribute("data-remito-habilitado") === "si";
}

function avisoDeImpresion(container: HTMLElement): string | null {
  return container.querySelector("[data-aviso-impresion]")?.textContent ?? null;
}

const botonImprimir = () => screen.getByRole("button", { name: "Imprimir" });

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

describe("RemitoView — guía diaria", () => {
  it("imprime la guía junto al remito manual", () => {
    render(<RemitoView remito={{ ...remito(), remitoManualNumero: "000123" }} />);
    expect(screen.getAllByText("Guía 1 · Remito manual 000123")).toHaveLength(2);
  });

  it("sin guía asignada no imprime \"Guía\" suelto ni \"null\"", () => {
    const { container } = render(
      <RemitoView remito={{ ...remito(), guiaDiaria: null, remitoManualNumero: "000123" }} />
    );
    expect(screen.getAllByText("Remito manual 000123")).toHaveLength(2);
    expect(container.textContent).not.toMatch(/Guía|null/);
  });

  it("sin guía ni remito manual no deja el renglón", () => {
    const { container } = render(<RemitoView remito={{ ...remito(), guiaDiaria: null }} />);
    expect(container.textContent).not.toMatch(/Guía|Remito manual|null/);
  });
});


describe("RemitoView — sin registro no se imprime", () => {
  it("recién abierta no está habilitada: un Ctrl+P imprime el aviso, no el remito", () => {
    const { container } = render(<RemitoView remito={remito()} />);
    expect(habilitado(container)).toBe(false);
    expect(avisoDeImpresion(container)).toBe("Para imprimir este remito usá el botón Imprimir");
    expect(registrarImpresionRemitoAction).not.toHaveBeenCalled();
  });

  it("Imprimir registra y recién con la respuesta abre el diálogo, ya habilitado", async () => {
    let resolver: (r: ReturnType<typeof registroOk>) => void = () => {};
    vi.mocked(registrarImpresionRemitoAction).mockReturnValue(
      new Promise((res) => {
        resolver = res;
      })
    );
    const { container } = render(<RemitoView remito={remito()} />);
    // El diálogo se abre con el remito ya visible en impresión y sin aviso.
    print.mockImplementation(() => {
      expect(habilitado(container)).toBe(true);
      expect(avisoDeImpresion(container)).toBeNull();
    });

    fireEvent.click(botonImprimir());
    expect(registrarImpresionRemitoAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(registrarImpresionRemitoAction).mock.calls[0][0]).toBe("envio-uuid-1");
    // Mientras espera la respuesta: botón ocupado y nada de imprimir.
    expect(botonImprimir()).toBeDisabled();
    expect(print).not.toHaveBeenCalled();

    await act(async () => resolver(registroOk(1)));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("si el registro falla no imprime, muestra el error y el reintento reusa el clientUuid", async () => {
    vi.mocked(registrarImpresionRemitoAction)
      .mockResolvedValueOnce(ERROR_DE_RED)
      .mockResolvedValueOnce(registroOk(1));
    const { container } = render(<RemitoView remito={remito()} />);

    fireEvent.click(botonImprimir());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo registrar la impresión del remito"
    );
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_DE_RED.message);
    expect(print).not.toHaveBeenCalled();
    expect(habilitado(container)).toBe(false);

    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();

    const [primero, segundo] = vi.mocked(registrarImpresionRemitoAction).mock.calls;
    expect(primero[1]).toBeTruthy();
    expect(segundo[1]).toBe(primero[1]);
  });

  it("si la llamada revienta (sin respuesta del servidor) tampoco imprime", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockRejectedValue(new Error("fetch failed"));
    render(<RemitoView remito={remito()} />);

    fireEvent.click(botonImprimir());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo comunicar con el servidor."
    );
    expect(print).not.toHaveBeenCalled();
    expect(botonImprimir()).not.toBeDisabled();
  });

  it("doble clic: un solo registro y un solo diálogo", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue(registroOk(1));
    render(<RemitoView remito={remito()} />);

    fireEvent.click(botonImprimir());
    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(registrarImpresionRemitoAction).toHaveBeenCalledTimes(1);
  });

  it("la habilitación se consume al cerrarse el diálogo; reimprimir registra de nuevo, con otro clientUuid", async () => {
    vi.mocked(registrarImpresionRemitoAction)
      .mockResolvedValueOnce(registroOk(1))
      .mockResolvedValueOnce(registroOk(2));
    const { container } = render(<RemitoView remito={remito()} />);

    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(habilitado(container)).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    // Un Ctrl+P inmediatamente después vuelve a imprimir el aviso.
    expect(habilitado(container)).toBe(false);
    expect(avisoDeImpresion(container)).toBe("Para imprimir este remito usá el botón Imprimir");

    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
    const [primero, segundo] = vi.mocked(registrarImpresionRemitoAction).mock.calls;
    expect(segundo[1]).not.toBe(primero[1]);
  });
});

describe("RemitoView — leyenda de reimpresión", () => {
  it("la primera impresión sale como siempre, sin leyenda", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue(registroOk(1));
    const { container } = render(<RemitoView remito={remito()} />);
    print.mockImplementation(() => {
      expect(container.textContent).not.toMatch(/REIMPRESIÓN/);
    });

    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("desde la segunda, Original y Duplicado llevan número, fecha y usuario", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue(registroOk(2));
    const { container } = render(<RemitoView remito={remito()} />);
    print.mockImplementation(() => {
      expect(screen.getAllByText("REIMPRESIÓN n.º 2 · 02/10/2026 15:30 · Luis")).toHaveLength(2);
    });

    fireEvent.click(botonImprimir());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));

    // Cerrado el diálogo, la leyenda se va con la habilitación.
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(container.textContent).not.toMatch(/REIMPRESIÓN/);
  });

  it("arma el texto con el ordinal que manda el backend", () => {
    expect(leyendaDeReimpresion(impresion(1))).toBeNull();
    expect(leyendaDeReimpresion(impresion(11))).toBe("REIMPRESIÓN n.º 11 · 02/10/2026 15:30 · Luis");
  });
});

describe("RemitoView — un remito que no se imprime", () => {
  const MENSAJE = "Está anulado: el remito no se imprime.";

  it("con impresion.permitida = false muestra el mensaje y no ofrece el botón", () => {
    const { container } = render(
      <RemitoView
        remito={{
          ...remito(),
          impresion: { permitida: false, bloqueo: { codigo: "ENVIO_ANULADO", mensaje: MENSAJE } },
        }}
      />
    );
    expect(screen.getByRole("note")).toHaveTextContent(MENSAJE);
    expect(screen.queryByRole("button", { name: "Imprimir" })).toBeNull();
    // Por teclado tampoco: el remito sigue oculto en impresión.
    expect(habilitado(container)).toBe(false);
    expect(avisoDeImpresion(container)).toBe(MENSAJE);
    // En pantalla se sigue viendo.
    expect(screen.getAllByText("Destino 456")).toHaveLength(2);
  });

  it("un 409 al registrar (se anuló con la página abierta) avisa con el detalle y recarga", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue({
      ok: false,
      code: "ENVIO_ANULADO",
      title: "El envío está anulado",
      message: MENSAJE,
    });
    render(<RemitoView remito={remito()} />);

    fireEvent.click(botonImprimir());
    expect(await screen.findByRole("note")).toHaveTextContent(MENSAJE);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(print).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Imprimir" })).toBeNull();
  });
});

// Impresión automática: la página corre dentro del <iframe> oculto de
// imprimir-remito.ts y le avisa a la ventana madre por postMessage.
describe("RemitoView — embebida en el iframe de la impresión automática", () => {
  const postMessage = vi.fn();
  const parentOriginal = Object.getOwnPropertyDescriptor(window, "parent");

  beforeEach(() => {
    Object.defineProperty(window, "parent", { configurable: true, value: { postMessage } });
  });

  afterEach(() => {
    if (parentOriginal) Object.defineProperty(window, "parent", parentOriginal);
  });

  it("registra ANTES de avisar remito-listo, y avisa ya habilitada", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue(registroOk(1));
    const { container } = render(<RemitoView remito={remito()} />);
    postMessage.mockImplementation(() => {
      expect(registrarImpresionRemitoAction).toHaveBeenCalledTimes(1);
      expect(habilitado(container)).toBe(true);
    });

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage).toHaveBeenCalledWith(
      { tipo: "remito-listo", numero: "32-1" },
      window.location.origin
    );
    // La página embebida no abre el diálogo: eso lo hace la ventana madre.
    expect(print).not.toHaveBeenCalled();
  });

  it("si el registro falla avisa remito-error con el motivo, nunca remito-listo", async () => {
    vi.mocked(registrarImpresionRemitoAction).mockResolvedValue(ERROR_DE_RED);
    const { container } = render(<RemitoView remito={remito()} />);

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage).toHaveBeenCalledWith(
      { tipo: "remito-error", mensaje: ERROR_DE_RED.message, numero: "32-1" },
      window.location.origin
    );
    expect(habilitado(container)).toBe(false);
  });

  it("un remito bloqueado avisa remito-error sin intentar registrar", async () => {
    const mensaje = "Está anulado: el remito no se imprime.";
    render(
      <RemitoView
        remito={{
          ...remito(),
          impresion: { permitida: false, bloqueo: { codigo: "ENVIO_ANULADO", mensaje } },
        }}
      />
    );

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage).toHaveBeenCalledWith(
      { tipo: "remito-error", mensaje, numero: "32-1" },
      window.location.origin
    );
    expect(registrarImpresionRemitoAction).not.toHaveBeenCalled();
  });
});
