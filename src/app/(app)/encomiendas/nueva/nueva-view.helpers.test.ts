import { describe, expect, it } from "vitest";
import type { EnvioApi } from "@/server/services/envios";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";
import {
  emptyDestino,
  emptyOrigen,
  filaDuplicada,
  filaEnBlanco,
  guiaDeEnvio,
  nuevaFilaId,
  validarFila,
  type FilaDestino,
} from "./nueva-view.helpers";

function envioFixture(overrides: Partial<EnvioApi> = {}): EnvioApi {
  return {
    id: "id-completo-12345678",
    numero: "000000021-5",
    remitoManualNumero: null,
    remitenteNombre: "Ferreteria San Martin",
    remitenteTelefono: "3755-420004",
    clienteRemitenteId: null,
    destinatarioNombre: "Farmacia Centro SRL",
    destinatarioTelefono: "3764-420014",
    destinatarioCalle: "Av. Mitre",
    destinatarioNumero: "2180",
    destinatarioPiso: null,
    destinatarioReferencia: null,
    clienteDestinatarioId: null,
    localidadOrigenId: "loc-obera",
    localidadDestinoId: "loc-posadas",
    sectorDestinoId: "sec1",
    recorridoId: null,
    puntoAltaId: "punto1",
    cantidadBultos: 3,
    fleteImporte: "22000",
    tipo: "efectivo",
    lugarPago: "origen",
    formaPago: "contado",
    contrarreembolsoImporte: "80000",
    camino: "",
    guiaDiariaNumero: 10,
    estadoActual: "REGISTRADO",
    custodiaActualUsuarioId: null,
    custodiaActualPuntoId: null,
    planillaActualId: null,
    creadoEn: "2026-09-18T19:33:00.000Z",
    guiaDiaria: "E10",
    ubicacion: "",
    ...overrides,
  };
}

function localidad(id: string): LocalidadBackend {
  return { id, nombre: `Localidad ${id}`, provinciaId: "prov1" } as LocalidadBackend;
}

function sector(id: string, localidadId: string): SectorApi {
  return { id, nombre: `Sector ${id}`, localidadId } as SectorApi;
}

describe("guiaDeEnvio", () => {
  it("prioriza el remito manual por sobre todo lo demas (REQ-RM-07)", () => {
    expect(
      guiaDeEnvio(envioFixture({ remitoManualNumero: "2589636", guiaDiaria: "E10", numero: "000000021-5" }))
    ).toBe("2589636");
  });

  it("sin remito manual, usa la guia diaria", () => {
    expect(guiaDeEnvio(envioFixture({ remitoManualNumero: null, guiaDiaria: "E10" }))).toBe("E10");
  });

  // guiaDeEnvio encadena con "??" (nullish coalescing), no "||" — un string
  // vacio NO hace caer al siguiente campo, solo null/undefined. guiaDiaria
  // (y numero/id) son `string` en el tipo, nunca null, pero la cadena de
  // fallbacks esta ahi por las dudas de una respuesta real que no cumpla el
  // contrato — asi que estos tests fuerzan ese caso "imposible" a proposito
  // (de ahi el cast).
  it("sin remito manual ni guia diaria (dato faltante), usa el numero de sistema", () => {
    expect(
      guiaDeEnvio(
        envioFixture({
          remitoManualNumero: null,
          guiaDiaria: null,
          numero: "000000021-5",
        } as unknown as Partial<EnvioApi>)
      )
    ).toBe("000000021-5");
  });

  it("como ultimo recurso, los primeros 8 caracteres del id", () => {
    expect(
      guiaDeEnvio(
        envioFixture({
          remitoManualNumero: null,
          guiaDiaria: null,
          numero: null,
          id: "id-completo-12345678",
        } as unknown as Partial<EnvioApi>)
      )
    ).toBe("id-compl");
  });

  it("si no hay nada de nada, devuelve el guion largo", () => {
    expect(
      guiaDeEnvio(
        envioFixture({
          remitoManualNumero: null,
          guiaDiaria: null,
          numero: null,
          id: null,
        } as unknown as Partial<EnvioApi>)
      )
    ).toBe("—");
  });
});

describe("emptyOrigen", () => {
  it("arranca con todos los campos vacios", () => {
    expect(emptyOrigen()).toEqual({
      nombre: "",
      telefono: "",
      calle: "",
      numero: "",
      piso: "",
      referencia: "",
      localidadId: "",
    });
  });
});

describe("emptyDestino", () => {
  it("toma la primera localidad y su sector correspondiente", () => {
    const localidades = [localidad("obera"), localidad("posadas")];
    const sectores = [sector("s1", "posadas"), sector("s2", "obera")];
    const destino = emptyDestino(localidades, sectores);
    expect(destino.localidadId).toBe("obera");
    expect(destino.sectorId).toBe("s2");
  });

  it("sin localidades ni sectores, queda todo vacio (no explota)", () => {
    const destino = emptyDestino([], []);
    expect(destino.localidadId).toBe("");
    expect(destino.sectorId).toBe("");
  });
});

