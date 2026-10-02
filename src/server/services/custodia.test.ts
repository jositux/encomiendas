import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api-client";

// Mismo criterio que services/clientes.test.ts: se mockea el unico punto de
// entrada a la red (apiFetch) y la sesion (requireToken).
vi.mock("@/server/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-client")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("@/server/services/shared", () => ({
  requireToken: vi.fn().mockResolvedValue("token-de-prueba"),
}));

import { apiFetch } from "@/server/api-client";
import { listCustodios, listEnviosEnCustodia, listLoQueLleva } from "./custodia";

const PAGINA = { datos: [], total: 0, limite: 50, offset: 0, alcance: "propio" };

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue(PAGINA);
});

const pathPedido = () => vi.mocked(apiFetch).mock.calls[0][0];

describe("listEnviosEnCustodia (GET /custodia/envios)", () => {
  it("sin filtros pide la vista por defecto del alcance, con un límite", async () => {
    await listEnviosEnCustodia();
    expect(pathPedido()).toBe("/custodia/envios?limite=50");
  });

  it("manda el custodio, el punto y la página que se piden", async () => {
    await listEnviosEnCustodia({ usuarioId: "u-luis", puntoId: "p-obera", limite: 25, offset: 50 });
    expect(pathPedido()).toBe("/custodia/envios?usuarioId=u-luis&puntoId=p-obera&limite=25&offset=50");
  });

  it("devuelve la página con el alcance que informó el backend", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ...PAGINA, alcance: "base", total: 7 });
    await expect(listEnviosEnCustodia()).resolves.toMatchObject({ alcance: "base", total: 7 });
  });
});

describe("listCustodios (GET /custodia/custodios)", () => {
  it("pide el máximo de filas: alimenta el selector de persona", async () => {
    await listCustodios();
    expect(pathPedido()).toBe("/custodia/custodios?limite=200");
  });
});

describe("listLoQueLleva (la lista de la pantalla del chofer)", () => {
  it("pide los envíos en custodia de ese usuario", async () => {
    await expect(listLoQueLleva("u-chofer")).resolves.toEqual({ ok: true, data: PAGINA });
    expect(pathPedido()).toBe("/custodia/envios?usuarioId=u-chofer&limite=200");
  });

  it("un rechazo del backend vuelve como dato, no como excepción", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(403, "FUERA_DE_ALCANCE", "Fuera de tu alcance", "No podés ver esos envíos.")
    );
    await expect(listLoQueLleva("u-otro")).resolves.toEqual({
      ok: false,
      title: "Fuera de tu alcance",
      message: "No podés ver esos envíos.",
    });
  });

  it("un error que no es del backend sí se propaga", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("fetch failed"));
    await expect(listLoQueLleva("u-chofer")).rejects.toThrow("fetch failed");
  });
});
