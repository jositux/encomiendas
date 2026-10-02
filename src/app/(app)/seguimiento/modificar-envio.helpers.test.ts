import { describe, expect, it } from "vitest";
import type { EnvioApi } from "@/server/services/envios";
import {
  CAMPOS_DE_IMPORTES,
  MOTIVO_MAX,
  cambiosDelFormulario,
  conTipo,
  formDesdeEnvio,
  validarFormulario,
} from "./modificar-envio.helpers";
import { envioFixture } from "./seguimiento.fixtures";

function form(overrides: Partial<EnvioApi> = {}) {
  return formDesdeEnvio(envioFixture(overrides));
}

describe("formDesdeEnvio", () => {
  it("precarga los 22 campos, con los importes como número y los null como vacío", () => {
    expect(form()).toEqual({
      remitenteNombre: "Ferreteria San Martin",
      remitenteTelefono: "3755-420004",
      remitenteCalle: "Sarmiento",
      remitenteNumero: "850",
      remitentePiso: "",
      remitenteReferencia: "",
      destinatarioNombre: "Farmacia Centro SRL",
      destinatarioTelefono: "3764-420014",
      destinatarioCalle: "Av. Mitre",
      destinatarioNumero: "2180",
      destinatarioPiso: "",
      destinatarioReferencia: "casa verde frente a la plaza",
      tipo: "paqueteria",
      lugarPago: "origen",
      formaPago: "contado",
      bultos: 2,
      flete: 10000,
      montoCrr: "",
      valorDeclarado: 50000,
      gasto: 0,
      remitoManual: "000123",
      observaciones: "Repuestos",
    });
  });
});

describe("cambiosDelFormulario", () => {
  it("no encuentra cambios si no se tocó nada", () => {
    const inicial = form();
    expect(cambiosDelFormulario(inicial, { ...inicial })).toEqual({});
  });

  it("devuelve solo los campos que cambiaron, con el nombre que espera el PATCH", () => {
    const inicial = form();
    const actual = { ...inicial, destinatarioTelefono: "3764-999999", flete: 8000 as const, bultos: 3 };
    expect(cambiosDelFormulario(inicial, actual)).toEqual({
      destinatarioTelefono: "3764-999999",
      fleteImporte: 8000,
      cantidadBultos: 3,
    });
  });

  it("no cuenta como cambio los espacios de más ni un opcional que sigue vacío", () => {
    const inicial = form();
    const actual = { ...inicial, remitenteNombre: "  Ferreteria San Martin ", remitentePiso: "   " };
    expect(cambiosDelFormulario(inicial, actual)).toEqual({});
  });

  it("manda null para borrar un dato opcional", () => {
    const inicial = form();
    const actual = {
      ...inicial,
      destinatarioReferencia: "",
      observaciones: " ",
      valorDeclarado: "" as const,
      remitoManual: "",
    };
    expect(cambiosDelFormulario(inicial, actual)).toEqual({
      destinatarioReferencia: null,
      observaciones: null,
      valorDeclarado: null,
      remitoManualNumero: null,
    });
  });

  it("completa el remito manual con ceros a la izquierda", () => {
    const inicial = form();
    expect(cambiosDelFormulario(inicial, { ...inicial, remitoManual: "77" })).toEqual({
      remitoManualNumero: "000077",
    });
    // "123" es el mismo remito que ya tenía ("000123"): no es un cambio.
    expect(cambiosDelFormulario(inicial, { ...inicial, remitoManual: "123" })).toEqual({});
  });

  it("un flete vacío es 0", () => {
    const inicial = form();
    expect(cambiosDelFormulario(inicial, { ...inicial, flete: "" })).toEqual({ fleteImporte: 0 });
  });
});

describe("conTipo", () => {
  it("al pasar a interno limpia lo que ese tipo prohíbe", () => {
    const inicial = form();
    const actual = conTipo(inicial, "interno");
    expect(actual.lugarPago).toBe("origen");
    expect(actual.formaPago).toBe("contado");
    expect(actual.flete).toBe("");
    expect(actual.gasto).toBe("");
    expect(actual.valorDeclarado).toBe("");
    expect(cambiosDelFormulario(inicial, actual)).toEqual({
      tipo: "interno",
      fleteImporte: 0,
      valorDeclarado: null,
    });
  });

  it("al pasar a contra reembolso saca el valor declarado y pide el importe", () => {
    const inicial = form();
    const actual = conTipo(inicial, "efectivo");
    expect(actual.valorDeclarado).toBe("");
    expect(validarFormulario(inicial, actual, "cambio de tipo").montoCrr).toBeTruthy();

    const conImporte = { ...actual, montoCrr: 80000 as const };
    expect(validarFormulario(inicial, conImporte, "cambio de tipo")).toEqual({});
    expect(cambiosDelFormulario(inicial, conImporte)).toEqual({
      tipo: "efectivo",
      contrarreembolsoImporte: 80000,
      valorDeclarado: null,
    });
  });

  it("cambia el lugar de pago solo si el actual no vale para el tipo nuevo", () => {
    // "origen" vale para trámite: se conserva.
    expect(conTipo(form(), "tramite").lugarPago).toBe("origen");
    // "destino" no vale para trámite: pasa al primero de la lista.
    expect(conTipo(form({ lugarPago: "destino" }), "tramite").lugarPago).toBe("origen");
  });

  it("al salir de contra reembolso borra el importe", () => {
    const inicial = form({ tipo: "efectivo", contrarreembolsoImporte: "80000.00", valorDeclarado: null });
    expect(cambiosDelFormulario(inicial, conTipo(inicial, "paqueteria"))).toEqual({
      tipo: "paqueteria",
      contrarreembolsoImporte: null,
    });
  });
});

