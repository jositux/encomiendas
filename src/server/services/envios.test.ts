import { beforeEach, describe, expect, it, vi } from "vitest";

// Mismo criterio que services/clientes.test.ts: se mockea el unico punto de
// entrada a la red (apiFetch) y la sesion (requireToken), asi el cuerpo que
// sale hacia PATCH /envios/:id se puede mirar sin Next ni backend real.
vi.mock("@/server/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-client")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
    nuevoClientUuid: vi.fn(() => "uuid-generado"),
  };
});

vi.mock("@/server/services/shared", () => ({
  requireToken: vi.fn().mockResolvedValue("token-de-prueba"),
}));

import { apiFetch } from "@/server/api-client";
import { actualizarEnvio, modificarEnvio } from "./envios";

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue({});
});

function cuerpoEnviado(): Record<string, unknown> {
  const [, opciones] = vi.mocked(apiFetch).mock.calls[0];
  return (opciones as { body: Record<string, unknown> }).body;
}

describe("modificarEnvio (PATCH /envios/:id desde Seguimiento)", () => {
  it("manda solo los campos recibidos, mas el motivo y el clientUuid de quien llama", async () => {
    await modificarEnvio(
      "envio-1",
      { destinatarioTelefono: "3764-111111", valorDeclarado: null },
      { motivo: "teléfono mal cargado", clientUuid: "uuid-del-panel" }
    );

    const [path, opciones] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe("/envios/envio-1");
    expect((opciones as { method: string }).method).toBe("PATCH");
    expect(cuerpoEnviado()).toEqual({
      destinatarioTelefono: "3764-111111",
      valorDeclarado: null,
      motivo: "teléfono mal cargado",
      clientUuid: "uuid-del-panel",
    });
  });
});

describe("actualizarEnvio (PATCH /envios/:id desde Carga rapida)", () => {
  it("aplana remitente/destinatario y agrega el motivo", async () => {
    await actualizarEnvio(
      "envio-1",
      {
        remitente: { nombre: "Juan Perez", telefono: "3755-000000", calle: "Sarmiento" },
        destinatario: { nombre: "Maria Lopez", calle: "San Martin", numero: "123" },
        cantidadBultos: 2,
      },
      "Corrección durante la carga rápida"
    );

    expect(cuerpoEnviado()).toEqual({
      remitenteNombre: "Juan Perez",
      remitenteTelefono: "3755-000000",
      remitenteCalle: "Sarmiento",
      destinatarioNombre: "Maria Lopez",
      destinatarioCalle: "San Martin",
      destinatarioNumero: "123",
      cantidadBultos: 2,
      motivo: "Corrección durante la carga rápida",
      clientUuid: "uuid-generado",
    });
  });

  // El contrato (ModificarEnvioDto) no declara ninguno de estos y el backend
  // rechaza con 400 cualquier propiedad que no conozca: mandarlos rompia el
  // "Editar" de Carga rapida cuando la fila tenia un cliente vinculado.
  it("no manda la cuenta de cliente, la localidad, el sector ni el domicilio guardado", async () => {
    await actualizarEnvio(
      "envio-1",
      {
        remitente: { nombre: "Juan Perez", clienteId: "cli-1", localidadId: "loc-1" },
        destinatario: {
          nombre: "Maria Lopez",
          clienteId: "cli-2",
          domicilioId: "dom-1",
          localidadId: "loc-2",
          sectorId: "sec-2",
        },
      },
      "Corrección durante la carga rápida"
    );

    expect(Object.keys(cuerpoEnviado()).sort()).toEqual([
      "clientUuid",
      "destinatarioNombre",
      "motivo",
      "remitenteNombre",
    ]);
  });
});
