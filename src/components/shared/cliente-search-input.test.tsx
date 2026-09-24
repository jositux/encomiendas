import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Capa 3 del plan de tests: ClienteSearchInput es el componente compartido
// por Nueva Encomienda (individual y carga rápida), el diálogo de alta
// rápida y Clientes — y tiene historia real de bugs (ver comentario en el
// propio archivo): no se podía elegir un resultado sin mouse, y Tab
// después de elegir con mouse se iba al chrome del navegador. Estos tests
// ejercitan justo esos caminos para que no vuelvan a colarse.
vi.mock("@/server/actions", () => ({
  searchClientesAction: vi.fn(),
}));

import { searchClientesAction } from "@/server/actions";
import { ClienteSearchInput } from "./cliente-search-input";
import type { ClienteApi } from "@/server/services/clientes";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function clienteFixture(overrides: Partial<ClienteApi> = {}): ClienteApi {
  return {
    id: "c1",
    tipo: "persona",
    nombre: "Marta Gimenez",
    telefono: "3755111222",
    documento: null,
    email: null,
    esCuentaCorriente: false,
    activo: true,
    localidadId: "loc-1",
    localidadNombre: "Obera",
    sectorId: "sec-1",
    calle: "Belgrano",
    numero: "123",
    piso: null,
    referencia: null,
    ...overrides,
  };
}

// Envoltorio controlado: refleja cómo se usa el componente en la app real
// (el padre guarda `value` y lo actualiza en onSelectCliente) — necesario
// para probar de verdad el "no busques de nuevo lo que acabas de elegir".
function ControlledClienteSearchInput({
  onSelect,
}: {
  onSelect: (c: ClienteApi) => void;
}) {
  const [value, setValue] = React.useState("");
  return (
    <ClienteSearchInput
      value={value}
      onChange={setValue}
      onSelectCliente={(c) => {
        setValue(c.nombre);
        onSelect(c);
      }}
    />
  );
}

describe("ClienteSearchInput", () => {
  it("no busca con menos de 2 caracteres", async () => {
    const user = userEvent.setup();
    render(<ControlledClienteSearchInput onSelect={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "m");
    await new Promise((r) => setTimeout(r, 400));

    expect(searchClientesAction).not.toHaveBeenCalled();
  });

  it("busca con debounce a partir de 2 caracteres y muestra resultados", async () => {
    const user = userEvent.setup();
    vi.mocked(searchClientesAction).mockResolvedValue([clienteFixture()]);
    render(<ControlledClienteSearchInput onSelect={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "mar");

    expect(await screen.findByText("Marta Gimenez")).toBeInTheDocument();
    expect(searchClientesAction).toHaveBeenCalledWith("mar");
    expect(searchClientesAction).toHaveBeenCalledTimes(1);
  });

  it("sin coincidencias avisa que se va a cargar como cliente nuevo", async () => {
    const user = userEvent.setup();
    vi.mocked(searchClientesAction).mockResolvedValue([]);
    render(<ControlledClienteSearchInput onSelect={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "zzz");

    expect(
      await screen.findByText("Sin coincidencias — se va a cargar como cliente nuevo.")
    ).toBeInTheDocument();
  });

  it("flecha abajo + Enter selecciona el resultado resaltado", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.mocked(searchClientesAction).mockResolvedValue([
      clienteFixture({ id: "c1", nombre: "Marta Gimenez" }),
      clienteFixture({ id: "c2", nombre: "Mario Perez" }),
    ]);
    render(<ControlledClienteSearchInput onSelect={onSelect} />);

    await user.type(screen.getByRole("textbox"), "ma");
    await screen.findByText("Marta Gimenez");

    // Primer resultado ya viene resaltado (highlighted=0 al llegar la
    // búsqueda) — una flecha abajo mueve el resaltado al segundo.
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("c2");
    // El dropdown se cierra y el input queda con el nombre elegido.
    await waitFor(() => {
      expect(screen.queryByText("Mario Perez")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("textbox")).toHaveValue("Mario Perez");
  });

  it("elegir un resultado con el mouse no dispara una búsqueda nueva", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.mocked(searchClientesAction).mockResolvedValue([clienteFixture()]);
    render(<ControlledClienteSearchInput onSelect={onSelect} />);

    await user.type(screen.getByRole("textbox"), "mar");
    const resultado = await screen.findByText("Marta Gimenez");
    await user.click(resultado);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toHaveValue("Marta Gimenez");

    // El value del input cambió a "Marta Gimenez" (>= 2 caracteres): si no
    // fuera por skipNextSearch, dispararía una segunda búsqueda.
    await new Promise((r) => setTimeout(r, 400));
    expect(searchClientesAction).toHaveBeenCalledTimes(1);
  });
});
