import { describe, expect, it } from "vitest";
import type { RespuestaDeRecepcion } from "@/server/services/custodia";
import type { RecorridoBackend } from "@/types";
import {
  asignacionParaDeshacer,
  conDeshecha,
  conLectura,
  conResultado,
  enCola,
  esRebote,
  leerTanda,
  leyendaDelModo,
  modoInicial,
  modoListo,
  modosDisponibles,
  nuevaLectura,
  otraVezEnCola,
  pedidoDeLectura,
  resultadoDeRespuesta,
  resultadoSinRespuesta,
  resumenDeTanda,
  sePuedeDeshacer,
  serializarTanda,
  tandaVacia,
  type Lectura,
  type Modo,
  type Tanda,
} from "./recepcion-tanda";
import { recorridosOfrecidos, sectoresPorLocalidad } from "./recepcion-catalogos";

const OPERADOR = ["custodia:registrar", "custodia:asignar"];
const CHOFER = ["custodia:registrar"];
const SUPERVISOR = ["custodia:asignar"];

const RECIBIR: Modo = { tipo: "recibir", valor: null };
const SECTOR: Modo = { tipo: "sector", valor: { id: "sec-centro", nombre: "Centro" } };
const RECORRIDO: Modo = { tipo: "recorrido", valor: { id: "rec-moto", nombre: "Posadas Moto" } };

const AHORA = new Date("2026-10-02T15:00:00.000Z");

function lectura(modo: Modo, id = "uuid-1", soloAsignar = false): Lectura {
  return nuevaLectura("0000000093", modo, soloAsignar, id, AHORA);
}

function respuesta(overrides: Partial<RespuestaDeRecepcion> = {}) {
  return {
    ok: true as const,
    data: {
      envio: {
        id: "envio-1",
        numero: "000000009-3",
        ubicacion: "en_deposito",
        destinatarioNombre: "Farmacia Centro SRL",
        cantidadBultos: 2,
        localidadDestinoNombre: "Posadas",
        sector: { id: "sec-centro", nombre: "Centro" },
        recorrido: null,
      },
      recepcion: "recibido" as const,
      asignacion: null,
      ...overrides,
    },
  };
}

describe("modos según los permisos", () => {
  it("operador (recibe y asigna): los tres", () => {
    expect(modosDisponibles(OPERADOR)).toEqual(["recibir", "sector", "recorrido"]);
    expect(modoInicial(OPERADOR)).toEqual(RECIBIR);
  });

  it("chofer (solo recibe): solo Sólo recibir", () => {
    expect(modosDisponibles(CHOFER)).toEqual(["recibir"]);
  });

  it("supervisor (solo asigna): los dos de cambio, y arranca sin valor", () => {
    expect(modosDisponibles(SUPERVISOR)).toEqual(["sector", "recorrido"]);
    expect(modoInicial(SUPERVISOR)).toEqual({ tipo: "sector", valor: null });
  });

  it("sin ninguno de los dos: ningún modo", () => {
    expect(modosDisponibles(["envios:leer"])).toEqual([]);
    expect(modoInicial(["envios:leer"])).toBeNull();
  });

  it("un modo con valor no está listo hasta que se elige", () => {
    expect(modoListo(RECIBIR)).toBe(true);
    expect(modoListo({ tipo: "sector", valor: null })).toBe(false);
    expect(modoListo(SECTOR)).toBe(true);
    expect(modoListo({ tipo: "recorrido", valor: null })).toBe(false);
  });

  it("la leyenda dice en palabras qué hace cada lectura", () => {
    expect(leyendaDelModo(RECIBIR, true)).toBe("Recibiendo");
    expect(leyendaDelModo(SECTOR, true)).toBe("Recibiendo → sector Centro");
    expect(leyendaDelModo(RECORRIDO, true)).toBe("Recibiendo → reservado para Posadas Moto");
    expect(leyendaDelModo({ tipo: "sector", valor: null }, true)).toBe(
      "Elegí el sector para empezar"
    );
    // Quien no recibe, no "recibe →".
    expect(leyendaDelModo(SECTOR, false)).toBe("Cambiando el sector a Centro");
    expect(leyendaDelModo(RECORRIDO, false)).toBe("Reservando para Posadas Moto");
  });
});

