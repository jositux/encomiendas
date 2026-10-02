import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Tests de integración de la pantalla de Seguimiento, con el panel
// "Modificar datos" montado adentro tal como lo ve el usuario (2026-10-01).
// Se mockea solo el borde: las Server Actions, los toasts y la apertura del
// remito en otra pestaña.
vi.mock("@/server/actions", () => ({
  buscarSeguimientoAction: vi.fn(),
  refrescarSeguimientoAction: vi.fn(),
  modificarEnvioAction: vi.fn(),
  anularEnvioAction: vi.fn(),
  corregirSectorEnvioAction: vi.fn(),
  moverEnvioDePlanillaAction: vi.fn(),
  confirmarEnvioAction: vi.fn(),
  confirmarEnvioConEntregaAction: vi.fn(),
  revertirEntregaEnvioAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/app/(app)/encomiendas/nueva/imprimir-remito", () => ({
  abrirRemito: vi.fn(),
  imprimirRemitoAutomatico: vi.fn(),
}));

import {
  buscarSeguimientoAction,
  modificarEnvioAction,
  refrescarSeguimientoAction,
} from "@/server/actions";
import { toast } from "sonner";
import { abrirRemito } from "@/app/(app)/encomiendas/nueva/imprimir-remito";
import type { SeguimientoResponse } from "@/server/services/seguimiento";
import type { SectorApi } from "@/server/services/sectores";
import type { LocalidadBackend } from "@/types";
import { SeguimientoView } from "./seguimiento-view";
import { envioFixture, eventoFixture, seguimientoFixture } from "./seguimiento.fixtures";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PERMITIDA = { permitida: true, bloqueo: null };

// Intl separa "$" del monto con un espacio duro (U+00A0).
function texto(el: Element | null): string {
  return (el?.textContent ?? "").replace(/ /g, " ");
}

async function abrirSeguimiento(data: SeguimientoResponse) {
  vi.mocked(buscarSeguimientoAction).mockResolvedValue({ ok: true, data });
  render(
    <SeguimientoView
      permisos={[]}
      localidades={
        [
          { id: "loc-obera", nombre: "Oberá" },
          { id: "loc-posadas", nombre: "Posadas" },
        ] as LocalidadBackend[]
      }
      sectores={[{ id: "sec-centro", nombre: "Centro", localidadId: "loc-posadas" }] as SectorApi[]}
      choferes={[]}
      enviosRecientes={[envioFixture()]}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /#A17/ }));
  await screen.findByText("Historia");
}

function campo(id: string): HTMLInputElement {
  const el = document.querySelector(`#${id}`);
  if (!el) throw new Error(`No se encontró el campo #${id}`);
  return el as HTMLInputElement;
}

async function abrirPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Modificar datos" }));
  return screen.findByRole("dialog");
}

