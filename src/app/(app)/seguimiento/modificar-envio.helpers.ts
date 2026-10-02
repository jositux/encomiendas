// Funciones puras del panel "Modificar datos" de Seguimiento (2026-10-01):
// armar el formulario a partir del envío, aplicar las reglas por tipo,
// validar, y calcular qué campos cambiaron. Nada acá depende de React —
// mismo criterio que nueva-view.helpers.ts, de donde salen las reglas por
// tipo (el panel no las repite: usa las del alta).

import {
  lugarPagoPorDefecto,
  lugarPagoValido,
  permiteContrarreembolso,
  permiteElegirFormaPago,
  permiteGastoYFlete,
  permiteValorDeclarado,
} from "@/app/(app)/encomiendas/nueva/nueva-view.helpers";
import { bultosSchema, montoNoNegativoSchema, montoPositivoSchema } from "@/lib/validation";
import type {
  CamposModificablesEnvio,
  EnvioApi,
  FormaPagoApi,
  LugarPagoApi,
  TipoEnvioApi,
} from "@/server/services/envios";
import type { CamposEditables } from "@/server/services/seguimiento";

// Mismo piso y techo que valida el backend (ModificarEnvioDto.motivo),
// contados después de recortar espacios.
export const MOTIVO_MIN = 3;
export const MOTIVO_MAX = 200;

// Rechazos del PATCH que significan "este usuario ya no puede modificar
// este envío": cambió de situación mientras el panel estaba abierto (entró
// a una planilla, salió, se entregó, se anuló) o quedó fuera de su alcance.
// Son los mismos códigos de `edicion.bloqueo` (BloqueoDeEdicionDto en el
// contrato) y el `detail` trae el mismo mensaje. Ya no tiene sentido seguir
// editando: el panel se cierra, avisa y recarga el seguimiento, que trae el
// aviso de bloqueo que corresponda.
export const CODIGOS_DE_BLOQUEO = [
  "ENVIO_EN_PLANILLA",
  "ENVIO_EN_CUSTODIA",
  "FUERA_DE_ALCANCE",
  "ENVIO_CERRADO",
];

// "Los importes": los siete campos del PATCH que definen qué se cobra y
// cómo. Con `edicion.campos = "sin_importes"` (quien tiene el envío en
// custodia fuera de su origen) el panel los muestra sin dejar editarlos y
// NO viajan en el PATCH -- si viajara uno cambiado, el backend responde 403
// CAMPO_NO_PERMITIDO y no aplica nada del pedido. Misma lista que el spec
// del backend (2026-10-02-modificar-envio-en-custodia, §2).
export const CAMPOS_DE_IMPORTES: (keyof CamposModificablesEnvio)[] = [
  "fleteImporte",
  "contrarreembolsoImporte",
  "gasto",
  "valorDeclarado",
  "tipo",
  "lugarPago",
  "formaPago",
];

export const AVISO_IMPORTES_NO_EDITABLES =
  "Los importes los modifica el origen antes del corte, supervisión o administración.";

// Los 22 campos que acepta PATCH /envios/:id, en la forma en que se tipean.
// Los importes siguen la convención del alta: número, o "" si está vacío.
export interface FormModificarEnvio {
  remitenteNombre: string;
  remitenteTelefono: string;
  remitenteCalle: string;
  remitenteNumero: string;
  remitentePiso: string;
  remitenteReferencia: string;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioCalle: string;
  destinatarioNumero: string;
  destinatarioPiso: string;
  destinatarioReferencia: string;
  tipo: TipoEnvioApi;
  lugarPago: LugarPagoApi;
  formaPago: FormaPagoApi;
  bultos: number;
  flete: number | "";
  montoCrr: number | "";
  valorDeclarado: number | "";
  gasto: number | "";
  remitoManual: string;
  observaciones: string;
}

function importe(valor: string | null | undefined): number | "" {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  return Number.isFinite(n) ? n : "";
}