describe("nuevaFilaId", () => {
  it("genera ids distintos en llamadas sucesivas", () => {
    const ids = new Set(Array.from({ length: 20 }, () => nuevaFilaId()));
    expect(ids.size).toBe(20);
  });
});

describe("filaEnBlanco", () => {
  const localidades = [localidad("obera")];
  const sectores = [sector("s1", "obera")];

  it("sin heredarDe, usa los valores por defecto", () => {
    const fila = filaEnBlanco(localidades, sectores);
    expect(fila.tipo).toBe("paqueteria");
    expect(fila.lugarPago).toBe("destino");
    expect(fila.formaPago).toBe("contado");
    expect(fila.bultos).toBe(1);
    expect(fila.flete).toBe("");
    expect(fila.status).toBe("editando");
    expect(fila.errores).toEqual({});
  });

  it("con heredarDe, copia tipo/lugarPago/formaPago/bultos/flete de la fila anterior", () => {
    const anterior = filaEnBlanco(localidades, sectores);
    anterior.tipo = "efectivo";
    anterior.lugarPago = "origen";
    anterior.formaPago = "cuenta_corriente";
    anterior.bultos = 5;
    anterior.flete = 22000;
    anterior.montoCrr = 80000;

    const heredada = filaEnBlanco(localidades, sectores, anterior);
    expect(heredada.tipo).toBe("efectivo");
    expect(heredada.lugarPago).toBe("origen");
    expect(heredada.formaPago).toBe("cuenta_corriente");
    expect(heredada.bultos).toBe(5);
    expect(heredada.flete).toBe(22000);
    // montoCrr NUNCA se hereda, a diferencia de los demas campos — cada
    // destino nuevo empieza sin monto de contra reembolso propio.
    expect(heredada.montoCrr).toBe("");
  });

  it("cada fila nueva tiene su propio id", () => {
    const a = filaEnBlanco(localidades, sectores);
    const b = filaEnBlanco(localidades, sectores);
    expect(a.id).not.toBe(b.id);
  });
});

describe("filaDuplicada", () => {
  const localidades = [localidad("obera")];
  const sectores = [sector("s1", "obera")];

  it("copia destino y valores de pago, pero resetea id/remitoManual/status/resultado", () => {
    const original: FilaDestino = {
      ...filaEnBlanco(localidades, sectores),
      destino: { ...emptyDestino(localidades, sectores), nombre: "Farmacia Centro SRL" },
      remitoManual: "2589636",
      status: "ok",
      resultado: undefined,
      errorMsg: "algo",
      errores: { nombre: "x" },
    };

    const copia = filaDuplicada(original);

    expect(copia.id).not.toBe(original.id);
    expect(copia.destino.nombre).toBe("Farmacia Centro SRL");
    expect(copia.destino).not.toBe(original.destino); // copia superficial propia, no la misma referencia
    expect(copia.remitoManual).toBe("");
    expect(copia.status).toBe("editando");
    expect(copia.resultado).toBeUndefined();
    expect(copia.errorMsg).toBeUndefined();
    expect(copia.errores).toEqual({});
  });
});

describe("validarFila", () => {
  const localidades = [localidad("obera")];
  const sectores = [sector("s1", "obera")];

  function filaValida(): FilaDestino {
    return {
      ...filaEnBlanco(localidades, sectores),
      destino: {
        ...emptyDestino(localidades, sectores),
        nombre: "Farmacia Centro SRL",
        calle: "Av. Mitre",
      },
      bultos: 3,
      flete: 22000,
    };
  }

  it("una fila completa no tiene errores", () => {
    expect(validarFila(filaValida())).toEqual({});
  });

  it("exige destinatario, calle y localidad", () => {
    const fila = filaValida();
    fila.destino.nombre = "";
    fila.destino.calle = "";
    fila.destino.localidadId = "";
    const errores = validarFila(fila);
    expect(errores.nombre).toBeTruthy();
    expect(errores.calle).toBeTruthy();
    expect(errores.localidad).toBeTruthy();
  });

  it("bultos tiene que ser un entero positivo", () => {
    const fila = filaValida();
    fila.bultos = 0;
    expect(validarFila(fila).bultos).toBeTruthy();
  });

  it("flete no puede ser negativo, pero 0 es valido", () => {
    const fila = filaValida();
    fila.flete = -1;
    expect(validarFila(fila).flete).toBeTruthy();

    fila.flete = 0;
    expect(validarFila(fila).flete).toBeUndefined();
  });

  it("monto de contra reembolso solo se exige si tipo es efectivo", () => {
    const fila = filaValida();
    fila.tipo = "paqueteria";
    fila.montoCrr = "";
    expect(validarFila(fila).montoCrr).toBeUndefined();

    fila.tipo = "efectivo";
    fila.montoCrr = "";
    expect(validarFila(fila).montoCrr).toBeTruthy();

    fila.montoCrr = 80000;
    expect(validarFila(fila).montoCrr).toBeUndefined();
  });
});
