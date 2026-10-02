import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Tests de la pantalla Recepción montada entera. Se mockea el borde: la
// Server Action (una llamada por lectura), los sonidos, los toasts y la
// cámara.
vi.mock("@/server/actions", () => ({
  procesarLecturaAction: vi.fn(),
}));

vi.mock("@/lib/sonidos", () => ({
  sonar: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/components/shared/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

import { procesarLecturaAction } from "@/server/actions";
import { sonar } from "@/lib/sonidos";
import { toast } from "sonner";
import type { ResultadoDeRecepcion } from "@/server/actions/recepcion";
import type { AsignacionApi } from "@/server/services/custodia";
import { RecepcionView } from "./recepcion-view";

const OPERADOR = ["custodia:registrar", "custodia:asignar"];
const CHOFER = ["custodia:registrar"];
const SUPERVISOR = ["custodia:asignar"];

const SECTORES = [
  { localidad: "Oberá", sectores: [{ id: "sec-obe", nombre: "Centro Oberá" }] },
  {
    localidad: "Posadas",
    sectores: [
      { id: "sec-centro", nombre: "Centro" },
      { id: "sec-villa", nombre: "Villa Cabello" },
    ],
  },
];
const RECORRIDOS = [{ id: "rec-moto", nombre: "Posadas Moto", baseNombre: "Depósito 28" }];

beforeEach(() => {
  window.localStorage.clear();
  // requestAnimationFrame (el refoco del campo) corre enseguida.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

function ok(
  numero: string,
  extra: { recepcion?: "recibido" | "ya_en_custodia"; asignacion?: AsignacionApi | null } = {}
): ResultadoDeRecepcion {
  return {
    ok: true,
    data: {
      envio: {
        id: `envio-${numero}`,
        numero,
        ubicacion: "en_deposito",
        destinatarioNombre: `Destinatario ${numero}`,
        cantidadBultos: 2,
        localidadDestinoNombre: "Posadas",
        sector: { id: "sec-villa", nombre: "Villa Cabello" },
        recorrido: null,
      },
      recepcion: "recepcion" in extra ? extra.recepcion : "recibido",
      asignacion: extra.asignacion ?? null,
    },
  };
}

function renderRecepcion(permisos = OPERADOR, usuarioId = "u-ana") {
  return render(
    <RecepcionView
      permisos={permisos}
      usuarioId={usuarioId}
      sectores={SECTORES}
      recorridos={RECORRIDOS}
    />
  );
}

const campo = () =>
  screen.getByLabelText("Número, remito o código de barras del envío") as HTMLInputElement;

// Un lector de mano: escribe el código y manda Enter.
function escanear(texto: string) {
  fireEvent.change(campo(), { target: { value: texto } });
  fireEvent.keyDown(campo(), { key: "Enter" });
}

const modo = (nombre: string) => screen.getByRole("button", { name: nombre });
const leyenda = () => document.querySelector("[data-modo-listo]") as HTMLElement;
const ultimo = () => document.querySelector("[role=status][data-tono]") as HTMLElement;
const filas = () => within(screen.getByRole("list", { name: "Historial de la tanda" })).getAllByRole("listitem");
const llamadas = () => vi.mocked(procesarLecturaAction).mock.calls.map(([p]) => p);

function elegirSector(id: string) {
  fireEvent.click(modo("Cambiar sector"));
  fireEvent.change(screen.getByLabelText(/Sector al que pasan/), { target: { value: id } });
}

function elegirRecorrido(id: string) {
  fireEvent.click(modo("Reservar recorrido"));
  fireEvent.change(screen.getByLabelText(/Recorrido con el que salen/), { target: { value: id } });
}

describe("Recepción — qué modos ve cada usuario", () => {
  const nombres = () =>
    within(screen.getByRole("group", { name: "Modo de la tanda" }))
      .getAllByRole("button")
      .map((b) => b.textContent);

  it("operador: los tres, y arranca en Sólo recibir", () => {
    renderRecepcion(OPERADOR);
    expect(nombres()).toEqual(["Sólo recibir", "Cambiar sector", "Reservar recorrido"]);
    expect(modo("Sólo recibir")).toHaveAttribute("aria-pressed", "true");
    expect(leyenda()).toHaveTextContent("Recibiendo");
  });

  it("chofer (sin custodia:asignar): solo Sólo recibir", () => {
    renderRecepcion(CHOFER);
    expect(nombres()).toEqual(["Sólo recibir"]);
  });

  it("supervisor (sin custodia:registrar): los dos de cambio, y el botón dice Aplicar", () => {
    renderRecepcion(SUPERVISOR);
    expect(nombres()).toEqual(["Cambiar sector", "Reservar recorrido"]);
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(leyenda()).toHaveTextContent("Elegí el sector para empezar");
  });

  it("sin ninguno de los dos permisos: lo dice y no ofrece el campo", () => {
    renderRecepcion(["envios:leer"]);
    expect(screen.getByText(/no tiene permiso para recibir envíos ni para asignarles/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Número, remito/)).toBeNull();
  });
});

describe("Recepción — los tres modos: una llamada por lectura", () => {
  it("Sólo recibir: manda el número tal como se leyó, sin asignación ni búsqueda previa", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    renderRecepcion();

    escanear("0000000093");

    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));
    expect(procesarLecturaAction).toHaveBeenCalledTimes(1);
    const [pedido] = llamadas();
    expect(pedido).toMatchObject({
      envioNumero: "0000000093",
      asignacion: undefined,
      soloAsignar: false,
    });
    expect(pedido.clientUuid).toBeTruthy();
    expect(new Date(pedido.occurredAt).toString()).not.toBe("Invalid Date");
    // El campo queda vacío y con el foco, listo para la lectura siguiente.
    expect(campo().value).toBe("");
    expect(campo()).toHaveFocus();
  });

  it("Cambiar sector: manda el sector elegido, y la leyenda lo dice en grande", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(
      ok("000000009-3", {
        asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-villa", nombre: "Villa Cabello" } },
      })
    );
    renderRecepcion();
    elegirSector("sec-centro");
    expect(leyenda()).toHaveTextContent("Recibiendo → sector Centro");

    escanear("000000009-3");

    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido · sector Centro"));
    expect(llamadas()[0]).toMatchObject({ asignacion: { sectorId: "sec-centro" }, soloAsignar: false });
  });

  it("Reservar recorrido: manda el recorrido elegido", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(
      ok("000000009-3", { asignacion: { tipo: "recorrido", aplicada: true, anterior: null } })
    );
    renderRecepcion();
    elegirRecorrido("rec-moto");
    expect(leyenda()).toHaveTextContent("Recibiendo → reservado para Posadas Moto");

    escanear("000000009-3");

    await waitFor(() =>
      expect(ultimo()).toHaveTextContent("Recibido · reservado para Posadas Moto")
    );
    expect(llamadas()[0]).toMatchObject({ asignacion: { recorridoId: "rec-moto" } });
  });

  it("quien no recibe (supervisor) manda la asignación sola", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(
      ok("000000009-3", {
        recepcion: undefined,
        asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-villa", nombre: "Villa Cabello" } },
      })
    );
    renderRecepcion(SUPERVISOR);
    fireEvent.change(screen.getByLabelText(/Sector al que pasan/), { target: { value: "sec-centro" } });
    expect(leyenda()).toHaveTextContent("Cambiando el sector a Centro");

    escanear("000000009-3");

    await waitFor(() => expect(ultimo()).toHaveTextContent("Sector cambiado a Centro"));
    expect(llamadas()[0]).toMatchObject({ asignacion: { sectorId: "sec-centro" }, soloAsignar: true });
  });

  it("el selector de sector agrupa por localidad", () => {
    renderRecepcion();
    fireEvent.click(modo("Cambiar sector"));
    const grupos = Array.from(
      (screen.getByLabelText(/Sector al que pasan/) as HTMLSelectElement).querySelectorAll("optgroup")
    ).map((g) => [g.label, Array.from(g.querySelectorAll("option")).map((o) => o.textContent)]);
    expect(grupos).toEqual([
      ["Oberá", ["Centro Oberá"]],
      ["Posadas", ["Centro", "Villa Cabello"]],
    ]);
  });
});