describe("validarFormulario", () => {
  it("exige el motivo, de 3 a 200 caracteres sin contar espacios de los bordes", () => {
    const inicial = form();
    expect(validarFormulario(inicial, inicial, "").motivo).toBeTruthy();
    expect(validarFormulario(inicial, inicial, "  ab  ").motivo).toBeTruthy();
    expect(validarFormulario(inicial, inicial, "a".repeat(MOTIVO_MAX + 1)).motivo).toBeTruthy();
    expect(validarFormulario(inicial, inicial, "abc")).toEqual({});
    expect(validarFormulario(inicial, inicial, "a".repeat(MOTIVO_MAX))).toEqual({});
  });

  it("no deja vaciar un dato obligatorio que el envío tenía", () => {
    const inicial = form();
    const errores = validarFormulario(
      inicial,
      { ...inicial, destinatarioNombre: " ", destinatarioCalle: "", remitenteTelefono: "" },
      "motivo"
    );
    expect(Object.keys(errores).sort()).toEqual([
      "destinatarioCalle",
      "destinatarioNombre",
      "remitenteTelefono",
    ]);
  });

  it("no obliga a completar un teléfono que el envío ya no tenía", () => {
    const inicial = form({ destinatarioTelefono: "" });
    expect(validarFormulario(inicial, { ...inicial, flete: 8000 }, "flete mal cargado")).toEqual({});
  });
});

// 2026-10-02: quien tiene el envío en custodia fuera de su origen modifica
// todo menos los importes (`edicion.campos = "sin_importes"`).
describe("con campos = sin_importes", () => {
  it("los importes son los siete campos que definen qué se cobra y cómo", () => {
    expect([...CAMPOS_DE_IMPORTES].sort()).toEqual([
      "contrarreembolsoImporte",
      "fleteImporte",
      "formaPago",
      "gasto",
      "lugarPago",
      "tipo",
      "valorDeclarado",
    ]);
  });

  it("los otros quince campos viajan como siempre", () => {
    const inicial = form();
    const actual = {
      ...inicial,
      destinatarioTelefono: "3764-999999",
      remitenteReferencia: "portón negro",
      bultos: 3,
      remitoManual: "77",
      observaciones: "",
    };
    expect(cambiosDelFormulario(inicial, actual, "sin_importes")).toEqual({
      destinatarioTelefono: "3764-999999",
      remitenteReferencia: "portón negro",
      cantidadBultos: 3,
      remitoManualNumero: "000077",
      observaciones: null,
    });
  });

  it("ningún importe viaja, aunque el formulario lo traiga cambiado", () => {
    const inicial = form();
    const actual = {
      ...inicial,
      flete: 8000 as const,
      gasto: 500 as const,
      valorDeclarado: "" as const,
      montoCrr: 100 as const,
      lugarPago: "destino" as const,
      formaPago: "cuenta_corriente" as const,
      destinatarioNombre: "Farmacia Centro",
    };
    expect(cambiosDelFormulario(inicial, actual, "sin_importes")).toEqual({
      destinatarioNombre: "Farmacia Centro",
    });
    // Con "todos" esos mismos cambios sí viajan.
    expect(Object.keys(cambiosDelFormulario(inicial, actual, "todos")).sort()).toEqual([
      "destinatarioNombre",
      "fleteImporte",
      "formaPago",
      "gasto",
      "lugarPago",
      "valorDeclarado",
    ]);
  });

  it("un cambio de tipo, con todo lo que limpia por efecto colateral, tampoco viaja", () => {
    const inicial = form();
    const actual = { ...conTipo(inicial, "interno"), destinatarioPiso: "2 B" };
    expect(cambiosDelFormulario(inicial, actual, "sin_importes")).toEqual({
      destinatarioPiso: "2 B",
    });
  });

  it("no valida los importes: uno que hoy no pasaría el alta no traba la corrección", () => {
    // Contra reembolso sin importe: con "todos" es un error del formulario.
    const inicial = form({ tipo: "efectivo", contrarreembolsoImporte: null, valorDeclarado: null });
    const actual = { ...inicial, destinatarioTelefono: "3764-999999" };
    expect(validarFormulario(inicial, actual, "teléfono mal cargado").montoCrr).toBeTruthy();
    expect(validarFormulario(inicial, actual, "teléfono mal cargado", "sin_importes")).toEqual({});
  });

  it("el motivo y los datos obligatorios se siguen exigiendo", () => {
    const inicial = form();
    const errores = validarFormulario(
      inicial,
      { ...inicial, destinatarioNombre: "" },
      "",
      "sin_importes"
    );
    expect(Object.keys(errores).sort()).toEqual(["destinatarioNombre", "motivo"]);
  });
});