describe("qué manda cada lectura", () => {
  it("Sólo recibir: el número, el uuid y la hora del escaneo; sin asignación", () => {
    expect(pedidoDeLectura(lectura(RECIBIR))).toEqual({
      envioNumero: "0000000093",
      clientUuid: "uuid-1",
      occurredAt: "2026-10-02T15:00:00.000Z",
      asignacion: undefined,
      soloAsignar: false,
    });
  });

  it("Cambiar sector manda sectorId; Reservar recorrido, recorridoId", () => {
    expect(pedidoDeLectura(lectura(SECTOR)).asignacion).toEqual({ sectorId: "sec-centro" });
    expect(pedidoDeLectura(lectura(RECORRIDO)).asignacion).toEqual({ recorridoId: "rec-moto" });
  });

  it("quien no recibe manda la asignación sola", () => {
    expect(pedidoDeLectura(lectura(SECTOR, "uuid-1", true)).soloAsignar).toBe(true);
  });
});

describe("cómo se clasifica cada resultado", () => {
  it("recibido sin asignación: correcto", () => {
    expect(resultadoDeRespuesta(lectura(RECIBIR), respuesta())).toMatchObject({
      tono: "correcto",
      titulo: "Recibido",
    });
  });

  it("ya lo tenías, en Sólo recibir: aviso", () => {
    const r = resultadoDeRespuesta(lectura(RECIBIR), respuesta({ recepcion: "ya_en_custodia" }));
    expect(r).toMatchObject({ tono: "aviso", titulo: "Ya lo tenías" });
  });

  it("recibido y con el cambio aplicado: correcto, y dice qué se hizo", () => {
    const sector = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({ asignacion: { tipo: "sector", aplicada: true, anterior: { id: "s0", nombre: "Sur" } } })
    );
    expect(sector).toMatchObject({ tono: "correcto", titulo: "Recibido · sector Centro" });

    const recorrido = resultadoDeRespuesta(
      lectura(RECORRIDO),
      respuesta({ asignacion: { tipo: "recorrido", aplicada: true, anterior: null } })
    );
    expect(recorrido).toMatchObject({
      tono: "correcto",
      titulo: "Recibido · reservado para Posadas Moto",
    });
  });

  it("un cambio de sector que de paso borró una reserva de recorrido: aviso, y lo dice", () => {
    const r = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({
        asignacion: {
          tipo: "sector",
          aplicada: true,
          anterior: { id: "s0", nombre: "Sur" },
          reservaQuitada: { id: "rec-moto", nombre: "Posadas Moto" },
        },
      })
    );
    expect(r).toMatchObject({
      tono: "aviso",
      titulo: "Recibido · sector Centro · se quitó la reserva de Posadas Moto",
    });

    const yaLoTenia = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({
        recepcion: "ya_en_custodia",
        asignacion: {
          tipo: "sector",
          aplicada: true,
          anterior: { id: "s0", nombre: "Sur" },
          reservaQuitada: { id: "rec-moto", nombre: "Posadas Moto" },
        },
      })
    );
    expect(yaLoTenia).toMatchObject({
      tono: "aviso",
      titulo: "Sector cambiado a Centro · se quitó la reserva de Posadas Moto",
    });
  });

  it("con reservaQuitada null (no había reserva) el cambio de sector sigue siendo correcto", () => {
    const r = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({
        asignacion: {
          tipo: "sector",
          aplicada: true,
          anterior: { id: "s0", nombre: "Sur" },
          reservaQuitada: null,
        },
      })
    );
    expect(r).toMatchObject({ tono: "correcto", titulo: "Recibido · sector Centro" });
  });

  it("un paquete que ya tenía, con el cambio aplicado: correcto (es lo que se buscaba)", () => {
    const r = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({
        recepcion: "ya_en_custodia",
        asignacion: { tipo: "sector", aplicada: true, anterior: { id: "s0", nombre: "Sur" } },
      })
    );
    expect(r).toMatchObject({ tono: "correcto", titulo: "Sector cambiado a Centro" });
  });

  it("recibido pero el cambio no se aplicó: aviso, con el motivo del backend", () => {
    const r = resultadoDeRespuesta(
      lectura(SECTOR),
      respuesta({
        asignacion: {
          tipo: "sector",
          aplicada: false,
          anterior: null,
          codigo: "SECTOR_DE_OTRA_LOCALIDAD",
          mensaje: "El sector Centro no es de Oberá.",
        },
      })
    );
    expect(r).toMatchObject({
      tono: "aviso",
      titulo: "Recibido, sin cambiar el sector",
      detalle: "El sector Centro no es de Oberá.",
    });

    const reserva = resultadoDeRespuesta(
      lectura(RECORRIDO),
      respuesta({
        recepcion: "ya_en_custodia",
        asignacion: { tipo: "recorrido", aplicada: false, anterior: null, mensaje: "Está en una planilla." },
      })
    );
    expect(reserva).toMatchObject({
      tono: "aviso",
      titulo: "Ya lo tenías, sin reservar el recorrido",
    });
  });

  it("la asignación sola (sin recepción), aplicada: correcto", () => {
    const r = resultadoDeRespuesta(
      lectura(RECORRIDO, "uuid-1", true),
      respuesta({
        recepcion: undefined,
        asignacion: { tipo: "recorrido", aplicada: true, anterior: null },
      })
    );
    expect(r).toMatchObject({ tono: "correcto", titulo: "Reservado para Posadas Moto" });
  });

  it("no encontrado y rechazado: error", () => {
    expect(
      resultadoDeRespuesta(lectura(RECIBIR), {
        ok: false,
        status: 404,
        code: "ENVIO_NO_ENCONTRADO",
        title: "Envío no encontrado",
        message: "No existe.",
      })
    ).toEqual({ tono: "error", titulo: "No encontrado", detalle: undefined });

    expect(
      resultadoDeRespuesta(lectura(RECIBIR), {
        ok: false,
        status: 409,
        code: "TRANSICION_INVALIDA",
        title: "El envío ya está entregado",
        message: "Un envío entregado no se recibe.",
      })
    ).toEqual({
      tono: "error",
      titulo: "El envío ya está entregado",
      detalle: "Un envío entregado no se recibe.",
    });
  });

  it("sin respuesta: error, y se puede reintentar", () => {
    expect(resultadoSinRespuesta()).toMatchObject({ tono: "error", reintentable: true });
  });
});

