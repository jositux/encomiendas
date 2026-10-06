"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackageCheck, ScanBarcode, Volume2, VolumeX } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BarcodeScannerDialog } from "@/components/shared/barcode-scanner-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  leyendaDelModo,
  modoListo,
  modosDisponibles,
  resumenDeTanda,
  type Lectura,
} from "./recepcion-tanda";
import {
  SelectorDeModo,
  type GrupoDeSectores,
  type RecorridoOfrecido,
} from "./selector-de-modo";
import { HistorialDeTanda, ResumenDeLaTanda, UltimoResultado } from "./resultados-de-tanda";
import { useTanda } from "./use-tanda";

// Recepción (rediseño del 2026-10-02). Una pantalla de escaneo pensada para
// decenas de paquetes seguidos con un lector de mano:
//
// - Modo fijo por tanda (SelectorDeModo): Sólo recibir, Cambiar sector o
//   Reservar recorrido. Se elige una vez y después solo se escanea.
// - El modo activo se lee en grande arriba del campo.
// - Cada lectura entra a una cola (useTanda): ninguna se pierde ni se pisa
//   aunque el lector vaya más rápido que el backend, y el campo conserva el
//   foco.
// - El último resultado en un bloque grande, con su color y su sonido;
//   abajo el resumen y el historial de la tanda, con Deshacer por fila.
// - La tanda se guarda en el navegador y se cierra con "Nueva tanda".
//
// Reemplaza a la pantalla anterior, que buscaba el envío y después lo
// recibía (dos llamadas), sin destino, sin sonido y con un historial que se
// perdía al recargar.
interface Props {
  permisos: string[];
  usuarioId: string;
  sectores: GrupoDeSectores[];
  recorridos: RecorridoOfrecido[];
}

const suscribirANada = () => () => {};

export function RecepcionView(props: Props) {
  // La tanda sale de lo guardado en el navegador, que en el servidor no
  // existe: se monta recién en el cliente, para que el primer render de los
  // dos lados coincida.
  const enElNavegador = React.useSyncExternalStore(
    suscribirANada,
    () => true,
    () => false
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Recepción"
        description="Elegí qué hace cada lectura y escaneá los paquetes uno tras otro."
      />
      {enElNavegador ? <TandaDeRecepcion {...props} /> : null}
    </div>
  );
}

function TandaDeRecepcion({ permisos, usuarioId, sectores, recorridos }: Props) {
  const {
    tanda,
    recibe,
    ultima,
    deshaciendoId,
    leer,
    cambiarModo,
    reintentar,
    deshacer,
    nuevaTanda,
    alternarSilencio,
  } = useTanda({ permisos, usuarioId });
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [faltaElegir, setFaltaElegir] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const enfocar = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const disponibles = modosDisponibles(permisos);
  const { modo } = tanda;

  if (!modo) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Tu usuario no tiene permiso para recibir envíos ni para asignarles sector o ruta.
        </CardContent>
      </Card>
    );
  }

  const resumen = resumenDeTanda(tanda);
  const listo = modoListo(modo);

  // El campo no es controlado a propósito: se lee y se vacía en el mismo
  // evento del Enter, así la ráfaga siguiente del lector arranca siempre en
  // un campo limpio, sin depender de un render.
  function tomarLectura(texto: string) {
    if (inputRef.current) inputRef.current.value = "";
    setFaltaElegir(!leer(texto));
    enfocar();
  }

  async function alDeshacer(lectura: Lectura) {
    const motivo = await deshacer(lectura);
    if (motivo) toast.error("No se pudo deshacer", { description: motivo });
    enfocar();
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <SelectorDeModo
            modo={modo}
            disponibles={disponibles}
            sectores={sectores}
            recorridos={recorridos}
            mostrarBase={!recibe}
            onCambiar={(nuevo) => {
              cambiarModo(nuevo);
              setFaltaElegir(false);
              if (modoListo(nuevo)) enfocar();
            }}
          />

          <p
            aria-live="polite"
            data-modo-listo={listo ? "si" : "no"}
            className={
              listo
                ? "text-2xl font-bold leading-tight sm:text-3xl"
                : "text-2xl font-bold leading-tight text-muted-foreground sm:text-3xl"
            }
          >
            {leyendaDelModo(modo, recibe)}
          </p>

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              autoComplete="off"
              aria-label="Número, remito o código de barras del envío"
              placeholder="Escaneá o escribí el número"
              className="h-11 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") tomarLectura(e.currentTarget.value);
              }}
              // Un clic en un lugar vacío de la pantalla no le saca el foco
              // al campo: el lector tiene que seguir escribiendo ahí. Sí lo
              // toman los controles de verdad (selectores, botones).
              onBlur={(e) => {
                if (!e.relatedTarget) enfocar();
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              onClick={() => setScannerOpen(true)}
              aria-label="Escanear con la cámara"
              title="Escanear con la cámara"
            >
              <ScanBarcode className="size-4" />
            </Button>
            <Button
              type="button"
              className="h-11 shrink-0 gap-1.5"
              onClick={() => tomarLectura(inputRef.current?.value ?? "")}
            >
              <PackageCheck className="size-4" />
              {recibe ? "Recibir" : "Aplicar"}
            </Button>
          </div>

          {faltaElegir && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {modo.tipo === "sector"
                ? "Elegí primero el sector: esa lectura no se tomó."
                : "Elegí primero la ruta: esa lectura no se tomó."}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span aria-live="polite">
              {resumen.enCola > 0
                ? `${resumen.enCola} lectura${resumen.enCola === 1 ? "" : "s"} en cola`
                : "Sin lecturas en cola"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              aria-pressed={tanda.silencio}
              onClick={() => {
                alternarSilencio();
                enfocar();
              }}
            >
              {tanda.silencio ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              {tanda.silencio ? "Sonido apagado" : "Sonido encendido"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <UltimoResultado lectura={ultima} />

      {tanda.lecturas.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Esta tanda</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resumen.enCola > 0}
                onClick={() => {
                  nuevaTanda();
                  setFaltaElegir(false);
                  enfocar();
                }}
              >
                Nueva tanda
              </Button>
            </div>
            <ResumenDeLaTanda resumen={resumen} />
            <HistorialDeTanda
              lecturas={tanda.lecturas}
              deshaciendoId={deshaciendoId}
              onDeshacer={alDeshacer}
              onReintentar={(id) => {
                reintentar(id);
                enfocar();
              }}
            />
          </CardContent>
        </Card>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={(abierto) => {
          setScannerOpen(abierto);
          if (!abierto) enfocar();
        }}
        onScan={(valor) => {
          setScannerOpen(false);
          // El código de barras del remito trae el número sin guión; el
          // backend lo acepta así, no hace falta reconstruirlo.
          tomarLectura(valor);
        }}
        title="Escanear remito"
        description="Apuntá la cámara al código de barras del remito."
      />
    </>
  );
}
