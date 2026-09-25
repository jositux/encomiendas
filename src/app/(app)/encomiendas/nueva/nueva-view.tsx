"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/format";

import { PageHeader } from "@/components/shared/page-header";
import { ClienteAltaRapidaDialog } from "@/components/clientes/cliente-alta-rapida-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnvioApi } from "@/server/services/envios";
import type { SectorApi } from "@/server/services/sectores";
import type { ClienteApi } from "@/server/services/clientes";
import type { LocalidadBackend, SesionUsuario } from "@/types";

import {
  LUGARES_PAGO,
  FORMAS_PAGO,
  emptyOrigen,
  emptyDestino,
  guiaDeEnvio,
  type OrigenState,
  type DestinoState,
} from "./nueva-view.helpers";

import { CargaRapidaView } from "./carga-rapida-view";
import { AltaIndividualView } from "./alta-individual-view";



export function NuevaEncomiendaView({
  localidades,
  sectores,
  envios,
  session,
}: {
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  envios: EnvioApi[];
  session: SesionUsuario | null;
}) {
  const [modo, setModo] = React.useState<"individual" | "rapida">("individual");

  const [origen, setOrigen] = React.useState<OrigenState>(emptyOrigen());
  // NOTA-2026-09-22-01: alta rápida de cliente — qué bloque abrió el modal
  // (o null si está cerrado). Un solo modal compartido entre origen y
  // destino, precargado según cuál esté activo.
  const [altaRapidaBloque, setAltaRapidaBloque] = React.useState<"origen" | "destino" | null>(
    null
  );
  const [destino, setDestino] = React.useState<DestinoState>(() =>
    emptyDestino(localidades, sectores)
  );

  // NOTA-2026-09-22-01: el cliente creado o elegido en el modal de alta
  // rápida se asocia al bloque que lo abrió — mismo shape que
  // onSelectCliente de ClienteSearchInput en cada bloque (abajo), así que
  // el resultado se ve igual sin importar si vino de tipear+buscar o del
  // atajo del botón "+".
  function handleClienteAltaRapida(cliente: ClienteApi) {
    if (altaRapidaBloque === "origen") {
      setOrigen({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        clienteId: cliente.id,
        calle: cliente.calle ?? "",
        numero: cliente.numero ?? "",
        piso: cliente.piso ?? "",
        referencia: cliente.referencia ?? "",
        localidadId: cliente.localidadId ?? origen.localidadId,
      });
    } else if (altaRapidaBloque === "destino") {
      setDestino({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        calle: cliente.calle ?? "",
        numero: cliente.numero ?? "",
        piso: cliente.piso ?? "",
        referencia: cliente.referencia ?? "",
        localidadId: cliente.localidadId ?? destino.localidadId,
        sectorId: cliente.sectorId ?? destino.sectorId,
        clienteId: cliente.id,
      });
    }
  }

  const [cargados, setCargados] = React.useState<EnvioApi[]>(envios);




  return (
    <div>
      <PageHeader
        title="Nueva encomienda"
        description={
          modo === "individual"
            ? "Cargá una encomienda nueva con los datos de origen y destino."
            : "Elegí un remitente fijo y cargá varios destinos, uno por uno."
        }
        actions={
          <div className="inline-flex gap-1 rounded-md bg-muted p-1">
            <button
              type="button"
              onClick={() => setModo("individual")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === "individual"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setModo("rapida")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === "rapida"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Carga rápida
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {modo === "individual" ? (
          <AltaIndividualView
            origen={origen}
            setOrigen={setOrigen}
            destino={destino}
            setDestino={setDestino}
            setAltaRapidaBloque={setAltaRapidaBloque}
            setCargados={setCargados}
            session={session}
            localidades={localidades}
            sectores={sectores}
          />
        ) : (
          <CargaRapidaView
            origen={origen}
            setOrigen={setOrigen}
            setAltaRapidaBloque={setAltaRapidaBloque}
            setModo={setModo}
            setCargados={setCargados}
            session={session}
            localidades={localidades}
            sectores={sectores}
          />
        )}

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Envíos recientes ({cargados.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            {cargados.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no cargaste ninguna encomienda.
              </p>
            )}
            <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
              {cargados.slice(0, 12).map((e) => (
                <div key={e.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      #{guiaDeEnvio(e)}
                      <CopyButton value={guiaDeEnvio(e)} label="Número" />
                    </span>
                    {e.estadoActual && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {e.estadoActual}
                      </span>
                    )}
                  </div>
                  {e.remitoManualNumero && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      N° de sistema: <span className="font-mono">{e.numero}</span>
                      <CopyButton value={e.numero} label="Número de sistema" />
                    </p>
                  )}
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {e.remitenteNombre ?? "—"} → {e.destinatarioNombre ?? "—"}
                  </p>
                  {/* NOTA chofer 2026-09-24: forma de pago (y el monto contra
                      reembolso cuando aplica) visibles de un vistazo en la
                      lista, sin tener que abrir el remito — para que el
                      chofer no se confunda con lo que tiene que cobrar. */}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Pago:{" "}
                    {LUGARES_PAGO.find((l) => l.value === e.lugarPago)?.label ?? e.lugarPago} ·{" "}
                    {FORMAS_PAGO.find((f) => f.value === e.formaPago)?.label ?? e.formaPago}
                    {e.tipo === "efectivo" && e.contrarreembolsoImporte && (
                      <> · Contra reembolso: {formatCurrency(Number(e.contrarreembolsoImporte))}</>
                    )}
                  </p>
                  <a
                    href={`/remito/${encodeURIComponent(e.numero)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Printer className="size-3.5" /> Imprimir remito
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ClienteAltaRapidaDialog
        // Cambia de "origen"/"destino"/"cerrado" en cada apertura -> fuerza
        // remount, que es lo que le da al draft interno del modal su
        // estado inicial fresco sin necesitar un useEffect (ver comentario
        // en cliente-alta-rapida-dialog.tsx).
        key={altaRapidaBloque ?? "cerrado"}
        open={altaRapidaBloque !== null}
        onOpenChange={(next) => {
          if (!next) setAltaRapidaBloque(null);
        }}
        localidades={localidades}
        nombreInicial={altaRapidaBloque === "origen" ? origen.nombre : destino.nombre}
        telefonoInicial={altaRapidaBloque === "origen" ? origen.telefono : destino.telefono}
        calleInicial={altaRapidaBloque === "origen" ? origen.calle : destino.calle}
        localidadIdInicial={
          altaRapidaBloque === "origen" ? origen.localidadId : destino.localidadId
        }
        onClienteListo={handleClienteAltaRapida}
      />
    </div>
  );
}
