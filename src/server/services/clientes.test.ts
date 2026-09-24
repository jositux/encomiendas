import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api-client";

// Mismo criterio que services/usuarios.test.ts: se mockea el unico punto de
// entrada a la red (apiFetchColeccion) y la sesion (requireToken), asi
// listClientes()/searchClientesPorNombre() son testeables sin Next ni
// backend real.
vi.mock("@/server/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-client")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
    apiFetchColeccion: vi.fn(),
  };
});

vi.mock("@/server/services/shared", () => ({
  requireToken: vi.fn().mockResolvedValue("token-de-prueba"),
}));

import { apiFetchColeccion } from "@/server/api-client";
import {
  searchClientesPorNombre,
  searchClientesPorNombreSeguro,
  type ClienteApi,
} from "./clientes";

function cliente(id: string, nombre: string): ClienteApi {
  return {
    id,
    tipo: "empresa",
    nombre,
    telefono: "3755-000000",
    documento: null,
    email: null,
    esCuentaCorriente: false,
    activo: true,
    localidadId: "loc1",
    localidadNombre: "Obera",
    sectorId: "sec1",
    calle: "Av. San Martin",
    numero: "1875",
    piso: null,
    referencia: null,
  };
}

const CLIENTES = [
  cliente("1", "Ferreteria San Martin"),
  cliente("2", "Farmacia Centro SRL"),
  cliente("3", "Juan Galarza"),
  cliente("4", "Ramona Duarte"),
  cliente("5", "Maria Ramona"), // "Ramona" como segunda palabra, no primera
];

function mockClientesEnBackend(datos: ClienteApi[]) {
  vi.mocked(apiFetchColeccion).mockResolvedValue({ datos, total: datos.length, limite: 200, offset: 0 });
}

describe("searchClientesPorNombre", () => {
  beforeEach(() => {
    vi.mocked(apiFetchColeccion).mockReset();
  });

  it("no busca con menos de 2 caracteres (no le pega al backend)", async () => {
    const resultado = await searchClientesPorNombre("a");
    expect(resultado).toEqual([]);
    expect(apiFetchColeccion).not.toHaveBeenCalled();
  });

  it("matchea por prefijo de la primera palabra, sin importar mayusculas", async () => {
    mockClientesEnBackend(CLIENTES);
    const resultado = await searchClientesPorNombre("ferre");
    expect(resultado.map((c) => c.nombre)).toEqual(["Ferreteria San Martin"]);
  });

  it("ignora acentos (normaliza NFD)", async () => {
    mockClientesEnBackend([cliente("6", "José Álvarez")]);
    const resultado = await searchClientesPorNombre("jose");
    expect(resultado).toHaveLength(1);
  });

  it("tambien matchea por una palabra que no es la primera (apellido)", async () => {
    mockClientesEnBackend(CLIENTES);
    const resultado = await searchClientesPorNombre("galarza");
    expect(resultado.map((c) => c.nombre)).toEqual(["Juan Galarza"]);
  });

  it("prioriza los matches por primera palabra sobre los de otra palabra", async () => {
    mockClientesEnBackend(CLIENTES);
    // "Ramona Duarte" matchea por primera palabra; "Maria Ramona" matchea
    // por segunda palabra — el primero tiene que ir antes.
    const resultado = await searchClientesPorNombre("ramona");
    expect(resultado.map((c) => c.nombre)).toEqual(["Ramona Duarte", "Maria Ramona"]);
  });

  it("no devuelve mas de 8 resultados", async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => cliente(String(i), `Cliente Prueba ${i}`));
    mockClientesEnBackend(muchos);
    const resultado = await searchClientesPorNombre("cliente");
    expect(resultado).toHaveLength(8);
  });
});

describe("searchClientesPorNombreSeguro (BUG-2026-09-24-01)", () => {
  beforeEach(() => {
    vi.mocked(apiFetchColeccion).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve [] en vez de tirar cuando el usuario no tiene clientes:leer", async () => {
    vi.mocked(apiFetchColeccion).mockRejectedValue(
      new ApiError(403, "SIN_PERMISO", "Prohibido", "Tu usuario no tiene el permiso clientes:leer.")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(searchClientesPorNombreSeguro("ferre")).resolves.toEqual([]);
  });

  it("la variante sin Seguro SI propaga el 403 (para no perder el comportamiento anterior)", async () => {
    vi.mocked(apiFetchColeccion).mockRejectedValue(
      new ApiError(403, "SIN_PERMISO", "Prohibido", "Tu usuario no tiene el permiso clientes:leer.")
    );

    await expect(searchClientesPorNombre("ferre")).rejects.toThrow("clientes:leer");
  });

  it("devuelve resultados reales cuando el backend responde bien", async () => {
    mockClientesEnBackend(CLIENTES);
    await expect(searchClientesPorNombreSeguro("ferre")).resolves.toEqual([
      CLIENTES[0],
    ]);
  });
});
