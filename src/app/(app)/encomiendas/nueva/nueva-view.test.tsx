import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Capa 3 del plan de tests (ver claude/... y la conversación del
// 2026-09-24 sobre el "paso 2" de dividir NuevaEncomiendaView): estos son
// tests de integración sobre el componente TAL COMO ESTÁ HOY, escritos
// ANTES de mover una sola línea de JSX. La idea es que si el split en
// AltaIndividualView/CargaRapidaView rompe algo (por ejemplo, el estado
// compartido `origen` dejando de llegar a uno de los dos modos), estos
// tests lo detecten solos en vez de depender solo de una revisión visual
// en el navegador.
vi.mock("@/server/actions", () => ({
  crearEnvioAction: vi.fn(),
  actualizarEnvioAction: vi.fn(),
  searchClientesAction: vi.fn(),
  createClienteAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { crearEnvioAction, searchClientesAction } from "@/server/actions";
import { toast } from "sonner";
import { NuevaEncomiendaView } from "./nueva-view";
import type { LocalidadBackend, SesionUsuario } from "@/types";
import type { EnvioApi } from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function localidad(id: string): LocalidadBackend {
  return {
    id,
    nombre: `Localidad ${id}`,
    provinciaId: "prov1",
    provinciaNombre: "Provincia de prueba",
  };
}

function sesion(): SesionUsuario {
  return {
    usuarioId: "u1",
    nombre: "Operador de prueba",
    puntoId: "punto1",
    esGlobal: true,
    puntosEnAlcance: ["punto1"],
    permisos: [],
  };
}

function envioFixture(overrides: Partial<EnvioApi> = {}): EnvioApi {
  return {
    id: "id-envio-test",
    numero: "000000099-1",
    remitoManualNumero: null,
    remitenteNombre: "Juan Perez",
    remitenteTelefono: "",
    clienteRemitenteId: null,
    destinatarioNombre: "Maria Lopez",
    destinatarioTelefono: "",
    destinatarioCalle: "San Martin 123",
    destinatarioNumero: null,
    destinatarioPiso: null,
    destinatarioReferencia: null,
    clienteDestinatarioId: null,
    localidadOrigenId: null,
    localidadDestinoId: "loc-1",
    sectorDestinoId: null,
    recorridoId: null,
    puntoAltaId: "punto1",
    cantidadBultos: 1,
    fleteImporte: "0",
    tipo: "paqueteria",
    lugarPago: "destino",
    formaPago: "contado",
    contrarreembolsoImporte: null,
    camino: "",
    guiaDiariaNumero: 99,
    estadoActual: "REGISTRADO",
    custodiaActualUsuarioId: null,
    custodiaActualPuntoId: null,
    planillaActualId: null,
    creadoEn: "2026-09-24T12:00:00.000Z",
    guiaDiaria: "E99",
    ubicacion: "",
    ...overrides,
  } as EnvioApi;
}

// Un solo input siempre igual en ambos modos: getByPlaceholderText solo es
// único mientras haya un solo ClienteSearchInput visible a la vez (por eso
// cada test lo usa recién en el momento justo del flujo, nunca con dos
// bloques de "nombre" mostrados juntos).
const PLACEHOLDER_NOMBRE = "Apellido y nombres — buscá por nombre o cargá uno nuevo";

function inputJuntoALabel(texto: string): HTMLInputElement {
  const label = screen.getByText(texto);
  const input = label.parentElement?.querySelector("input");
  if (!input) throw new Error(`No se encontró un input junto a la etiqueta "${texto}"`);
  return input as HTMLInputElement;
}

function renderView() {
  vi.mocked(searchClientesAction).mockResolvedValue([]);
  return render(
    <NuevaEncomiendaView
      localidades={[localidad("loc-1")]}
      sectores={[] as SectorApi[]}
      envios={[]}
      session={sesion()}
    />
  );
}

describe("NuevaEncomiendaView - modo Individual", () => {
  it("envía la encomienda con los datos cargados y limpia el formulario", async () => {
    const user = userEvent.setup();
    vi.mocked(crearEnvioAction).mockResolvedValue({ ok: true, envio: envioFixture() });
    const { container } = renderView();

    await user.type(container.querySelector("#origen-nombre") as HTMLInputElement, "Juan Perez");
    await user.type(container.querySelector("#destino-nombre") as HTMLInputElement, "Maria Lopez");
    await user.type(
      container.querySelector("#destino-calle") as HTMLInputElement,
      "San Martin 123"
    );

    await user.click(screen.getByRole("button", { name: "Agregar encomienda" }));

    expect(crearEnvioAction).toHaveBeenCalledTimes(1);
    const [data] = vi.mocked(crearEnvioAction).mock.calls[0];
    expect(data.remitente.nombre).toBe("Juan Perez");
    expect(data.destinatario.nombre).toBe("Maria Lopez");
    expect(data.destinatario.calle).toBe("San Martin 123");
    // localidadId de destino viene precargado con la primera localidad
    // (emptyDestino, ver nueva-view.helpers.ts) — nunca hizo falta tocar
    // el Select para que la validación pase.
    expect(data.destinatario.localidadId).toBe("loc-1");

    expect(toast.success).toHaveBeenCalledTimes(1);
    // resetForm() se llama tras el éxito: el campo vuelve a quedar vacío.
    expect((container.querySelector("#origen-nombre") as HTMLInputElement).value).toBe("");
  });

  it("no envía nada y muestra los errores si faltan campos obligatorios", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Agregar encomienda" }));

    expect(crearEnvioAction).not.toHaveBeenCalled();
    expect(await screen.findByText("Ingresá el remitente.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá el destinatario.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá la calle de destino.")).toBeInTheDocument();
  });
});

describe("NuevaEncomiendaView - modo Carga rápida", () => {
  it("confirma el remitente, agrega un destino y lo guarda", async () => {
    const user = userEvent.setup();
    vi.mocked(crearEnvioAction).mockResolvedValue({ ok: true, envio: envioFixture() });
    renderView();

    await user.click(screen.getByRole("button", { name: "Carga rápida" }));

    // Paso 1: elegir remitente (usa el mismo estado `origen` que el modo
    // Individual — esto es justo lo que el análisis de "paso 2" marcó como
    // el único punto realmente compartido entre los dos modos).
    await user.type(screen.getByPlaceholderText(PLACEHOLDER_NOMBRE), "Juan Perez");
    await user.type(inputJuntoALabel("Teléfono"), "3755000000");
    await user.click(screen.getByRole("button", { name: "Confirmar remitente" }));

    // Paso 2: agregar un destino y guardarlo.
    await user.click(screen.getByRole("button", { name: "Agregar destino" }));
    await user.type(screen.getByPlaceholderText(PLACEHOLDER_NOMBRE), "Maria Lopez");
    await user.type(inputJuntoALabel("Calle"), "San Martin 123");
    await user.click(screen.getByRole("button", { name: "Guardar destino" }));

    expect(crearEnvioAction).toHaveBeenCalledTimes(1);
    const [data] = vi.mocked(crearEnvioAction).mock.calls[0];
    expect(data.remitente.nombre).toBe("Juan Perez");
    expect(data.remitente.telefono).toBe("3755000000");
    expect(data.destinatario.nombre).toBe("Maria Lopez");
    expect(data.destinatario.calle).toBe("San Martin 123");
    expect(data.destinatario.localidadId).toBe("loc-1");
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("no deja guardar un destino sin nombre ni calle", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Carga rápida" }));
    await user.type(screen.getByPlaceholderText(PLACEHOLDER_NOMBRE), "Juan Perez");
    await user.type(inputJuntoALabel("Teléfono"), "3755000000");
    await user.click(screen.getByRole("button", { name: "Confirmar remitente" }));
    await user.click(screen.getByRole("button", { name: "Agregar destino" }));

    await user.click(screen.getByRole("button", { name: "Guardar destino" }));

    expect(crearEnvioAction).not.toHaveBeenCalled();
    expect(await screen.findByText("Ingresá el destinatario.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá la calle de destino.")).toBeInTheDocument();
  });
});

describe("NuevaEncomiendaView - estado compartido entre modos", () => {
  it("no pierde el remitente (origen) cargado al cambiar de Individual a Carga rápida", async () => {
    const user = userEvent.setup();
    const { container } = renderView();

    await user.type(container.querySelector("#origen-nombre") as HTMLInputElement, "Juan Perez");

    await user.click(screen.getByRole("button", { name: "Carga rápida" }));

    // En Carga rápida, antes de confirmar, el mismo `origen.nombre` alimenta
    // el ClienteSearchInput del remitente — si el futuro split rompiera el
    // levantamiento de este estado al padre, este input aparecería vacío.
    expect(screen.getByPlaceholderText(PLACEHOLDER_NOMBRE)).toHaveValue("Juan Perez");
  });
});
