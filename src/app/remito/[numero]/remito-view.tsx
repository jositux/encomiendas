"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Barcode39 } from "@/components/shared/barcode39";
import { CopyButton } from "@/components/shared/copy-button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { registrarImpresionRemitoAction } from "@/server/actions";
import type { ImpresionRegistradaApi, RemitoApi } from "@/server/services/envios";

const TIPO_LABEL: Record<string, string> = {
  paqueteria: "Paquetería",
  efectivo: "Contra reembolso",
  tramite: "Trámite",
  interno: "Interno",
};

const LUGAR_LABEL: Record<string, string> = {
  origen: "Origen",
  destino: "Destino",
  regreso: "Contra entrega (regreso)",
};

const FORMA_LABEL: Record<string, string> = {
  contado: "Contado",
  cuenta_corriente: "Cuenta corriente",
};

function money(value: string | null) {
  // CONTRATO-2026-09-24-01 (punto 4, Sebastian): importes en null son un
  // renglon en blanco en el papel, no "$ 0" -- Number(null) da 0 y lo
  // confundia con un importe real (p.ej. los tres importes de un envio
  // "interno" vienen null).
  if (value === null) return "";
  return formatCurrency(Number(value));
}

// Rechazos del registro que significan "este envío ya no se imprime" (se
// anuló, o quedó con el alta incompleta, con la página abierta). No tiene
// sentido reintentar: se muestra el mensaje del backend y se recarga, para
// que la página quede como la de cualquier remito bloqueado.
const CODIGOS_DE_BLOQUEO = ["ENVIO_ANULADO", "ALTA_INCOMPLETA"];

const AVISO_SIN_HABILITACION = "Para imprimir este remito usá el botón Imprimir";

function nuevoClientUuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// "dd/mm/aaaa hh:mm" de la leyenda de reimpresión, SIEMPRE en hora de
// Argentina: es un papel de la empresa, no depende de dónde esté ni cómo
// tenga configurado el reloj el navegador que lo imprime.
const FORMATO_DE_IMPRESION = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function fechaDeImpresion(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parte = Object.fromEntries(
    FORMATO_DE_IMPRESION.formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${parte.day}/${parte.month}/${parte.year} ${parte.hour}:${parte.minute}`;
}

// Desde la segunda impresión el papel lo dice, en las dos copias.
export function leyendaDeReimpresion(impresion: ImpresionRegistradaApi): string | null {
  if (impresion.numero < 2) return null;
  return `REIMPRESIÓN n.º ${impresion.numero} · ${fechaDeImpresion(impresion.impresoEn)} · ${impresion.impresoPor.nombre}`;
}

// Registro de impresión (2026-10-02). Regla del usuario: SIN REGISTRO NO SE
// IMPRIME. Toda impresión de un remito pasa por esta página, así que la
// regla vive acá:
//
// - "Imprimir" primero registra la impresión en el backend (POST
//   /envios/{envioId}/impresiones-remito) y recién con la respuesta abre
//   el diálogo. Si el registro falla, no hay diálogo. Lo mismo pasa solo,
//   sin tocar el botón, cuando la página se abre con `?imprimir=1`.
// - El registro HABILITA un solo diálogo. Mientras no hay habilitación, el
//   remito está oculto en impresión y en su lugar sale un aviso: es lo que
//   imprime un Ctrl+P o el menú del navegador. Al cerrarse el diálogo
//   (`afterprint`) la habilitación se consume; volver a imprimir exige
//   volver a registrar. Por si `afterprint` no llega (algún navegador, o
//   el iframe de la impresión automática), hay una segunda guarda en
//   `beforeprint`: una habilitación sirve para el primer diálogo que se
//   abre; si se abre otro con la misma, se revoca antes de imprimir.
// - La respuesta trae el número de impresión: desde la segunda, las dos
//   copias llevan la leyenda "REIMPRESIÓN n.º N · fecha · usuario".
// - Si el backend dice que el envío no se imprime (`remito.impresion`, p.
//   ej. anulado), no hay botón: se muestra su mensaje.
//
// "Impreso" significa "se habilitó un diálogo": el navegador no informa si
// salió papel, se guardó un PDF o se canceló.
export function RemitoView({ remito }: { remito: RemitoApi }) {
  const router = useRouter();
  const [habilitacion, setHabilitacion] = React.useState<ImpresionRegistradaApi | null>(null);
  const [registrando, setRegistrando] = React.useState(false);
  const [error, setError] = React.useState("");
  // Bloqueo que llegó como 409 al registrar: se muestra enseguida, sin
  // esperar a que la recarga traiga `remito.impresion` actualizado.
  const [bloqueoAlRegistrar, setBloqueoAlRegistrar] = React.useState<string | null>(null);

  // Un clientUuid por INTENTO de impresión: se reusa en los reintentos de
  // ese intento (si el registro llegó pero la respuesta se perdió, no queda
  // una segunda impresión en la historia) y se descarta al habilitar, para
  // que la impresión siguiente sea un acto nuevo.
  const intentoRef = React.useRef<string | null>(null);
  // Guarda sincrónica contra el doble clic: `registrando` (estado) recién
  // se ve en el render siguiente.
  const registrandoRef = React.useRef(false);
  // La habilitación vista desde los eventos de impresión, que corren fuera
  // del render: si hay una viva, y si ya abrió su diálogo.
  const habilitacionRef = React.useRef({ viva: false, usada: false });

  const bloqueo = bloqueoAlRegistrar ?? remito.impresion?.bloqueo?.mensaje ?? null;
  const imprimible = bloqueoAlRegistrar === null && remito.impresion?.permitida === true;

  // Registra la impresión y deja la página habilitada para UN diálogo.
  // Devuelve si quedó habilitada (y por qué no, para el modo embebido).
  const registrarYHabilitar = React.useCallback(async (): Promise<
    { ok: true } | { ok: false; mensaje: string }
  > => {
    if (registrandoRef.current) return { ok: false, mensaje: "" };
    registrandoRef.current = true;
    setRegistrando(true);
    setError("");
    const clientUuid = (intentoRef.current ??= nuevoClientUuid());
    try {
      const r = await registrarImpresionRemitoAction(remito.envioId, clientUuid);
      if (r.ok) {
        intentoRef.current = null;
        habilitacionRef.current = { viva: true, usada: false };
        // flushSync: la habilitación (y la leyenda de reimpresión) tienen
        // que estar en el DOM antes de que quien llama abra el diálogo.
        flushSync(() => setHabilitacion(r.impresion));
        return { ok: true };
      }
      if (CODIGOS_DE_BLOQUEO.includes(r.code)) {
        intentoRef.current = null;
        setBloqueoAlRegistrar(r.message);
        router.refresh();
        return { ok: false, mensaje: r.message };
      }
      // Un uuid gastado en otro acto no sirve para reintentar.
      if (r.code === "CLIENT_UUID_REUTILIZADO") intentoRef.current = null;
      const mensaje = r.message || r.title;
      setError(mensaje);
      return { ok: false, mensaje };
    } catch {
      // Error que no vino del backend como rechazo (red caída, etc.): el
      // clientUuid se conserva, el reintento es el mismo acto.
      const mensaje = "No se pudo comunicar con el servidor.";
      setError(mensaje);
      return { ok: false, mensaje };
    } finally {
      registrandoRef.current = false;
      setRegistrando(false);
    }
  }, [remito.envioId, router]);

  async function imprimir() {
    const r = await registrarYHabilitar();
    if (r.ok) window.print();
  }

  // Una habilitación, un diálogo: se consume cuando el diálogo se cierra,
  // haya salido papel o no. También corre tras un Ctrl+P sin habilitación,
  // donde no hay nada que consumir.
  //
  // Segunda guarda, en `beforeprint`, por si `afterprint` no llega: el
  // primer diálogo que se abre con una habilitación viva la marca como
  // usada; si se abre OTRO con esa misma habilitación (un Ctrl+P después
  // de imprimir), se revoca ahí mismo -- con flushSync, porque el navegador
  // arma la hoja apenas termina este evento -- y ese diálogo imprime el
  // aviso, no el remito con la leyenda de la impresión anterior.
  React.useEffect(() => {
    const consumir = () => {
      habilitacionRef.current = { viva: false, usada: false };
      setHabilitacion(null);
    };
    const alAbrirDialogo = () => {
      const actual = habilitacionRef.current;
      if (!actual.viva) return;
      if (!actual.usada) {
        actual.usada = true;
        return;
      }
      habilitacionRef.current = { viva: false, usada: false };
      flushSync(() => setHabilitacion(null));
    };
    window.addEventListener("afterprint", consumir);
    window.addEventListener("beforeprint", alAbrirDialogo);
    return () => {
      window.removeEventListener("afterprint", consumir);
      window.removeEventListener("beforeprint", alAbrirDialogo);
    };
  }, []);

  // NOTA-2026-09-28-02: si esta página está embebida en el <iframe> oculto
  // de imprimir-remito.ts (impresión automática al terminar un alta),
  // avisarle a la ventana padre que ya terminó de pintar -- código de
  // barras incluido, que Barcode39 dibuja en su propio useEffect; por
  // orden de commit de React los efectos de los hijos corren antes que
  // los del padre, así que acá abajo el barcode ya está listo. Si la
  // página se abre suelta (pestaña nueva, visita directa) esto no hace
  // nada: window.parent es la misma ventana.
  //
  // 2026-10-02: la impresión automática cumple la misma regla que el
  // botón. La página embebida REGISTRA antes de avisar "remito-listo"; si
  // el registro falla (o el envío no se imprime) avisa "remito-error" con
  // el motivo, y la ventana madre no llama a print(). El ref evita un
  // segundo registro cuando React monta el efecto dos veces (modo estricto
  // en desarrollo).
  const embebidoRef = React.useRef(false);
  React.useEffect(() => {
    if (window.parent === window || embebidoRef.current) return;
    embebidoRef.current = true;
    const avisar = (mensaje: { tipo: string; mensaje?: string }) =>
      window.parent.postMessage({ ...mensaje, numero: remito.numero }, window.location.origin);

    if (!imprimible) {
      avisar({ tipo: "remito-error", mensaje: bloqueo ?? "" });
      return;
    }
    // En una microtarea, no en el cuerpo del efecto: el registro cambia
    // estado (botón ocupado, habilitación) y eso no va sincrónico acá.
    queueMicrotask(() => {
      void registrarYHabilitar().then((r) =>
        avisar(r.ok ? { tipo: "remito-listo" } : { tipo: "remito-error", mensaje: r.mensaje })
      );
    });
    // Solo al montar: `imprimible`/`bloqueo` son los de la carga inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2026-10-02: abierta con `?imprimir=1` desde un botón "Imprimir remito"
  // (ver urlParaImprimirRemito en imprimir-remito.ts), la página hace al
  // cargar lo mismo que su botón "Imprimir": registra y, con la respuesta,
  // abre el diálogo. Una sola vez:
  // - el parámetro se saca de la URL ANTES de registrar, así recargar la
  //   pestaña o volver con el historial no registra ni imprime de nuevo;
  // - el ref evita un segundo disparo cuando React monta el efecto dos
  //   veces (modo estricto).
  // Sin el parámetro (URL escrita a mano, recarga) la página espera el
  // botón, como siempre. Embebida en el iframe del alta esto no corre: ese
  // flujo es el efecto de arriba. Si el envío no se imprime, no registra
  // nada y queda el aviso de bloqueo; si el registro falla, queda el error
  // con el botón para reintentar.
  const alAbrirRef = React.useRef(false);
  React.useEffect(() => {
    if (window.parent !== window || alAbrirRef.current) return;
    alAbrirRef.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get("imprimir") !== "1") return;
    url.searchParams.delete("imprimir");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (!imprimible) return;
    queueMicrotask(() => {
      void imprimir();
    });
    // Solo al montar, igual que el efecto de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leyenda = habilitacion ? leyendaDeReimpresion(habilitacion) : null;

  return (
    <div className="mx-auto max-w-5xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Remito #{remito.numero}</h1>
          <p className="text-sm text-muted-foreground">
            {remito.guiaDiaria ? `Guía ${remito.guiaDiaria} · ` : ""}
            {formatDateTime(remito.fechaAlta)}
          </p>
        </div>
        {imprimible ? (
          <Button onClick={imprimir} disabled={registrando} className="gap-1.5">
            {registrando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            Imprimir
          </Button>
        ) : bloqueo ? (
          <p
            role="note"
            className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground"
          >
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            {bloqueo}
          </p>
        ) : null}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive print:hidden"
        >
          <span className="block font-medium">
            No se pudo registrar la impresión del remito, así que no se imprimió.
          </span>
          <span className="block">{error}</span>
          <span className="block">Tocá Imprimir para reintentar.</span>
        </p>
      )}

      {/* Lo único que sale en papel si se imprime sin habilitación (Ctrl+P,
          menú del navegador, o un remito que no se imprime). */}
      {!habilitacion && (
        <p className="hidden p-8 text-center text-base print:block" data-aviso-impresion>
          {imprimible ? AVISO_SIN_HABILITACION : (bloqueo ?? AVISO_SIN_HABILITACION)}
        </p>
      )}

      <div
        className={
          habilitacion
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 print:hidden"
        }
        data-remito-habilitado={habilitacion ? "si" : "no"}
      >
        <Panel remito={remito} etiqueta="Original" completo leyenda={leyenda} />
        <Panel remito={remito} etiqueta="Duplicado" completo={false} leyenda={leyenda} />
      </div>
    </div>
  );
}

function Panel({
  remito,
  etiqueta,
  completo,
  leyenda,
}: {
  remito: RemitoApi;
  etiqueta: string;
  // "REIMPRESIÓN n.º N · fecha · usuario" desde la segunda impresión; null
  // en la primera (el papel sale como siempre) y mientras no hay diálogo.
  leyenda: string | null;
  // Original = se queda con la empresa y acompaña el envío por depósito:
  // lleva código de barras y el bloque de firma de entrega. Duplicado = se
  // lo lleva el cliente en el momento del alta, antes de que exista ninguna
  // firma de entrega real — a pedido explícito (feedback de backend/revisión
  // 2026-09-15): omitir a propósito código de barras y firmas en esta copia,
  // para que no se escanee ni se firme por error una copia que no corresponde.
  completo: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm print:break-inside-avoid print:rounded-none print:border-black print:p-3">
      <div className="flex items-start justify-between gap-2 border-b pb-2 print:border-black">
        <div>
          <p className="font-semibold">{remito.empresa.nombre}</p>
          <p className="text-xs text-muted-foreground print:text-black">
            {remito.empresa.direccion}
          </p>
          <p className="text-xs text-muted-foreground print:text-black">
            {remito.empresa.telefono}
          </p>
        </div>
        <span className="rounded border px-2 py-0.5 text-xs font-medium print:border-black">
          {etiqueta}
        </span>
      </div>

      {leyenda && (
        <p className="border border-dashed px-2 py-1 text-center text-xs font-semibold print:border-black print:text-black">
          {leyenda}
        </p>
      )}

      {/* Número de seguimiento + código de barras: antes iban en la misma
          fila (número a la izquierda, barra a la derecha) y el código de
          barras se salía de su recuadro y tapaba el panel de al lado (ver
          comentario en Barcode39 — bug del 2026-09-16). Ahora van apilados:
          el número/guía/fecha arriba, sin competir por ancho con nada, y el
          código de barras abajo en su propia fila, con un alto fijo chico y
          ancho acotado para que entre cómodo dentro de la columna. */}
      {/* Tamaño agrandado (2026-09-28): "ancho acotado" de arriba quedó en
          max-w-[220px] por las dudas cuando el código todavía compartía
          fila con el número -- ya apilado en su propia fila, ese límite no
          compite por espacio con nada y lo dejaba mucho más chico de lo
          que la columna realmente permite. Un CODE 39 de 10 dígitos recién
          decodifica de forma confiable con margen real por encima de
          ~220px de ancho EFECTIVO en la imagen que procesa la cámara (lo
          medí generando el mismo código y decodificándolo con la misma
          config de ZXing que usa el scanner) -- a 220px justo, cualquier
          variación de encuadre, foco o ángulo del celular lo empuja para
          el lado que no lee (reportado en vivo 2026-09-28: "lo logré hacer
          andar 1 vez y después no" / "que ocupe el ancho del contenedor,
          es que muy pequeño no lee eso nomás"). Se saca el `max-w` y se
          deja que ocupe el 100% del ancho real de la columna (`w-full`,
          controlado por el padre) -- ya no hay nada con quien compartir
          ese ancho, así que no hay motivo para acotarlo por debajo de lo
          que el layout deja disponible. */}
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1 whitespace-nowrap font-mono text-lg font-semibold">
          #{remito.numero}
          <CopyButton value={remito.numero} label="Número de envío" />
        </p>
        {/* `guiaDiaria` es nullable en el contrato (RemitoDeEnvioDto): un
            envío sin guía asignada no imprime "Guía" suelto -- queda solo
            el remito manual, o nada si tampoco lo tiene. */}
        {(remito.guiaDiaria || remito.remitoManualNumero) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground print:text-black">
            <span>
              {[
                remito.guiaDiaria ? `Guía ${remito.guiaDiaria}` : null,
                remito.remitoManualNumero ? `Remito manual ${remito.remitoManualNumero}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {remito.remitoManualNumero && (
              <CopyButton value={remito.remitoManualNumero} label="Remito manual" />
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground print:text-black">
          {formatDateTime(remito.fechaAlta)}
        </p>
        {completo && (
          <Barcode39
            value={remito.codigoBarras}
            // `preserveAspectRatio="xMidYMid meet"` (ver Barcode39) escala
            // el dibujo para que entre en el recuadro sin desbordar, atado
            // al eje mas chico -- si el alto de este recuadro fuera muy
            // bajo relativo al ancho del contenedor, terminaria limitando
            // el ANCHO real del codigo por debajo de lo que el contenedor
            // permite (el problema que se busca resolver con w-full de
            // arriba). El codigo tiene una proporcion fija ~7.1:1
            // (390x55 nativo de jsbarcode); h-20/print:h-14 le dan bastante
            // mas alto del que ese ancho jamas necesitaria, asi que en la
            // practica siempre queda atado al ANCHO -- ocupa el 100% del
            // contenedor tanto en pantalla como al imprimir.
            className="mt-1 h-20 w-full print:h-14"
          />
        )}
      </div>

      {/* Destino grande y destacado — no es decoración: el depósito ordena
          los envíos por localidad de destino a simple vista, igual que en
          el sistema anterior (el destacado ahí no era estético). Antes esto
          quedaba perdido dentro del bloque chico de "Destinatario". */}
      <div className="rounded bg-primary/10 px-3 py-2 text-center print:border print:border-black print:bg-transparent">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground print:text-black">
          Destino
        </p>
        <p className="text-xl font-bold leading-tight print:text-black">
          {remito.destino.localidad}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-2 print:border-black">
        <div>
          <p className="text-xs font-medium text-muted-foreground print:text-black">
            Remitente ({remito.origen.localidad})
          </p>
          <p className="font-medium">{remito.remitente.nombre}</p>
          <p className="text-xs print:text-black">{remito.remitente.domicilio}</p>
          <p className="text-xs print:text-black">{remito.remitente.telefono}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground print:text-black">
            Destinatario ({remito.destino.localidad})
          </p>
          <p className="font-medium">{remito.destinatario.nombre}</p>
          <p className="text-xs print:text-black">{remito.destinatario.domicilio}</p>
          {/* Referencia del domicilio (p.ej. "casa verde frente a la
              plaza") -- solo del destinatario, en su propio renglón debajo
              del domicilio y un punto más chica: el domicilio va en
              text-xs (12px = 9pt), esto en 8pt. Solo se pinta si trae
              texto: con null, vacío o un backend que todavía no manda el
              campo no queda renglón en blanco. `break-words` para que una
              referencia larga corte en varias líneas en vez de salirse de
              la columna al imprimir. */}
          {remito.destinatario.referencia?.trim() && (
            <p className="break-words text-[8pt] leading-tight print:text-black">
              <span className="text-muted-foreground print:text-black">Ref.: </span>
              {remito.destinatario.referencia.trim()}
            </p>
          )}
          <p className="text-xs print:text-black">{remito.destinatario.telefono}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-2 text-xs print:border-black">
        <p>
          <span className="text-muted-foreground print:text-black">Tipo: </span>
          {TIPO_LABEL[remito.tipo] ?? remito.tipo}
        </p>
        <p>
          <span className="text-muted-foreground print:text-black">Bultos: </span>
          {remito.cantidadBultos}
        </p>
        {remito.pagoServicio && (
          <p>
            <span className="text-muted-foreground print:text-black">Pago: </span>
            {LUGAR_LABEL[remito.pagoServicio.lugar] ?? remito.pagoServicio.lugar} ·{" "}
            {FORMA_LABEL[remito.pagoServicio.forma] ?? remito.pagoServicio.forma}
          </p>
        )}
        <p>
          <span className="text-muted-foreground print:text-black">Levantó: </span>
          {remito.levanto}
        </p>
        {remito.valorDeclarado && (
          <p>
            <span className="text-muted-foreground print:text-black">V/D: </span>
            {money(remito.valorDeclarado)}
          </p>
        )}
        {remito.observaciones && (
          <p className="col-span-2">
            <span className="text-muted-foreground print:text-black">Contenido: </span>
            {remito.observaciones}
          </p>
        )}
      </div>

      {/* Desglose de flete/contra reembolso/gasto — el backend ya lo manda
          en /remito pero antes no se mostraba, solo los 3 totales de abajo.
          Contra reembolso es nullable (solo aplica a envíos "efectivo"); flete
          y gasto siempre vienen, aunque sean "0.00". */}
      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs print:border-black">
        <p>
          <span className="text-muted-foreground print:text-black">Flete: </span>
          {money(remito.flete)}
        </p>
        {remito.contrarreembolso !== null && (
          <p>
            <span className="text-muted-foreground print:text-black">Contra reembolso: </span>
            {money(remito.contrarreembolso)}
          </p>
        )}
        <p>
          <span className="text-muted-foreground print:text-black">Gasto: </span>
          {money(remito.gasto)}
        </p>
      </div>

      {/* CONTRATO-2026-09-24-01 / BUG-2026-09-24-02: hasta el 2026-09-24
          esto mostraba `total` en vez de `aCobrar` cuando habia contra
          reembolso, porque el backend viejo mandaba aCobrar en 0 en ese
          caso. Con la formula nueva del backend (2026-09-24, commit
          5492bd6) importes.aCobrar YA trae el contrarreembolso sumado --
          ese parche quedo redundante (coincidia con el valor correcto de
          casualidad) y ademas enmascaraba el campo real. Se saca en el
          mismo deploy que el resto de los ajustes de este contrato.
          La regla cambio de nuevo el 2026-10-01 (backend main a9c2e6f): el
          gasto lo cobra quien entrega, asi que con pago en origen cobrado
          = flete y aCobrar = gasto + CRR (antes cobrado = flete + gasto).
          Detalle por lugar de pago en RemitoApi (envios.ts). Aca no cambia
          nada: los tres importes se pintan tal como llegan. */}
      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center print:border-black">
        <div>
          <p className="text-xs text-muted-foreground print:text-black">Cobrado</p>
          <p className="font-semibold">{money(remito.importes.cobrado)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground print:text-black">A cobrar</p>
          <p className="font-semibold">{money(remito.importes.aCobrar)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground print:text-black">Total</p>
          <p className="font-semibold">{money(remito.importes.total)}</p>
        </div>
      </div>

      {/* Bloque de firma de entrega — SOLO en la copia "Original" (ver nota
          en `completo` arriba). Son campos en blanco para completar a mano
          al momento de la entrega, no hay estos datos en el alta. "Levantó"
          ya se muestra arriba con dato real; acá van los 5 campos que
          faltaban del sistema anterior: hora y fecha de entrega, y quién
          entregó/recibió (entregó + aclaración + firma + DNI) — restaurados
          a pedido explícito de revisión (2026-09-15): "la boleta es la
          prueba de entrega, y este cambio es sobre trazabilidad". */}
      {completo ? (
        <div className="mt-2 border-t pt-3 text-xs print:border-black">
          {/* Antes el renglón punteado quedaba pegado al texto de abajo
              (pt-1 nomás) — no dejaba espacio en blanco arriba para
              completar a mano. El usuario lo notó imprimiendo un remito
              real: "para poner la fecha no hay espacio" (2026-09-16). El
              espacio en blanco para escribir va ARRIBA de cada renglón
              punteado (pt-6/pt-7 en vez de pt-1) — el renglón + la
              etiqueta de abajo quedan como referencia de qué va ahí. */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Hora y fecha
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Entregó
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Aclaración
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              Firma
            </div>
            <div className="border-t border-dashed pt-7 text-muted-foreground print:border-black print:text-black">
              DNI
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 border-t pt-3 text-center text-xs text-muted-foreground print:border-black print:text-black">
          Gracias por elegirnos
        </div>
      )}
    </div>
  );
}