describe("Recepción — un modo con valor no escanea sin el valor", () => {
  it("no manda nada, suena error y dice qué falta; elegido el valor, escanea", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    renderRecepcion();
    fireEvent.click(modo("Cambiar sector"));
    expect(leyenda()).toHaveAttribute("data-modo-listo", "no");

    escanear("000000009-3");

    expect(procesarLecturaAction).not.toHaveBeenCalled();
    expect(sonar).toHaveBeenCalledWith("error");
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí primero el sector");
    expect(screen.queryByRole("list", { name: "Historial de la tanda" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/Sector al que pasan/), { target: { value: "sec-centro" } });
    expect(screen.queryByRole("alert")).toBeNull();
    escanear("000000009-3");
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(1));
  });

  it("cambiar de modo no hereda el valor del anterior", () => {
    renderRecepcion();
    elegirSector("sec-centro");
    fireEvent.click(modo("Reservar recorrido"));
    expect(leyenda()).toHaveTextContent("Elegí el recorrido para empezar");
    fireEvent.click(modo("Cambiar sector"));
    expect(leyenda()).toHaveTextContent("Elegí el sector para empezar");
  });
});

// Review Focus 5 del plan: lector rápido.
describe("Recepción — la cola de lecturas", () => {
  it("dos lecturas seguidas, con la primera todavía esperando al backend: se procesan las dos, en orden", async () => {
    const resolver: ((r: ResultadoDeRecepcion) => void)[] = [];
    vi.mocked(procesarLecturaAction).mockImplementation(
      () => new Promise((res) => resolver.push(res))
    );
    renderRecepcion();

    escanear("000000001-1");
    escanear("000000002-2");
    escanear("000000003-3");

    // Las tres quedaron tomadas; al backend solo fue la primera.
    expect(filas()).toHaveLength(3);
    expect(procesarLecturaAction).toHaveBeenCalledTimes(1);
    expect(llamadas()[0].envioNumero).toBe("000000001-1");
    expect(screen.getByText("3 lecturas en cola")).toBeInTheDocument();
    // El campo nunca se bloqueó ni perdió el foco.
    expect(campo()).not.toBeDisabled();
    expect(campo()).toHaveFocus();

    await act(async () => resolver[0](ok("000000001-1")));
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(2));
    expect(llamadas()[1].envioNumero).toBe("000000002-2");

    await act(async () => resolver[1](ok("000000002-2")));
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(3));
    await act(async () => resolver[2](ok("000000003-3")));

    await waitFor(() => expect(screen.getByText("Sin lecturas en cola")).toBeInTheDocument());
    expect(llamadas().map((p) => p.envioNumero)).toEqual([
      "000000001-1",
      "000000002-2",
      "000000003-3",
    ]);
    // Cada lectura con su propio clientUuid.
    expect(new Set(llamadas().map((p) => p.clientUuid)).size).toBe(3);
    // El historial, la más nueva arriba; el bloque grande, la última.
    expect(filas().map((f) => f.textContent)).toEqual([
      expect.stringContaining("Destinatario 000000003-3"),
      expect.stringContaining("Destinatario 000000002-2"),
      expect.stringContaining("Destinatario 000000001-1"),
    ]);
    expect(ultimo()).toHaveTextContent("Destinatario 000000003-3");
  });

  it("cada lectura conserva el modo con el que se escaneó, aunque se cambie con la cola pendiente", async () => {
    const resolver: ((r: ResultadoDeRecepcion) => void)[] = [];
    vi.mocked(procesarLecturaAction).mockImplementation(
      () => new Promise((res) => resolver.push(res))
    );
    renderRecepcion();
    elegirSector("sec-centro");

    escanear("000000001-1");
    escanear("000000002-2");
    fireEvent.click(modo("Sólo recibir"));
    escanear("000000003-3");

    await act(async () => resolver[0](ok("000000001-1")));
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(2));
    await act(async () => resolver[1](ok("000000002-2")));
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(3));
    await act(async () => resolver[2](ok("000000003-3")));

    expect(llamadas().map((p) => p.asignacion)).toEqual([
      { sectorId: "sec-centro" },
      { sectorId: "sec-centro" },
      undefined,
    ]);
  });

  it("sin respuesta del servidor: error con Reintentar, y el reintento manda el mismo clientUuid", async () => {
    vi.mocked(procesarLecturaAction)
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(ok("000000009-3"));
    renderRecepcion();

    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).toHaveTextContent("Sin respuesta"));
    expect(ultimo()).toHaveAttribute("data-tono", "error");

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));

    const [primero, segundo] = llamadas();
    expect(segundo).toEqual(primero);
    expect(filas()).toHaveLength(1);
  });
});