describe("Seguimiento — ficha del envío", () => {
  it("muestra el envío completo: remitente, domicilios, tipo, pago, importes y contenido", async () => {
    await abrirSeguimiento(seguimientoFixture());

    expect(screen.getByText("Ferreteria San Martin")).toBeInTheDocument();
    expect(screen.getByText("3755-420004")).toBeInTheDocument();
    expect(screen.getByText(/Sarmiento 850/)).toBeInTheDocument();
    expect(screen.getByText("Oberá")).toBeInTheDocument();
    expect(screen.getByText("Farmacia Centro SRL")).toBeInTheDocument();
    expect(screen.getByText(/Av\. Mitre 2180/)).toBeInTheDocument();
    expect(screen.getByText("Ref.: casa verde frente a la plaza")).toBeInTheDocument();
    expect(screen.getByText("Posadas · barrio Centro")).toBeInTheDocument();

    const dato = (label: string) => texto(screen.getByText(label).nextElementSibling);
    expect(dato("Tipo")).toBe("Paquetería");
    expect(dato("Pago")).toBe("Origen · Contado");
    expect(dato("Flete")).toBe("$ 10.000");
    expect(dato("Gasto")).toBe("$ 0");
    expect(dato("Valor declarado")).toBe("$ 50.000");
    expect(dato("Contenido / observaciones")).toBe("Repuestos");
    // Paquetería no lleva contra reembolso: ese renglón no aparece.
    expect(screen.queryByText("Contra reembolso")).toBeNull();
  });

  it("un envío sin guía diaria se identifica por su número, no por \"#null\"", async () => {
    await abrirSeguimiento(seguimientoFixture({ envio: { guiaDiaria: null } }));
    expect(screen.getByText("#000000032-1")).toBeInTheDocument();
    expect(screen.queryByText(/#null/)).toBeNull();
  });
});

describe("Seguimiento — si se puede modificar lo dice el backend (`edicion`)", () => {
  it("permitida: muestra el botón Modificar datos", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    expect(screen.getByRole("button", { name: "Modificar datos" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("con bloqueo: muestra su mensaje tal cual, en lugar del botón", async () => {
    const mensaje = "Ya entró en una planilla: sólo supervisión o administración pueden modificarlo.";
    await abrirSeguimiento(
      seguimientoFixture({
        edicion: { permitida: false, bloqueo: { codigo: "ENVIO_EN_PLANILLA", mensaje } },
      })
    );
    expect(screen.getByRole("note")).toHaveTextContent(mensaje);
    expect(screen.queryByRole("button", { name: "Modificar datos" })).toBeNull();
  });

  it("sin permiso y sin bloqueo (p. ej. chofer): no muestra nada", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: { permitida: false, bloqueo: null } }));
    expect(screen.queryByRole("button", { name: "Modificar datos" })).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("un backend que todavía no manda `edicion`: no muestra nada y la pantalla carga igual", async () => {
    await abrirSeguimiento(seguimientoFixture());
    expect(screen.getByText("Farmacia Centro SRL")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modificar datos" })).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("Seguimiento — panel Modificar datos", () => {
  it("abre con las tres secciones precargadas", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();

    for (const seccion of ["Remitente", "Destinatario", "Envío e importes"]) {
      expect(within(panel).getByRole("heading", { name: seccion })).toBeInTheDocument();
    }
    expect(campo("mod-remitente-nombre").value).toBe("Ferreteria San Martin");
    expect(campo("mod-remitente-calle").value).toBe("Sarmiento");
    expect(campo("mod-destinatario-telefono").value).toBe("3764-420014");
    expect(campo("mod-destinatario-referencia").value).toBe("casa verde frente a la plaza");
    expect(campo("mod-bultos").value).toBe("2");
    expect(campo("mod-flete").value).toBe("10000");
    expect(campo("mod-valor-declarado").value).toBe("50000");
    expect(campo("mod-remito-manual").value).toBe("000123");
    expect(campo("mod-observaciones").value).toBe("Repuestos");
    expect(campo("mod-motivo").value).toBe("");
    // Destino y cuenta de cliente: a la vista, sin campo para editarlos.
    expect(within(panel).getByText(/Destino: Posadas · barrio Centro/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/Cuenta de cliente: sin vincular/)).toHaveLength(2);
  });

  it("no deja guardar si no se cambió nada", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    expect(within(panel).getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    expect(within(panel).getByText("Todavía no cambiaste ningún dato.")).toBeInTheDocument();
  });

  it("exige el motivo: sin él no manda nada y marca el campo", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();

    fireEvent.change(campo("mod-destinatario-telefono"), { target: { value: "3764-999999" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    expect(modificarEnvioAction).not.toHaveBeenCalled();
    expect(within(panel).getByText(/Escribí el motivo del cambio/)).toBeInTheDocument();
    expect(campo("mod-motivo")).toHaveAttribute("aria-invalid", "true");
  });

  it("manda solo lo que cambió, con el motivo; después recarga y ofrece reimprimir el remito", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    vi.mocked(modificarEnvioAction).mockResolvedValue({ ok: true, envio: envioFixture() });
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({
        edicion: PERMITIDA,
        envio: { destinatarioTelefono: "3764-999999", fleteImporte: "8000.00" },
      }),
    });

    fireEvent.change(campo("mod-destinatario-telefono"), { target: { value: "3764-999999" } });
    fireEvent.change(campo("mod-flete"), { target: { value: "8000" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "  datos mal cargados  " } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(modificarEnvioAction).toHaveBeenCalledTimes(1);
    const [envioId, cambios, opciones] = vi.mocked(modificarEnvioAction).mock.calls[0];
    expect(envioId).toBe("envio-1");
    expect(cambios).toEqual({ destinatarioTelefono: "3764-999999", fleteImporte: 8000 });
    expect(opciones.motivo).toBe("datos mal cargados");
    expect(opciones.clientUuid).toBeTruthy();

    expect(toast.success).toHaveBeenCalledWith("Datos modificados");
    expect(refrescarSeguimientoAction).toHaveBeenCalledWith("000000032-1");
    expect(await screen.findByText("3764-999999")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reimprimir remito" }));
    expect(abrirRemito).toHaveBeenCalledWith("000000032-1");
  });

  it("reintenta con el mismo clientUuid", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    vi.mocked(modificarEnvioAction)
      .mockResolvedValueOnce({
        ok: false,
        code: "ERROR_DESCONOCIDO",
        title: "No se pudo guardar",
        message: "Ocurrió un error al comunicarse con el servidor.",
      })
      .mockResolvedValueOnce({ ok: true, envio: envioFixture() });
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({ edicion: PERMITIDA }),
    });

    fireEvent.change(campo("mod-bultos"), { target: { value: "3" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "eran tres bultos" } });
    const guardar = within(panel).getByRole("button", { name: "Guardar cambios" });

    fireEvent.click(guardar);
    expect(await within(panel).findByRole("alert")).toHaveTextContent("No se pudo guardar");

    fireEvent.click(guardar);
    await waitFor(() => expect(modificarEnvioAction).toHaveBeenCalledTimes(2));

    const [primero, segundo] = vi.mocked(modificarEnvioAction).mock.calls;
    expect(primero[2].clientUuid).toBeTruthy();
    expect(segundo[2].clientUuid).toBe(primero[2].clientUuid);
  });

  it("REGLA_DE_TIPO: muestra el detalle del backend y deja el panel abierto", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    const detalle = "valorDeclarado: no corresponde a un envío de tipo trámite.";
    vi.mocked(modificarEnvioAction).mockResolvedValue({
      ok: false,
      code: "REGLA_DE_TIPO",
      title: "Los datos no corresponden al tipo de envío",
      message: detalle,
    });

    fireEvent.change(campo("mod-bultos"), { target: { value: "3" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "eran tres bultos" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(panel).findByRole("alert")).toHaveTextContent(detalle);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refrescarSeguimientoAction).not.toHaveBeenCalled();
  });

  it("si el envío entró a una planilla con el panel abierto: cierra, avisa y recarga", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    const mensaje = "Ya entró en una planilla: sólo supervisión o administración pueden modificarlo.";
    vi.mocked(modificarEnvioAction).mockResolvedValue({
      ok: false,
      code: "ENVIO_EN_PLANILLA",
      title: "El envío ya está en una planilla",
      message: mensaje,
    });
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({
        edicion: { permitida: false, bloqueo: { codigo: "ENVIO_EN_PLANILLA", mensaje } },
      }),
    });

    fireEvent.change(campo("mod-bultos"), { target: { value: "3" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "eran tres bultos" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(toast.error).toHaveBeenCalledWith("El envío ya está en una planilla", {
      description: mensaje,
    });
    expect(refrescarSeguimientoAction).toHaveBeenCalledWith("000000032-1");
    expect(await screen.findByRole("note")).toHaveTextContent(mensaje);
    expect(screen.queryByRole("button", { name: "Modificar datos" })).toBeNull();
    // No se guardó nada: no hay remito para reimprimir.
    expect(screen.queryByRole("button", { name: "Reimprimir remito" })).toBeNull();
  });
});

// 2026-10-02: quien tiene el envío en custodia fuera de su origen puede
// modificarlo, salvo los importes. Lo dice el backend en `edicion.campos`.
describe("Seguimiento — panel Modificar datos con campos = sin_importes", () => {
  const SIN_IMPORTES = { permitida: true, bloqueo: null, campos: "sin_importes" as const };
  const AVISO = "Los importes los modifica el origen antes del corte, supervisión o administración.";
  const EDITORES_DE_IMPORTES = [
    "mod-tipo",
    "mod-lugar-pago",
    "mod-forma-pago",
    "mod-flete",
    "mod-crr",
    "mod-gasto",
    "mod-valor-declarado",
  ];

  it("muestra los siete importes con su valor, sin ningún control para editarlos, y la línea que lo explica", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: SIN_IMPORTES }));
    const panel = await abrirPanel();

    for (const id of EDITORES_DE_IMPORTES) {
      expect(document.querySelector(`#${id}`)).toBeNull();
    }

    const importes = within(panel).getByRole("group", { name: "Importes" });
    const dato = (label: string) =>
      texto(within(importes).getByText(label).nextElementSibling);
    expect(dato("Tipo")).toBe("Paquetería");
    expect(dato("Lugar de pago")).toBe("Origen");
    expect(dato("Forma de pago")).toBe("Contado");
    expect(dato("Flete")).toBe("$ 10.000");
    expect(dato("Contra reembolso")).toBe("—");
    expect(dato("Gasto a cobrar en la entrega")).toBe("$ 0");
    expect(dato("Valor declarado")).toBe("$ 50.000");
    expect(within(importes).getByText(AVISO)).toBeInTheDocument();
  });

  it("los otros quince campos se editan como siempre", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: SIN_IMPORTES }));
    await abrirPanel();

    for (const id of [
      "mod-remitente-nombre",
      "mod-remitente-telefono",
      "mod-remitente-calle",
      "mod-remitente-numero",
      "mod-remitente-piso",
      "mod-remitente-referencia",
      "mod-destinatario-nombre",
      "mod-destinatario-telefono",
      "mod-destinatario-calle",
      "mod-destinatario-numero",
      "mod-destinatario-piso",
      "mod-destinatario-referencia",
      "mod-bultos",
      "mod-remito-manual",
      "mod-observaciones",
    ]) {
      expect(campo(id)).not.toBeDisabled();
    }
    expect(campo("mod-destinatario-telefono").value).toBe("3764-420014");
    expect(campo("mod-bultos").value).toBe("2");
  });

  it("al guardar no viaja ningún importe", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: SIN_IMPORTES }));
    const panel = await abrirPanel();
    vi.mocked(modificarEnvioAction).mockResolvedValue({ ok: true, envio: envioFixture() });
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({ edicion: SIN_IMPORTES }),
    });

    fireEvent.change(campo("mod-destinatario-telefono"), { target: { value: "3764-999999" } });
    fireEvent.change(campo("mod-bultos"), { target: { value: "3" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "teléfono mal cargado" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(modificarEnvioAction).toHaveBeenCalledTimes(1));
    const [, cambios] = vi.mocked(modificarEnvioAction).mock.calls[0];
    expect(cambios).toEqual({ destinatarioTelefono: "3764-999999", cantidadBultos: 3 });
  });

  it("funciona también sobre un envío cuyos importes no pasarían la validación del alta", async () => {
    // Contra reembolso sin importe cargado: no es asunto de quien solo
    // corrige un dato de contacto.
    await abrirSeguimiento(
      seguimientoFixture({
        edicion: SIN_IMPORTES,
        envio: { tipo: "efectivo", contrarreembolsoImporte: null, valorDeclarado: null },
      })
    );
    const panel = await abrirPanel();
    vi.mocked(modificarEnvioAction).mockResolvedValue({ ok: true, envio: envioFixture() });
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({ edicion: SIN_IMPORTES }),
    });

    fireEvent.change(campo("mod-destinatario-telefono"), { target: { value: "3764-999999" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "teléfono mal cargado" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(modificarEnvioAction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(modificarEnvioAction).mock.calls[0][1]).toEqual({
      destinatarioTelefono: "3764-999999",
    });
  });
});