export function formDesdeEnvio(envio: EnvioApi): FormModificarEnvio {
  return {
    remitenteNombre: envio.remitenteNombre ?? "",
    remitenteTelefono: envio.remitenteTelefono ?? "",
    remitenteCalle: envio.remitenteCalle ?? "",
    remitenteNumero: envio.remitenteNumero ?? "",
    remitentePiso: envio.remitentePiso ?? "",
    remitenteReferencia: envio.remitenteReferencia ?? "",
    destinatarioNombre: envio.destinatarioNombre ?? "",
    destinatarioTelefono: envio.destinatarioTelefono ?? "",
    destinatarioCalle: envio.destinatarioCalle ?? "",
    destinatarioNumero: envio.destinatarioNumero ?? "",
    destinatarioPiso: envio.destinatarioPiso ?? "",
    destinatarioReferencia: envio.destinatarioReferencia ?? "",
    tipo: envio.tipo,
    lugarPago: envio.lugarPago,
    formaPago: envio.formaPago,
    bultos: envio.cantidadBultos,
    flete: importe(envio.fleteImporte),
    montoCrr: importe(envio.contrarreembolsoImporte),
    valorDeclarado: importe(envio.valorDeclarado),
    gasto: importe(envio.gasto),
    remitoManual: envio.remitoManualNumero ?? "",
    observaciones: envio.observaciones ?? "",
  };
}

// Cambiar el tipo limpia/ajusta todo lo que deja de valer con el tipo
// nuevo — misma secuencia que el selector de tipo del alta
// (alta-individual-view.tsx): así la combinación inválida no se puede ni
// armar, en vez de enterarse por un 400 REGLA_DE_TIPO al guardar.
export function conTipo(form: FormModificarEnvio, tipo: TipoEnvioApi): FormModificarEnvio {
  const next = { ...form, tipo };
  if (!lugarPagoValido(tipo, next.lugarPago)) next.lugarPago = lugarPagoPorDefecto(tipo);
  if (!permiteElegirFormaPago(tipo)) next.formaPago = "contado";
  if (!permiteContrarreembolso(tipo)) next.montoCrr = "";
  if (!permiteValorDeclarado(tipo)) next.valorDeclarado = "";
  if (!permiteGastoYFlete(tipo)) {
    next.flete = "";
    next.gasto = "";
  }
  return next;
}

// El formulario llevado a los valores que entiende el PATCH: textos
// recortados, "" como `null` donde el contrato lo acepta, el remito con
// ceros a la izquierda, y los importes que no corresponden al tipo en su
// valor "prohibido" (null o 0). Se compara ESTO, no lo tipeado, para que
// "  Juan " contra "Juan" o "" contra `null` no cuenten como un cambio.
type ValoresPatch = Required<CamposModificablesEnvio>;

function opcional(texto: string): string | null {
  const t = texto.trim();
  return t === "" ? null : t;
}

export function valoresParaPatch(form: FormModificarEnvio): ValoresPatch {
  const digitos = form.remitoManual.trim();
  return {
    remitenteNombre: form.remitenteNombre.trim(),
    remitenteTelefono: form.remitenteTelefono.trim(),
    remitenteCalle: opcional(form.remitenteCalle),
    remitenteNumero: opcional(form.remitenteNumero),
    remitentePiso: opcional(form.remitentePiso),
    remitenteReferencia: opcional(form.remitenteReferencia),
    destinatarioNombre: form.destinatarioNombre.trim(),
    destinatarioTelefono: form.destinatarioTelefono.trim(),
    destinatarioCalle: form.destinatarioCalle.trim(),
    destinatarioNumero: opcional(form.destinatarioNumero),
    destinatarioPiso: opcional(form.destinatarioPiso),
    destinatarioReferencia: opcional(form.destinatarioReferencia),
    cantidadBultos: form.bultos,
    fleteImporte: permiteGastoYFlete(form.tipo) && form.flete !== "" ? form.flete : 0,
    tipo: form.tipo,
    lugarPago: form.lugarPago,
    formaPago: permiteElegirFormaPago(form.tipo) ? form.formaPago : "contado",
    contrarreembolsoImporte:
      permiteContrarreembolso(form.tipo) && form.montoCrr !== "" ? form.montoCrr : null,
    remitoManualNumero: digitos ? digitos.padStart(6, "0") : null,
    valorDeclarado:
      permiteValorDeclarado(form.tipo) && form.valorDeclarado !== "" ? form.valorDeclarado : null,
    gasto: permiteGastoYFlete(form.tipo) && form.gasto !== "" ? form.gasto : 0,
    observaciones: opcional(form.observaciones),
  };
}

