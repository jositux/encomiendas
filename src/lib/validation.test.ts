import { describe, expect, it } from "vitest";
import {
  bultosSchema,
  montoNoNegativoSchema,
  montoPositivoSchema,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
  nombreClienteSchema,
  telefonoClienteSchema,
  dniSchema,
  cuitSchema,
  emailOpcionalSchema,
  sanitizeTelefonoInput,
  sanitizeDocumentoInput,
  sanitizeEmailInput,
} from "./validation";

describe("bultosSchema", () => {
  it("acepta enteros positivos", () => {
    expect(bultosSchema.safeParse(3).success).toBe(true);
  });

  it("rechaza 0 (tiene que ser al menos 1)", () => {
    expect(bultosSchema.safeParse(0).success).toBe(false);
  });

  it("rechaza decimales", () => {
    const r = bultosSchema.safeParse(1.5);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("No se permiten decimales.");
  });

  it("rechaza negativos", () => {
    expect(bultosSchema.safeParse(-1).success).toBe(false);
  });
});

describe("montoNoNegativoSchema (flete)", () => {
  it("acepta 0 (envio sin costo)", () => {
    expect(montoNoNegativoSchema.safeParse(0).success).toBe(true);
  });

  it("acepta positivos", () => {
    expect(montoNoNegativoSchema.safeParse(22000).success).toBe(true);
  });

  it("rechaza negativos", () => {
    expect(montoNoNegativoSchema.safeParse(-1).success).toBe(false);
  });
});

describe("montoPositivoSchema (contra reembolso)", () => {
  it("rechaza 0 (a diferencia del flete)", () => {
    expect(montoPositivoSchema.safeParse(0).success).toBe(false);
  });

  it("acepta positivos", () => {
    expect(montoPositivoSchema.safeParse(80000).success).toBe(true);
  });
});

describe("sanitizeIntegerInput", () => {
  it("deja pasar solo digitos", () => {
    expect(sanitizeIntegerInput("12a3")).toBe("123");
  });

  it("bloquea signos y notacion cientifica", () => {
    expect(sanitizeIntegerInput("-1e3")).toBe("13");
  });

  it("string vacio queda vacio", () => {
    expect(sanitizeIntegerInput("")).toBe("");
  });
});

describe("sanitizeMoneyInput", () => {
  it("deja pasar digitos y un punto decimal", () => {
    expect(sanitizeMoneyInput("22000.50")).toBe("22000.50");
  });

  it("bloquea signos y letras", () => {
    expect(sanitizeMoneyInput("-22000abc")).toBe("22000");
  });

  it("colapsa multiples puntos en uno solo (el primero)", () => {
    expect(sanitizeMoneyInput("1.2.3.4")).toBe("1.234");
  });
});

describe("schemas de Clientes", () => {
  it("nombreClienteSchema pide al menos 2 caracteres, tras trim", () => {
    expect(nombreClienteSchema.safeParse("  Jo  ").success).toBe(true);
    expect(nombreClienteSchema.safeParse(" J ").success).toBe(false);
  });

  it("telefonoClienteSchema pide al menos 6 caracteres", () => {
    expect(telefonoClienteSchema.safeParse("375741").success).toBe(true);
    expect(telefonoClienteSchema.safeParse("12345").success).toBe(false);
  });

  it("dniSchema acepta vacio (opcional), 7 u 8 digitos, ignorando guiones/espacios", () => {
    expect(dniSchema.safeParse("").success).toBe(true);
    expect(dniSchema.safeParse("12.345.678").success).toBe(true);
    expect(dniSchema.safeParse("1234567").success).toBe(true);
    expect(dniSchema.safeParse("123456").success).toBe(false);
    expect(dniSchema.safeParse("123456789").success).toBe(false);
  });

  it("cuitSchema exige exactamente 11 digitos, ignorando guiones", () => {
    expect(cuitSchema.safeParse("20-12345678-9").success).toBe(true);
    expect(cuitSchema.safeParse("2012345678").success).toBe(false);
  });

  it("emailOpcionalSchema acepta vacio o un email valido", () => {
    expect(emailOpcionalSchema.safeParse("").success).toBe(true);
    expect(emailOpcionalSchema.safeParse("josi@interfaz.co").success).toBe(true);
    expect(emailOpcionalSchema.safeParse("no-es-un-email").success).toBe(false);
  });
});

describe("sanitizers de Clientes", () => {
  it("sanitizeTelefonoInput deja digitos, espacios y guiones", () => {
    expect(sanitizeTelefonoInput("3757-410007 !!")).toBe("3757-410007 ");
  });

  it("sanitizeDocumentoInput topea a 8 digitos para persona y 11 para empresa", () => {
    expect(sanitizeDocumentoInput("123456789012", "persona")).toBe("12345678");
    expect(sanitizeDocumentoInput("123456789012", "empresa")).toBe("12345678901");
  });

  it("sanitizeEmailInput bloquea acentos, enie y espacios", () => {
    expect(sanitizeEmailInput("josé ñandú@interfaz.co")).toBe("josand@interfaz.co");
  });
});
