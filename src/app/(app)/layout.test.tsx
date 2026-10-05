import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/session", () => ({ getSession: vi.fn() }));
vi.mock("@/server/services/puntos", () => ({ listPuntosSeguro: vi.fn() }));
// El sidebar y el header son componentes cliente con hooks de Next: acá
// solo importa la cáscara que los rodea.
vi.mock("@/components/layout/app-sidebar", () => ({ AppSidebar: () => <nav /> }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

import { getSession } from "@/server/session";
import { listPuntosSeguro } from "@/server/services/puntos";
import AppLayout from "./layout";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// 2026-10-05: el scroll de la app vive en <main>, no en la ventana. Al
// tabular, el navegador trae el campo enfocado "apenas" adentro del borde;
// el scroll-padding es lo que le deja aire para que no quede pegado abajo.
describe("AppLayout — el contenedor que scrollea", () => {
  it("es <main>, con scroll-padding arriba y abajo para el campo enfocado", async () => {
    vi.mocked(getSession).mockResolvedValue({
      usuarioId: "u1",
      nombre: "Operador",
      puntoId: "p1",
      esGlobal: false,
      puntosEnAlcance: ["p1"],
      permisos: [],
    });
    vi.mocked(listPuntosSeguro).mockResolvedValue([]);

    const { container } = render(await AppLayout({ children: <p>contenido</p> }));

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("overflow-y-auto");
    expect(main?.className).toContain("scroll-pt-6");
    expect(main?.className).toContain("scroll-pb-32");
    // Nada más scrollea arriba de <main>: la cáscara es de alto fijo.
    expect(main?.parentElement?.parentElement?.className).toContain("overflow-hidden");
  });
});
