import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api-client";

// Los servicios pegan contra el backend real vía un unico punto,
// apiFetch/apiFetchColeccion (api-client.ts), y necesitan un token de
// sesion vía requireToken() (services/shared.ts, que a su vez usa
// next/headers). Mockeando esos dos puntos de entrada, listUsuarios() y
// listUsuariosSeguro() quedan testeables sin Next ni backend real.
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
import { listUsuarios, listUsuariosSeguro, type UsuarioApi } from "./usuarios";

const usuarioDeEjemplo: UsuarioApi = {
  id: "u1",
  nombre: "Operador de Obera",
  username: "operador_obera",
  activo: true,
  puntoId: "p1",
  tipoChofer: null,
  roles: [],
};

describe("listUsuarios / listUsuariosSeguro", () => {
  beforeEach(() => {
    vi.mocked(apiFetchColeccion).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listUsuarios devuelve pagina.datos cuando el backend responde bien", async () => {
    vi.mocked(apiFetchColeccion).mockResolvedValue({
      datos: [usuarioDeEjemplo],
      total: 1,
      limite: 200,
      offset: 0,
    });

    await expect(listUsuarios()).resolves.toEqual([usuarioDeEjemplo]);
  });

  it("listUsuarios propaga el error si el backend falla (sin variante Seguro)", async () => {
    vi.mocked(apiFetchColeccion).mockRejectedValue(
      new ApiError(403, "SIN_PERMISO", "Prohibido", "Tu usuario no tiene el permiso usuarios:leer.")
    );

    await expect(listUsuarios()).rejects.toThrow("usuarios:leer");
  });

  it("listUsuariosSeguro devuelve [] (no tira) si listUsuarios() falla", async () => {
    vi.mocked(apiFetchColeccion).mockRejectedValue(
      new ApiError(403, "SIN_PERMISO", "Prohibido", "Tu usuario no tiene el permiso usuarios:leer.")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(listUsuariosSeguro()).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("listUsuariosSeguro tambien absorbe errores que no son 403 (catch generico, a proposito)", async () => {
    // El wrapper "Seguro" no filtra por status: cualquier error (un backend
    // caido, no solo un 403 de permisos) se convierte en []. Documentado en
    // el comentario de la funcion como intencional, y este test lo fija tal
    // cual es hoy.
    vi.mocked(apiFetchColeccion).mockRejectedValue(new TypeError("fetch failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(listUsuariosSeguro()).resolves.toEqual([]);
  });

  it("listUsuariosSeguro devuelve los datos reales cuando el backend responde bien", async () => {
    vi.mocked(apiFetchColeccion).mockResolvedValue({
      datos: [usuarioDeEjemplo],
      total: 1,
      limite: 200,
      offset: 0,
    });

    await expect(listUsuariosSeguro()).resolves.toEqual([usuarioDeEjemplo]);
  });
});