// Solo los campos que cambiaron respecto del envío tal como se cargó en el
// panel. Un objeto vacío = no hay nada para guardar.
//
// Con `campos = "sin_importes"` los siete importes quedan afuera pase lo
// que pase con el formulario: ni un valor tipeado ni un efecto colateral de
// las reglas por tipo puede hacer que viajen.
export function cambiosDelFormulario(
  inicial: FormModificarEnvio,
  actual: FormModificarEnvio,
  campos: CamposEditables = "todos"
): CamposModificablesEnvio {
  const antes = valoresParaPatch(inicial);
  const despues = valoresParaPatch(actual);
  const cambios: Record<string, unknown> = {};
  for (const campo of Object.keys(despues) as (keyof ValoresPatch)[]) {
    if (campos === "sin_importes" && CAMPOS_DE_IMPORTES.includes(campo)) continue;
    if (antes[campo] !== despues[campo]) cambios[campo] = despues[campo];
  }
  return cambios as CamposModificablesEnvio;
}

// Textos que el contrato no deja vacíos (minLength 1). Solo se exigen si
// el envío los tenía: un envío viejo cargado sin teléfono no obliga a
// inventar uno para poder corregir otro dato (ese campo no cambia y no se
// manda).
const TEXTOS_OBLIGATORIOS: { campo: keyof FormModificarEnvio; mensaje: string }[] = [
  { campo: "remitenteNombre", mensaje: "Ingresá el remitente." },
  { campo: "remitenteTelefono", mensaje: "Ingresá el teléfono del remitente." },
  { campo: "destinatarioNombre", mensaje: "Ingresá el destinatario." },
  { campo: "destinatarioTelefono", mensaje: "Ingresá el teléfono del destinatario." },
  { campo: "destinatarioCalle", mensaje: "Ingresá la calle de destino." },
];

export function validarFormulario(
  inicial: FormModificarEnvio,
  actual: FormModificarEnvio,
  motivo: string,
  // Con "sin_importes" los importes no se validan: no se pueden editar ni
  // viajan, así que un importe del envío que hoy no pasaría la validación
  // del alta no puede trabar la corrección de un teléfono.
  campos: CamposEditables = "todos"
): Record<string, string> {
  const errores: Record<string, string> = {};

  for (const { campo, mensaje } of TEXTOS_OBLIGATORIOS) {
    const teniaValor = String(inicial[campo]).trim() !== "";
    if (teniaValor && String(actual[campo]).trim() === "") errores[campo] = mensaje;
  }

  const bultosCheck = bultosSchema.safeParse(actual.bultos);
  if (!bultosCheck.success) errores.bultos = bultosCheck.error.issues[0].message;

  const validaImportes = campos !== "sin_importes";

  if (validaImportes && permiteGastoYFlete(actual.tipo)) {
    const fleteCheck = montoNoNegativoSchema.safeParse(actual.flete === "" ? 0 : actual.flete);
    if (!fleteCheck.success) errores.flete = fleteCheck.error.issues[0].message;
    const gastoCheck = montoNoNegativoSchema.safeParse(actual.gasto === "" ? 0 : actual.gasto);
    if (!gastoCheck.success) errores.gasto = gastoCheck.error.issues[0].message;
  }
  if (validaImportes && permiteContrarreembolso(actual.tipo)) {
    const crrCheck = montoPositivoSchema.safeParse(actual.montoCrr === "" ? 0 : actual.montoCrr);
    if (!crrCheck.success) errores.montoCrr = crrCheck.error.issues[0].message;
  }
  if (validaImportes && permiteValorDeclarado(actual.tipo) && actual.valorDeclarado !== "") {
    const vdCheck = montoNoNegativoSchema.safeParse(actual.valorDeclarado);
    if (!vdCheck.success) errores.valorDeclarado = vdCheck.error.issues[0].message;
  }

  const largoMotivo = motivo.trim().length;
  if (largoMotivo < MOTIVO_MIN) {
    errores.motivo = `Escribí el motivo del cambio (al menos ${MOTIVO_MIN} caracteres).`;
  } else if (largoMotivo > MOTIVO_MAX) {
    errores.motivo = `El motivo no puede pasar de ${MOTIVO_MAX} caracteres.`;
  }

  return errores;
}