describe("Recepción — cada resultado con su color y su sonido", () => {
  async function resultadoDe(respuesta: ResultadoDeRecepcion | Error, preparar?: () => void) {
    if (respuesta instanceof Error) vi.mocked(procesarLecturaAction).mockRejectedValue(respuesta);
    else vi.mocked(procesarLecturaAction).mockResolvedValue(respuesta);
    renderRecepcion();
    preparar?.();
    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).not.toBeNull());
    return { tono: ultimo().getAttribute("data-tono"), fila: filas()[0].getAttribute("data-tono") };
  }

  it("recibido: correcto", async () => {
    expect(await resultadoDe(ok("000000009-3"))).toEqual({ tono: "correcto", fila: "correcto" });
    expect(sonar).toHaveBeenCalledTimes(1);
    expect(sonar).toHaveBeenCalledWith("correcto");
    // El bloque grande muestra el envío entero.
    expect(ultimo()).toHaveTextContent("#9-3");
    expect(ultimo()).toHaveTextContent("Destinatario 000000009-3");
    expect(ultimo()).toHaveTextContent("Posadas");
    expect(ultimo()).toHaveTextContent("Villa Cabello");
    expect(ultimo()).toHaveTextContent("2 bultos");
  });

  it("ya lo tenías: aviso", async () => {
    expect(await resultadoDe(ok("000000009-3", { recepcion: "ya_en_custodia" }))).toEqual({
      tono: "aviso",
      fila: "aviso",
    });
    expect(sonar).toHaveBeenCalledWith("aviso");
    expect(ultimo()).toHaveTextContent("Ya lo tenías");
  });

  it("recibido pero el cambio no se aplicó: aviso, con el motivo del backend", async () => {
    const r = await resultadoDe(
      ok("000000009-3", {
        asignacion: {
          tipo: "sector",
          aplicada: false,
          anterior: null,
          codigo: "SECTOR_DE_OTRA_LOCALIDAD",
          mensaje: "El sector Centro Oberá no es de Posadas.",
        },
      }),
      () => elegirSector("sec-obe")
    );
    expect(r.tono).toBe("aviso");
    expect(sonar).toHaveBeenCalledWith("aviso");
    expect(ultimo()).toHaveTextContent("Recibido, sin cambiar el sector");
    expect(ultimo()).toHaveTextContent("El sector Centro Oberá no es de Posadas.");
  });

  it("no encontrado: error", async () => {
    const r = await resultadoDe({
      ok: false,
      status: 404,
      code: "ENVIO_NO_ENCONTRADO",
      title: "Envío no encontrado",
      message: "No existe.",
    });
    expect(r).toEqual({ tono: "error", fila: "error" });
    expect(sonar).toHaveBeenCalledWith("error");
    expect(ultimo()).toHaveTextContent("No encontrado");
    // Sin envío que mostrar, queda a la vista lo que se leyó.
    expect(ultimo()).toHaveTextContent("000000009-3");
  });

  it("rechazado por el backend: error, con su título y su detalle", async () => {
    await resultadoDe({
      ok: false,
      status: 409,
      code: "TRANSICION_INVALIDA",
      title: "El envío ya está entregado",
      message: "Un envío entregado no se recibe.",
    });
    expect(ultimo()).toHaveAttribute("data-tono", "error");
    expect(ultimo()).toHaveTextContent("El envío ya está entregado");
    expect(ultimo()).toHaveTextContent("Un envío entregado no se recibe.");
  });

  it("con el sonido apagado no suena nada, y el resultado se ve igual", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    renderRecepcion();
    fireEvent.click(screen.getByRole("button", { name: "Sonido encendido" }));
    expect(screen.getByRole("button", { name: "Sonido apagado" })).toHaveAttribute("aria-pressed", "true");

    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));
    expect(sonar).not.toHaveBeenCalled();
  });
});

