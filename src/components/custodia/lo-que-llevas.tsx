"use client";

import { Loader2, PackageOpen } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ResultadoEnviosEnCustodia } from "@/server/services/custodia";
import type { LocalidadBackend } from "@/types";

// "Lo que llevás" (2026-10-02): los envíos que están en custodia de quien
// mira la pantalla del chofer. Hasta acá el chofer no tenía ninguna lista:
// buscaba una planilla o un envío por vez. Es solo lectura -- las acciones
// (entregar, intento fallido, recibir) siguen donde estaban, en la planilla
// y en "Recibir paquete".
export function LoQueLlevas({
  estado,
  localidades,
  actualizando,
}: {
  // La página que devolvió GET /custodia/envios, o el rechazo del backend
  // si no se pudo leer.
  estado: ResultadoEnviosEnCustodia;
  localidades: LocalidadBackend[];
  actualizando: boolean;
}) {
  const localidadNombre = (id: string) => localidades.find((l) => l.id === id)?.nombre ?? "—";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Lo que llevás
            {estado.ok && (
              <span className="ml-2 font-normal text-muted-foreground">
                {estado.data.total} envío{estado.data.total === 1 ? "" : "s"}
              </span>
            )}
          </h2>
          {actualizando && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Actualizando" />
          )}
        </div>

        {!estado.ok ? (
          <div role="alert" className="text-sm">
            <p className="font-medium">{estado.title}</p>
            <p className="text-muted-foreground">{estado.message}</p>
          </div>
        ) : estado.data.datos.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageOpen className="size-4" /> No tenés envíos en custodia.
          </p>
        ) : (
          <>
            <ul className="flex flex-col divide-y rounded-md border">
              {estado.data.datos.map((e) => (
                <li key={e.id} className="flex flex-col gap-0.5 p-3">
                  <p className="font-mono text-sm font-semibold">#{e.numero}</p>
                  <p className="text-sm">{e.destinatarioNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.destinatarioCalle} {e.destinatarioNumero ?? ""}
                    {e.destinatarioPiso ? ` · ${e.destinatarioPiso}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {localidadNombre(e.localidadDestinoId)}
                  </p>
                </li>
              ))}
            </ul>
            {estado.data.total > estado.data.datos.length && (
              <p className="text-xs text-muted-foreground">
                Se muestran los primeros {estado.data.datos.length} de {estado.data.total}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
