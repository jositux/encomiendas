import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// "Lo que llevás" en la pantalla del chofer (2026-10-02). Se mockea el
// borde: las Server Actions, los toasts y el lector de códigos (cámara).
vi.mock("@/server/actions", () => ({
  buscarPlanillaPorCodigoAction: vi.fn(),
  buscarSeguimientoAction: vi.fn(),
  recibirEnvioSueltoAction: vi.fn(),
  listLoQueLlevaAction: vi.fn(),
  cargarPlanillaAction: vi.fn(),
  recibirPlanillaAction: vi.fn(),
  entregarEnvioAction: vi.fn(),
  registrarIntentoFallidoAction: vi.fn(),
  registrarIncidenciaAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/components/shared/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

vi.mock("@/components/shared/qr-scanner-dialog", () => ({
  QrScannerDialog: () => null,
}));

import {
  buscarPlanillaPorCodigoAction,
  buscarSeguimientoAction,
  cargarPlanillaAction,
  listLoQueLlevaAction,
  recibirEnvioSueltoAction,
} from "@/server/actions";
import type {
  EnvioEnCustodiaApi,
  PlanillaApi,
  ResultadoEnviosEnCustodia,
} from "@/server/services/custodia";
import type { LocalidadBackend } from "@/types";
import {
  envioFixture,
  seguimientoFixture,
} from "@/app/(app)/seguimiento/seguimiento.fixtures";
import { ChoferView } from "./chofer-view";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const YO = "u-chofer";
const LOCALIDADES = [{ id: "loc-posadas", nombre: "Posadas" }] as LocalidadBackend[];

function enCustodia(n: number, overrides: Partial<EnvioEnCustodiaApi> = {}): EnvioEnCustodiaApi {
  return {
    ...envioFixture({
      id: `envio-${n}`,
      numero: `00000000${n}-1`,
      destinatarioNombre: `Destinatario ${n}`,
      destinatarioCalle: "Av. Mitre",
      destinatarioNumero: `${n}00`,
    }),
    custodia: { usuario: { id: YO, nombre: "Chofer" }, punto: null },
    ...overrides,
  };
}

function lista(envios: EnvioEnCustodiaApi[], total = envios.length): ResultadoEnviosEnCustodia {
  return { ok: true, data: { datos: envios, total, limite: 200, offset: 0, alcance: "propio" } };
}

function renderChofer(inicial: ResultadoEnviosEnCustodia) {
  return render(
    <ChoferView
      permisos={["custodia:registrar", "entregas:registrar", "envios:leer"]}
      usuarioId={YO}
      loQueLlevaInicial={inicial}
      localidades={LOCALIDADES}
    />
  );
}

function seccion(): HTMLElement {
  const titulo = screen.getByRole("heading", { name: /Lo que llevás/ });
  return titulo.closest("[data-slot=card]") as HTMLElement;
}

describe("Chofer — Lo que llevás", () => {
  it("lista número, destinatario, domicilio y destino, con la cantidad total", () => {
    renderChofer(lista([enCustodia(1), enCustodia(2)]));

    const s = within(seccion());
    expect(s.getByRole("heading", { name: /Lo que llevás/ })).toHaveTextContent("2 envíos");
    const items = s.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "#000000001-1Destinatario 1Av. Mitre 100Posadas",
      "#000000002-1Destinatario 2Av. Mitre 200Posadas",
    ]);
  });

  it("sin nada en custodia lo dice, con el total en cero", () => {
    renderChofer(lista([]));
    const s = within(seccion());
    expect(s.getByRole("heading", { name: /Lo que llevás/ })).toHaveTextContent("0 envíos");
    expect(s.getByText("No tenés envíos en custodia.")).toBeInTheDocument();
  });

  it("si hay más de los que entran en la lista, avisa cuántos se ven", () => {
    renderChofer(lista([enCustodia(1)], 250));
    const s = within(seccion());
    expect(s.getByRole("heading", { name: /Lo que llevás/ })).toHaveTextContent("250 envíos");
    expect(s.getByText("Se muestran los primeros 1 de 250.")).toBeInTheDocument();
  });

  it("si no se pudo leer, muestra el motivo sin tirar abajo la pantalla", () => {
    renderChofer({ ok: false, title: "Sin permiso", message: "No podés ver esos envíos." });
    expect(within(seccion()).getByRole("alert")).toHaveTextContent("Sin permiso");
    // El resto de la pantalla sigue ahí.
    expect(screen.getByRole("heading", { name: "Recibir paquete" })).toBeInTheDocument();
  });

  it("se vuelve a pedir después de recibir un envío suelto", async () => {
    vi.mocked(buscarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({
        envio: { numero: "000000009-3", estadoActual: "REGISTRADO", custodiaActualUsuarioId: null },
      }),
    });
    vi.mocked(recibirEnvioSueltoAction).mockResolvedValue({
      ok: true,
      data: { evento: { duplicado: false } },
    } as Awaited<ReturnType<typeof recibirEnvioSueltoAction>>);
    vi.mocked(listLoQueLlevaAction).mockResolvedValue(lista([enCustodia(1), enCustodia(9)]));
    renderChofer(lista([enCustodia(1)]));
    expect(within(seccion()).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText("Ej: 000000009-3 o A17"), {
      target: { value: "000000009-3" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Ej: 000000009-3 o A17"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /Recibir acá/ }));

    await waitFor(() => expect(listLoQueLlevaAction).toHaveBeenCalledTimes(1));
    expect(listLoQueLlevaAction).toHaveBeenCalledWith(YO);
    await waitFor(() => expect(within(seccion()).getAllByRole("listitem")).toHaveLength(2));
    expect(within(seccion()).getByRole("heading", { name: /Lo que llevás/ })).toHaveTextContent(
      "2 envíos"
    );
  });

  it("se vuelve a pedir después de cargar una planilla", async () => {
    const planilla: PlanillaApi = {
      id: "planilla-1",
      codigoQr: "QR-TAUDR7",
      codigoCorto: "TAUDR7",
      despachoId: "despacho-1",
      estado: "armada",
      sectorDestinoId: "sec-centro",
      sectorDestinoNombre: "Centro",
      localidadDestinoId: "loc-posadas",
      localidadDestinoNombre: "Posadas",
      envios: [],
    };
    vi.mocked(buscarPlanillaPorCodigoAction).mockResolvedValue({ ok: true, data: planilla });
    vi.mocked(cargarPlanillaAction).mockResolvedValue({ ok: true });
    vi.mocked(listLoQueLlevaAction).mockResolvedValue(
      lista([enCustodia(1), enCustodia(2), enCustodia(3)])
    );
    renderChofer(lista([]));

    fireEvent.change(screen.getByPlaceholderText("Ej: TAUDR7"), { target: { value: "TAUDR7" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Ej: TAUDR7"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /Cargar planilla/ }));

    await waitFor(() => expect(listLoQueLlevaAction).toHaveBeenCalledWith(YO));
    await waitFor(() => expect(within(seccion()).getAllByRole("listitem")).toHaveLength(3));
  });

  it("buscar sin hacer ningún acto no vuelve a pedir la lista", async () => {
    vi.mocked(buscarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({ envio: { estadoActual: "REGISTRADO" } }),
    });
    renderChofer(lista([enCustodia(1)]));

    fireEvent.change(screen.getByPlaceholderText("Ej: 000000009-3 o A17"), {
      target: { value: "000000009-3" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Ej: 000000009-3 o A17"), { key: "Enter" });
    await screen.findByRole("button", { name: /Recibir acá/ });

    expect(listLoQueLlevaAction).not.toHaveBeenCalled();
  });
});