describe("Recepción — resumen, deshacer y la tanda guardada", () => {
  it("el resumen cuenta la tanda", async () => {
    vi.mocked(procesarLecturaAction)
      .mockResolvedValueOnce(ok("000000001-1"))
      .mockResolvedValueOnce(ok("000000002-2", { recepcion: "ya_en_custodia" }))
      .mockResolvedValueOnce({ ok: false, status: 404, code: "ENVIO_NO_ENCONTRADO", title: "x", message: "x" });
    renderRecepcion();
    escanear("000000001-1");
    escanear("000000002-2");
    escanear("no-existe");
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByText("Sin lecturas en cola")).toBeInTheDocument());

    const resumen = screen.getByLabelText("Resumen de la tanda");
    const dato = (label: string) => within(resumen).getByText(label).nextElementSibling?.textContent;
    expect(dato("Recibidos")).toBe("1");
    expect(dato("Ya los tenías")).toBe("1");
    expect(dato("Con aviso")).toBe("1");
    expect(dato("Con error")).toBe("1");
  });

  it("Deshacer vuelve al sector anterior con la asignación sola, y marca la fila", async () => {
    vi.mocked(procesarLecturaAction)
      .mockResolvedValueOnce(
        ok("000000009-3", {
          asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-villa", nombre: "Villa Cabello" } },
        })
      )
      .mockResolvedValueOnce(
        ok("000000009-3", {
          recepcion: undefined,
          asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-centro", nombre: "Centro" } },
        })
      );
    renderRecepcion();
    elegirSector("sec-centro");
    escanear("000000009-3");
    const deshacer = await screen.findByRole("button", { name: /Deshacer/ });

    fireEvent.click(deshacer);

    await waitFor(() => expect(screen.getByText(/Asignación deshecha: volvió a Villa Cabello/)).toBeInTheDocument());
    const [original, vuelta] = llamadas();
    expect(vuelta).toMatchObject({
      envioNumero: "000000009-3",
      asignacion: { sectorId: "sec-villa" },
      // No recibe: si el paquete cambió de manos, no lo vuelve a tomar.
      soloAsignar: true,
    });
    expect(vuelta.clientUuid).not.toBe(original.clientUuid);
    // Una vez deshecha, no se ofrece de nuevo.
    expect(screen.queryByRole("button", { name: /Deshacer/ })).toBeNull();
  });

  it("Deshacer una reserva que no tenía anterior la quita (recorridoId null)", async () => {
    vi.mocked(procesarLecturaAction)
      .mockResolvedValueOnce(ok("000000009-3", { asignacion: { tipo: "recorrido", aplicada: true, anterior: null } }))
      .mockResolvedValueOnce(ok("000000009-3", { recepcion: undefined, asignacion: { tipo: "recorrido", aplicada: true, anterior: null } }));
    renderRecepcion();
    elegirRecorrido("rec-moto");
    escanear("000000009-3");

    fireEvent.click(await screen.findByRole("button", { name: /Deshacer/ }));

    await waitFor(() => expect(screen.getByText(/Asignación deshecha: quedó sin reserva/)).toBeInTheDocument());
    expect(llamadas()[1]).toMatchObject({ asignacion: { recorridoId: null }, soloAsignar: true });
  });

  it("si Deshacer es rechazado, avisa con el motivo y la fila queda como estaba", async () => {
    vi.mocked(procesarLecturaAction)
      .mockResolvedValueOnce(
        ok("000000009-3", {
          asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-villa", nombre: "Villa Cabello" } },
        })
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        code: "ENVIO_EN_PLANILLA",
        title: "El envío está en una planilla",
        message: "Ya entró en una planilla: no se le cambia el sector.",
      });
    renderRecepcion();
    elegirSector("sec-centro");
    escanear("000000009-3");

    fireEvent.click(await screen.findByRole("button", { name: /Deshacer/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No se pudo deshacer", {
        description: "Ya entró en una planilla: no se le cambia el sector.",
      })
    );
    expect(screen.queryByText(/Asignación deshecha/)).toBeNull();
    expect(screen.getByRole("button", { name: /Deshacer/ })).toBeInTheDocument();
  });

  it("no ofrece Deshacer en una recepción sola ni si el envío ya tenía ese sector", async () => {
    vi.mocked(procesarLecturaAction)
      .mockResolvedValueOnce(ok("000000001-1"))
      .mockResolvedValueOnce(
        ok("000000002-2", {
          asignacion: { tipo: "sector", aplicada: true, anterior: { id: "sec-centro", nombre: "Centro" } },
        })
      );
    renderRecepcion();
    escanear("000000001-1");
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(1));
    elegirSector("sec-centro");
    escanear("000000002-2");
    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Sin lecturas en cola")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /Deshacer/ })).toBeNull();
  });

  it("la tanda sobrevive a una recarga: modo, historial y resumen", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    const primera = renderRecepcion();
    elegirSector("sec-centro");
    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));
    primera.unmount();

    renderRecepcion();

    expect(leyenda()).toHaveTextContent("Recibiendo → sector Centro");
    expect(filas()).toHaveLength(1);
    expect(ultimo()).toHaveTextContent("Destinatario 000000009-3");
    // No volvió a mandar nada: esa lectura ya estaba resuelta.
    expect(procesarLecturaAction).toHaveBeenCalledTimes(1);
  });

  it("lo que quedó en cola al recargar se manda al volver, con el mismo clientUuid", async () => {
    vi.mocked(procesarLecturaAction).mockImplementation(() => new Promise(() => {}));
    const primera = renderRecepcion();
    escanear("000000001-1");
    escanear("000000002-2");
    expect(procesarLecturaAction).toHaveBeenCalledTimes(1);
    const uuidDeLaPrimera = llamadas()[0].clientUuid;
    primera.unmount();

    vi.mocked(procesarLecturaAction).mockReset();
    vi.mocked(procesarLecturaAction).mockImplementation(async (p) => ok(p.envioNumero));
    renderRecepcion();

    await waitFor(() => expect(procesarLecturaAction).toHaveBeenCalledTimes(2));
    expect(llamadas().map((p) => p.envioNumero)).toEqual(["000000001-1", "000000002-2"]);
    expect(llamadas()[0].clientUuid).toBe(uuidDeLaPrimera);
  });

  it("la tanda es de cada usuario", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    const ana = renderRecepcion(OPERADOR, "u-ana");
    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));
    ana.unmount();

    renderRecepcion(OPERADOR, "u-luis");
    expect(screen.queryByRole("list", { name: "Historial de la tanda" })).toBeNull();
  });

  it("Nueva tanda vacía el historial y vuelve al modo inicial", async () => {
    vi.mocked(procesarLecturaAction).mockResolvedValue(ok("000000009-3"));
    renderRecepcion();
    elegirSector("sec-centro");
    escanear("000000009-3");
    await waitFor(() => expect(ultimo()).toHaveTextContent("Recibido"));

    fireEvent.click(screen.getByRole("button", { name: "Nueva tanda" }));

    expect(screen.queryByRole("list", { name: "Historial de la tanda" })).toBeNull();
    expect(leyenda()).toHaveTextContent("Recibiendo");
    expect(modo("Sólo recibir")).toHaveAttribute("aria-pressed", "true");
    expect(campo()).toHaveFocus();
  });
});
