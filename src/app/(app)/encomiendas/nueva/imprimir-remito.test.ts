import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";
import { AVISO_IMPRESION_NO_REGISTRADA, imprimirRemitoAutomatico } from "./imprimir-remito";

// Impresión automática tras un alta (alta individual y Carga rápida usan
// esta misma función): la ventana madre solo abre el diálogo si la página
// embebida avisó que la impresión quedó registrada.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  document.body.innerHTML = "";
});

function lanzar() {
  imprimirRemitoAutomatico("000000032-1");
  const iframe = document.querySelector("iframe") as HTMLIFrameElement;
  const print = vi.fn();
  const ventana = iframe.contentWindow as Window;
  ventana.print = print;
  ventana.focus = vi.fn();
  // jsdom no deja armar un MessageEvent con un Window como `source`, así
  // que se arma el evento a mano con los tres campos que mira el listener.
  const avisar = (data: unknown, source: unknown = ventana) => {
    const ev = new Event("message") as Event & {
      data?: unknown;
      origin?: string;
      source?: unknown;
    };
    Object.defineProperties(ev, {
      data: { value: data },
      origin: { value: window.location.origin },
      source: { value: source },
    });
    window.dispatchEvent(ev);
  };
  return { iframe, print, avisar };
}

describe("imprimirRemitoAutomatico", () => {
  it("carga el remito en un iframe oculto", () => {
    const { iframe } = lanzar();
    expect(iframe.getAttribute("src")).toBe("/remito/000000032-1");
    expect(iframe.style.visibility).toBe("hidden");
  });

  it("con remito-listo (impresión registrada) abre el diálogo, sin avisos", () => {
    const { print, avisar } = lanzar();
    expect(print).not.toHaveBeenCalled();

    avisar({ tipo: "remito-listo", numero: "000000032-1" });
    expect(print).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();

    // Ya resuelto: el plazo de espera no agrega un aviso después.
    vi.advanceTimersByTime(20_000);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("con remito-error NO abre el diálogo y avisa, con una acción que abre el remito", () => {
    const abrir = vi.spyOn(window, "open").mockImplementation(() => null);
    const { print, avisar } = lanzar();

    avisar({
      tipo: "remito-error",
      numero: "000000032-1",
      mensaje: "Está anulado: el remito no se imprime.",
    });
    expect(print).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);

    const [titulo, opciones] = vi.mocked(toast.error).mock.calls[0];
    expect(titulo).toBe(AVISO_IMPRESION_NO_REGISTRADA);
    expect(titulo).toBe("No se pudo registrar la impresión del remito");
    expect(opciones?.description).toBe("Está anulado: el remito no se imprime.");

    const accion = opciones?.action as { label: string; onClick: () => void };
    accion.onClick();
    expect(abrir).toHaveBeenCalledWith("/remito/000000032-1", "_blank", "noopener,noreferrer");

    // Un remito-listo tardío no revive la impresión.
    avisar({ tipo: "remito-listo", numero: "000000032-1" });
    expect(print).not.toHaveBeenCalled();
  });

  it("si la página nunca avisa, a los 20 s avisa que no se imprimió", () => {
    const { print } = lanzar();

    vi.advanceTimersByTime(19_999);
    expect(toast.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe(AVISO_IMPRESION_NO_REGISTRADA);
    expect(print).not.toHaveBeenCalled();
  });

  it("ignora mensajes que no vienen de su propio iframe", () => {
    const { print, avisar } = lanzar();
    avisar({ tipo: "remito-listo", numero: "000000032-1" }, window);
    expect(print).not.toHaveBeenCalled();
  });
});