describe("Seguimiento — panel Modificar datos con campos = todos, o sin el campo", () => {
  it.each([
    ["todos", { permitida: true, bloqueo: null, campos: "todos" as const }],
    ["sin el campo (backend anterior)", { permitida: true, bloqueo: null }],
  ])("%s: el panel deja editar los importes, como siempre", async (_nombre, edicion) => {
    await abrirSeguimiento(seguimientoFixture({ edicion }));
    const panel = await abrirPanel();

    // Paquetería: flete, gasto y valor declarado editables; el contra
    // reembolso no corresponde al tipo.
    expect(campo("mod-flete").value).toBe("10000");
    expect(campo("mod-gasto").value).toBe("0");
    expect(campo("mod-valor-declarado").value).toBe("50000");
    for (const id of ["mod-tipo", "mod-lugar-pago", "mod-forma-pago"]) {
      expect(document.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(within(panel).queryByRole("group", { name: "Importes" })).toBeNull();
    expect(within(panel).queryByText(/Los importes los modifica el origen/)).toBeNull();
  });

  it("CAMPO_NO_PERMITIDO (403): cierra, avisa con el detalle y recarga; al reabrir, los importes ya no se editan", async () => {
    await abrirSeguimiento(seguimientoFixture({ edicion: PERMITIDA }));
    const panel = await abrirPanel();
    const detalle =
      "No podés modificar flete: los importes los modifica el origen antes del corte, supervisión o administración.";
    vi.mocked(modificarEnvioAction).mockResolvedValue({
      ok: false,
      code: "CAMPO_NO_PERMITIDO",
      title: "Campo no permitido",
      message: detalle,
    });
    // El envío salió de su origen con el panel abierto: el seguimiento
    // recargado ya dice que este usuario no puede tocar los importes.
    vi.mocked(refrescarSeguimientoAction).mockResolvedValue({
      ok: true,
      data: seguimientoFixture({
        edicion: { permitida: true, bloqueo: null, campos: "sin_importes" },
        envio: { observaciones: "Ficha recargada" },
      }),
    });

    fireEvent.change(campo("mod-flete"), { target: { value: "8000" } });
    fireEvent.change(campo("mod-motivo"), { target: { value: "flete mal cargado" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(toast.error).toHaveBeenCalledWith("Campo no permitido", { description: detalle });
    expect(refrescarSeguimientoAction).toHaveBeenCalledWith("000000032-1");
    // No se guardó nada: no hay remito para reimprimir.
    expect(screen.queryByRole("button", { name: "Reimprimir remito" })).toBeNull();

    await screen.findByText("Ficha recargada");
    const reabierto = await abrirPanel();
    expect(document.querySelector("#mod-flete")).toBeNull();
    expect(within(reabierto).getByRole("group", { name: "Importes" })).toBeInTheDocument();
  });
});

describe("Seguimiento — historia de una modificación", () => {
  it("pinta la frase como llega y, en el detalle, etiquetas legibles, importes y el motivo", async () => {
    const frase =
      "Corregido por Ana: flete $ 10.000 → $ 8.000, bultos 2 → 3. Motivo: error de tipeo";
    await abrirSeguimiento(
      seguimientoFixture({
        eventos: [
          eventoFixture(),
          eventoFixture({
            id: "evento-modificacion",
            tipo: "modificacion",
            frase,
            detalle: {
              motivo: "error de tipeo",
              cambios: {
                flete_importe: { antes: "10000.00", despues: "8000.50" },
                cantidad_bultos: { antes: 2, despues: 3 },
                tipo: { antes: "paqueteria", despues: "tramite" },
                destinatario_referencia: { antes: null, despues: "portón negro" },
                valor_declarado: { antes: "50000.00", despues: null },
              },
            },
          }),
        ],
      })
    );

    const fila = screen.getByText(frase).closest("button") as HTMLElement;
    fireEvent.click(fila);

    const lineas = Array.from(fila.querySelectorAll("p")).map(texto);
    expect(lineas).toContain("Flete: $ 10.000 → $ 8.000,50");
    expect(lineas).toContain("Bultos: 2 → 3");
    expect(lineas).toContain("Tipo: Paquetería → Trámite");
    expect(lineas).toContain("Referencia del destinatario: (vacío) → portón negro");
    expect(lineas).toContain("Valor declarado: $ 50.000 → (vacío)");
    expect(lineas).toContain("Motivo: error de tipeo");
    // Primero qué cambió, después por qué.
    expect(lineas.indexOf("Motivo: error de tipeo")).toBeGreaterThan(
      lineas.indexOf("Valor declarado: $ 50.000 → (vacío)")
    );
  });
});
