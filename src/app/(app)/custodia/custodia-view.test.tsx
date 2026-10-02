import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import type {
  CustodioApi,
  EnvioEnCustodiaApi,
  PaginaDeEnviosEnCustodia,
} from "@/server/services/custodia";
import type { LocalidadBackend } from "@/types";
import { envioFixture } from "@/app/(app)/seguimiento/seguimiento.fixtures";
import { CustodiaView, opcionesDePersona } from "./custodia-view";
import { paginaValida, urlDeCustodia } from "./custodia-url";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const YO = "u-ana";

const CUSTODIOS: CustodioApi[] = [
  { usuario: { id: "u-ana", nombre: "Ana" }, cantidad: 3 },
  { usuario: { id: "u-luis", nombre: "Luis" }, cantidad: 5 },
  { usuario: { id: "u-marta", nombre: "Marta" }, cantidad: 2 },
];

const LOCALIDADES = [
  { id: "loc-obera", nombre: "Oberá" },
  { id: "loc-posadas", nombre: "Posadas" },
] as LocalidadBackend[];

function envio(n: number, overrides: Partial<EnvioEnCustodiaApi> = {}): EnvioEnCustodiaApi {
  return {
    ...envioFixture({ id: `envio-${n}`, numero: `00000000${n}-1`, guiaDiaria: `A${n}` }),
    custodia: {
      usuario: { id: "u-luis", nombre: "Luis" },
      punto: { id: "p-obera", nombre: "Base Oberá" },
    },
    ...overrides,
  };
}

function pagina(overrides: Partial<PaginaDeEnviosEnCustodia> = {}): PaginaDeEnviosEnCustodia {
  return {
    datos: [envio(1), envio(2)],
    total: 2,
    limite: 25,
    offset: 0,
    alcance: "todo",
    ...overrides,
  };
}

function renderView(
  envios: PaginaDeEnviosEnCustodia | null,
  props: Partial<React.ComponentProps<typeof CustodiaView>> = {}
) {
  return render(
    <CustodiaView
      envios={envios}
      custodios={CUSTODIOS}
      totalSinFiltro={envios?.total ?? 0}
      localidades={LOCALIDADES}
      usuarioId={YO}
      seleccion=""
      {...props}
    />
  );
}

const selector = () => screen.queryByLabelText("Quién los tiene") as HTMLSelectElement | null;
const opciones = () => Array.from(selector()?.options ?? []).map((o) => o.textContent);

describe("Custodia — el selector depende del alcance que informa el backend", () => {
  it("propio (p. ej. chofer): sin selector, y habla de lo que tiene él", () => {
    renderView(pagina({ alcance: "propio", total: 2 }));
    expect(selector()).toBeNull();
    expect(screen.getByText("Tenés 2 envíos en custodia")).toBeInTheDocument();
  });

  it("base (operador): Míos / De la base (por defecto) / una persona", () => {
    renderView(pagina({ alcance: "base", total: 10 }));
    expect(opciones()).toEqual(["Míos (3)", "De la base", "Luis (5)", "Marta (2)"]);
    expect(selector()?.selectedOptions[0].textContent).toBe("De la base");
    expect(screen.getByText("10 envíos en custodia")).toBeInTheDocument();
  });

  it("todo (supervisor, administración): Todos (por defecto) / una persona con su cantidad", () => {
    renderView(pagina({ alcance: "todo", total: 10 }));
    expect(opciones()).toEqual(["Todos (10)", "Ana (3)", "Luis (5)", "Marta (2)"]);
    expect(selector()?.selectedOptions[0].textContent).toBe("Todos (10)");
  });

  it("Todos (n) es el total de la lista sin filtro, no la suma de las cantidades por persona", () => {
    // 3 + 5 + 2 = 10 entre las personas listadas, pero la lista tiene 240.
    renderView(pagina({ alcance: "todo", total: 240 }));
    expect(opciones()?.[0]).toBe("Todos (240)");
  });

  it("con una persona elegida, Todos (n) sigue mostrando el total sin filtro", () => {
    renderView(pagina({ alcance: "todo", total: 5 }), { seleccion: "u-luis", totalSinFiltro: 240 });
    expect(opciones()?.[0]).toBe("Todos (240)");
    expect(screen.getByText("5 envíos en custodia")).toBeInTheDocument();
  });

  it("refleja en el selector la persona que vino en la URL", () => {
    renderView(pagina({ alcance: "todo" }), { seleccion: "u-luis" });
    expect(selector()?.selectedOptions[0].textContent).toBe("Luis (5)");
  });

  it("con Míos elegido habla de lo que tiene él", () => {
    renderView(pagina({ alcance: "base", total: 3 }), { seleccion: "mios" });
    expect(selector()?.selectedOptions[0].textContent).toBe("Míos (3)");
    expect(screen.getByText("Tenés 3 envíos en custodia")).toBeInTheDocument();
  });

  it("una persona de la URL que hoy no tiene nada igual figura en el selector", () => {
    expect(opcionesDePersona("todo", CUSTODIOS, YO, "u-nadie", 10).at(-1)).toEqual({
      value: "u-nadie",
      label: "Persona sin envíos (0)",
    });
  });

  it("elegir otra opción navega a la primera página de ese filtro", () => {
    renderView(pagina({ alcance: "base", offset: 25, total: 60 }));
    fireEvent.change(selector()!, { target: { value: "u-marta" } });
    expect(push).toHaveBeenCalledWith("/custodia?persona=u-marta");

    fireEvent.change(selector()!, { target: { value: "mios" } });
    expect(push).toHaveBeenLastCalledWith("/custodia?persona=mios");

    fireEvent.change(selector()!, { target: { value: "" } });
    expect(push).toHaveBeenLastCalledWith("/custodia");
  });
});