describe("la cola", () => {
  it("devuelve las lecturas en el orden en que se escanearon, aunque el historial vaya al revés", () => {
    let t = tandaVacia(OPERADOR);
    t = conLectura(t, lectura(RECIBIR, "a"));
    t = conLectura(t, lectura(RECIBIR, "b"));
    t = conLectura(t, lectura(RECIBIR, "c"));
    expect(t.lecturas.map((l) => l.id)).toEqual(["c", "b", "a"]);
    expect(enCola(t).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("una lectura con resultado sale de la cola; un reintento vuelve con el mismo pedido", () => {
    let t = conLectura(conLectura(tandaVacia(OPERADOR), lectura(SECTOR, "a")), lectura(SECTOR, "b"));
    const pedidoOriginal = pedidoDeLectura(t.lecturas.find((l) => l.id === "a")!);

    t = conResultado(t, "a", resultadoSinRespuesta());
    expect(enCola(t).map((l) => l.id)).toEqual(["b"]);

    t = otraVezEnCola(t, "a");
    expect(enCola(t).map((l) => l.id)).toEqual(["a", "b"]);
    expect(pedidoDeLectura(t.lecturas.find((l) => l.id === "a")!)).toEqual(pedidoOriginal);
  });

  it("el resumen cuenta recibidos, los que ya tenía, avisos, errores y lo que falta", () => {
    let t = tandaVacia(OPERADOR);
    const casos: [string, Parameters<typeof resultadoDeRespuesta>[1]][] = [
      ["a", respuesta()],
      ["b", respuesta()],
      ["c", respuesta({ recepcion: "ya_en_custodia" })],
      [
        "d",
        respuesta({ asignacion: { tipo: "sector", aplicada: false, anterior: null, mensaje: "x" } }),
      ],
      ["e", { ok: false, status: 404, code: "ENVIO_NO_ENCONTRADO", title: "x", message: "x" }],
    ];
    for (const [id, r] of casos) {
      const l = lectura(SECTOR, id);
      t = conResultado(conLectura(t, l), id, resultadoDeRespuesta(l, r));
    }
    t = conLectura(t, lectura(SECTOR, "f"));

    expect(resumenDeTanda(t)).toEqual({
      recibidos: 3,
      yaLosTenias: 1,
      conAviso: 2,
      conError: 1,
      enCola: 1,
    });
  });
});

// Los lectores de mano a veces leen dos veces el mismo código.
describe("antirrebote del lector", () => {
  const en = (ms: number) => new Date(AHORA.getTime() + ms);
  const leida = (texto: string, ms: number) =>
    nuevaLectura(texto, RECIBIR, false, `uuid-${texto}-${ms}`, en(ms));

  it("la misma lectura a 500 ms de la anterior es un rebote: se descarta", () => {
    const t = conLectura(tandaVacia(OPERADOR), leida("A", 0));
    expect(esRebote(t, "A", en(500))).toBe(true);
    expect(esRebote(t, "A", en(1999))).toBe(true);
  });

  it("la misma lectura a 2,5 s ya no es un rebote: se procesa", () => {
    const t = conLectura(tandaVacia(OPERADOR), leida("A", 0));
    expect(esRebote(t, "A", en(2000))).toBe(false);
    expect(esRebote(t, "A", en(2500))).toBe(false);
  });

  it("A, B, A dentro de 2 s: las tres se procesan (hubo otra lectura en el medio)", () => {
    let t = tandaVacia(OPERADOR);
    expect(esRebote(t, "A", en(0))).toBe(false);
    t = conLectura(t, leida("A", 0));
    expect(esRebote(t, "B", en(300))).toBe(false);
    t = conLectura(t, leida("B", 300));
    expect(esRebote(t, "A", en(600))).toBe(false);
  });

  it("una lectura distinta nunca es un rebote, ni la primera de la tanda", () => {
    expect(esRebote(tandaVacia(OPERADOR), "A", en(0))).toBe(false);
    const t = conLectura(tandaVacia(OPERADOR), leida("0000000093", 0));
    expect(esRebote(t, "000000009-3", en(100))).toBe(false);
  });

  it("vale también si la anterior ya tiene resultado", () => {
    const l = leida("A", 0);
    const t = conResultado(conLectura(tandaVacia(OPERADOR), l), l.id, resultadoSinRespuesta());
    expect(esRebote(t, "A", en(800))).toBe(true);
  });
});

describe("deshacer", () => {
  function hecha(modo: Modo, asignacion: RespuestaDeRecepcion["asignacion"]): Lectura {
    const l = lectura(modo);
    return { ...l, estado: "hecha", resultado: resultadoDeRespuesta(l, respuesta({ asignacion })) };
  }

  it("un cambio de sector vuelve al sector anterior", () => {
    const l = hecha(SECTOR, { tipo: "sector", aplicada: true, anterior: { id: "s0", nombre: "Sur" } });
    expect(sePuedeDeshacer(l)).toBe(true);
    expect(asignacionParaDeshacer(l)).toEqual({ sectorId: "s0" });
  });

  it("una reserva vuelve al recorrido anterior, o se quita si no había", () => {
    const conAnterior = hecha(RECORRIDO, {
      tipo: "recorrido",
      aplicada: true,
      anterior: { id: "rec-viejo", nombre: "Viejo" },
    });
    expect(asignacionParaDeshacer(conAnterior)).toEqual({ recorridoId: "rec-viejo" });

    const sinAnterior = hecha(RECORRIDO, { tipo: "recorrido", aplicada: true, anterior: null });
    expect(sePuedeDeshacer(sinAnterior)).toBe(true);
    expect(asignacionParaDeshacer(sinAnterior)).toEqual({ recorridoId: null });
  });

  it("no hay nada que deshacer si el envío ya tenía ese valor", () => {
    const mismoSector = hecha(SECTOR, {
      tipo: "sector",
      aplicada: true,
      anterior: { id: "sec-centro", nombre: "Centro" },
    });
    expect(sePuedeDeshacer(mismoSector)).toBe(false);
    expect(asignacionParaDeshacer(mismoSector)).toBeNull();

    const mismaReserva = hecha(RECORRIDO, {
      tipo: "recorrido",
      aplicada: true,
      anterior: { id: "rec-moto", nombre: "Posadas Moto" },
    });
    expect(sePuedeDeshacer(mismaReserva)).toBe(false);
  });

  it("no se deshace lo que no se aplicó, ni una recepción sola, ni dos veces", () => {
    expect(sePuedeDeshacer(hecha(SECTOR, { tipo: "sector", aplicada: false, anterior: null }))).toBe(
      false
    );
    expect(sePuedeDeshacer(hecha(RECIBIR, null))).toBe(false);

    const l = hecha(SECTOR, { tipo: "sector", aplicada: true, anterior: { id: "s0", nombre: "Sur" } });
    const t = conDeshecha(conLectura(tandaVacia(OPERADOR), l), l.id);
    expect(sePuedeDeshacer(t.lecturas[0])).toBe(false);
  });
});

describe("la tanda guardada en el navegador", () => {
  it("vuelve igual después de guardarla y leerla", () => {
    let t: Tanda = { ...tandaVacia(OPERADOR), modo: SECTOR, silencio: true };
    const l = lectura(SECTOR);
    t = conResultado(conLectura(t, l), l.id, resultadoDeRespuesta(l, respuesta()));
    t = conLectura(t, lectura(SECTOR, "uuid-2"));
    expect(leerTanda(serializarTanda(t), OPERADOR)).toEqual(t);
  });

  it("sin nada guardado, o con algo roto, arranca una tanda vacía", () => {
    expect(leerTanda(null, OPERADOR)).toEqual(tandaVacia(OPERADOR));
    expect(leerTanda("{no es json", OPERADOR)).toEqual(tandaVacia(OPERADOR));
    expect(leerTanda('{"lecturas":"x"}', OPERADOR)).toEqual(tandaVacia(OPERADOR));
  });

  it("no revive un modo que el usuario ya no tiene", () => {
    const guardada = serializarTanda({ ...tandaVacia(OPERADOR), modo: SECTOR });
    expect(leerTanda(guardada, CHOFER).modo).toEqual(RECIBIR);
  });
});

describe("qué se ofrece en los selectores", () => {
  it("los sectores van agrupados por localidad, todo en orden alfabético", () => {
    expect(
      sectoresPorLocalidad(
        [
          { id: "s1", nombre: "Villa Cabello", localidadId: "pos" },
          { id: "s2", nombre: "Centro", localidadId: "obe" },
          { id: "s3", nombre: "Centro", localidadId: "pos" },
          { id: "s4", nombre: "Suelto", localidadId: "otra" },
        ],
        [
          { id: "pos", nombre: "Posadas" },
          { id: "obe", nombre: "Oberá" },
        ]
      )
    ).toEqual([
      { localidad: "Oberá", sectores: [{ id: "s2", nombre: "Centro" }] },
      {
        localidad: "Posadas",
        sectores: [
          { id: "s3", nombre: "Centro" },
          { id: "s1", nombre: "Villa Cabello" },
        ],
      },
      { localidad: "Sin localidad", sectores: [{ id: "s4", nombre: "Suelto" }] },
    ]);
  });

  const RECORRIDOS = [
    { id: "r1", nombre: "Posadas Moto", baseId: "p-dep", baseNombre: "Depósito 28", activo: true },
    { id: "r2", nombre: "Apóstoles", baseId: "p-dep", baseNombre: "Depósito 28", activo: false },
    { id: "r3", nombre: "Oberá Centro", baseId: "p-obe", baseNombre: "Oberá", activo: true },
  ] as RecorridoBackend[];

  it("a quien recibe: solo los recorridos activos que salen de su punto", () => {
    expect(recorridosOfrecidos(RECORRIDOS, { recibe: true, puntoId: "p-dep" })).toEqual([
      { id: "r1", nombre: "Posadas Moto", baseNombre: "Depósito 28" },
    ]);
  });

  it("a quien solo asigna: todos los activos, con su base", () => {
    expect(recorridosOfrecidos(RECORRIDOS, { recibe: false, puntoId: "p-dep" })).toEqual([
      { id: "r3", nombre: "Oberá Centro", baseNombre: "Oberá" },
      { id: "r1", nombre: "Posadas Moto", baseNombre: "Depósito 28" },
    ]);
  });
});