describe("Custodia — la lista", () => {
  it("toma de la respuesta quién lo tiene y en qué punto, y dice dónde está en palabras", () => {
    renderView(
      pagina({
        datos: [
          envio(1, {
            ubicacion: "en_reparto",
            custodia: {
              usuario: { id: "u-luis", nombre: "Luis" },
              punto: { id: "p-obera", nombre: "Base Oberá" },
            },
          }),
          envio(2, {
            ubicacion: "en_origen",
            custodia: { usuario: { id: "u-marta", nombre: "Marta" }, punto: null },
          }),
        ],
      })
    );

    const [, fila1, fila2] = screen.getAllByRole("row");
    const celdas = (fila: HTMLElement) =>
      within(fila)
        .getAllByRole("cell")
        .map((c) => c.textContent?.trim());

    expect(celdas(fila1)).toEqual([
      "#A1000000001-1",
      "Ferreteria San Martin → Farmacia Centro SRL",
      "Posadas",
      "En reparto",
      "Luis",
      "Base Oberá",
      "01/10/2026",
    ]);
    // Sin punto anotado: guion, no un nombre inventado.
    expect(celdas(fila2).slice(3, 6)).toEqual(["En origen", "Marta", "—"]);
    // El estado crudo ya no se muestra.
    expect(screen.queryByText("REGISTRADO")).toBeNull();
    expect(screen.queryByText("EN_CUSTODIA")).toBeNull();
  });

  it("un envío sin guía diaria muestra su número una sola vez", () => {
    renderView(pagina({ datos: [envio(1, { guiaDiaria: null })] }));
    const [, fila] = screen.getAllByRole("row");
    expect(within(fila).getAllByRole("cell")[0].textContent).toBe("#000000001-1");
  });

  it("vacía con alcance propio: No tenés envíos en custodia", () => {
    renderView(pagina({ alcance: "propio", datos: [], total: 0 }));
    expect(screen.getByText("No tenés envíos en custodia")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("vacía con alcance amplio: No hay envíos en custodia", () => {
    renderView(pagina({ alcance: "todo", datos: [], total: 0 }));
    expect(screen.getByText("No hay envíos en custodia")).toBeInTheDocument();
  });

  it("si el backend rechaza el pedido muestra su mensaje y el camino de vuelta", () => {
    renderView(null, {
      error: { title: "Fuera de tu alcance", message: "No podés ver los envíos de esa persona." },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Fuera de tu alcance");
    expect(screen.getByRole("alert")).toHaveTextContent("No podés ver los envíos de esa persona.");
    expect(screen.getByRole("link", { name: "Volver a la lista" })).toHaveAttribute(
      "href",
      "/custodia"
    );
  });
});

describe("Custodia — paginación contra el backend", () => {
  const anterior = () => screen.getByRole("button", { name: /Anterior/ });
  const siguiente = () => screen.getByRole("button", { name: /Siguiente/ });

  it("primera página: dice qué tramo se ve y solo deja avanzar", () => {
    renderView(pagina({ total: 60, limite: 25, offset: 0 }));
    expect(screen.getByText("Mostrando 1–2 de 60")).toBeInTheDocument();
    expect(anterior()).toBeDisabled();

    fireEvent.click(siguiente());
    expect(push).toHaveBeenCalledWith("/custodia?pagina=2");
  });

  it("página del medio: conserva el filtro al ir y volver", () => {
    renderView(pagina({ total: 60, limite: 25, offset: 25 }), { seleccion: "u-luis" });
    expect(screen.getByText("Página 2")).toBeInTheDocument();

    fireEvent.click(siguiente());
    expect(push).toHaveBeenLastCalledWith("/custodia?persona=u-luis&pagina=3");
    fireEvent.click(anterior());
    expect(push).toHaveBeenLastCalledWith("/custodia?persona=u-luis");
  });

  it("última página: no deja avanzar", () => {
    renderView(pagina({ total: 27, limite: 25, offset: 25 }));
    expect(screen.getByText("Mostrando 26–27 de 27")).toBeInTheDocument();
    expect(siguiente()).toBeDisabled();
  });
});

describe("custodia-url", () => {
  it("arma la URL sin parámetros de más", () => {
    expect(urlDeCustodia("", 1)).toBe("/custodia");
    expect(urlDeCustodia("mios", 1)).toBe("/custodia?persona=mios");
    expect(urlDeCustodia("", 3)).toBe("/custodia?pagina=3");
    expect(urlDeCustodia("u-luis", 2)).toBe("/custodia?persona=u-luis&pagina=2");
  });

  it("una página inválida es la primera", () => {
    expect(paginaValida(undefined)).toBe(1);
    expect(paginaValida("abc")).toBe(1);
    expect(paginaValida("0")).toBe(1);
    expect(paginaValida("-2")).toBe(1);
    expect(paginaValida("2.5")).toBe(1);
    expect(paginaValida("4")).toBe(4);
  });
});
