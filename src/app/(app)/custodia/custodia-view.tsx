"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, PackageSearch, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { UBICACION_VARIANT, ubicacionEnPalabras } from "@/lib/ubicacion";
import type {
  CustodioApi,
  EnvioEnCustodiaApi,
  PaginaDeEnviosEnCustodia,
} from "@/server/services/custodia";
import { PERSONA_MIOS, urlDeCustodia } from "./custodia-url";

// La guía real (letra+número, ej. "C1") que usa el negocio en mostrador
// viene en guiaDiaria — no en `numero` (correlativo interno). Mismo criterio
// que nueva-view.tsx (confirmado en vivo ahí).
function guiaDeEnvio(e: EnvioEnCustodiaApi): string {
  return e.guiaDiaria ?? e.numero ?? e.id?.slice(0, 8) ?? "—";
}

function fechaDeAlta(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface OpcionDePersona {
  value: string;
  label: string;
}

// El selector depende de lo que el backend dice que este usuario puede ver
// (`alcance`); acá no se recalcula esa regla:
//   - "propio": sin selector, la lista ya es solo lo suyo.
//   - "base":   Míos / De la base (por defecto) / una persona.
//   - "todo":   Todos (por defecto) / una persona.
// Las personas y sus cantidades salen de GET /custodia/custodios.
export function opcionesDePersona(
  alcance: PaginaDeEnviosEnCustodia["alcance"],
  custodios: CustodioApi[],
  usuarioId: string,
  seleccion: string,
  // `total` de la lista sin filtro: es el número de "Todos".
  totalSinFiltro: number
): OpcionDePersona[] {
  if (alcance === "propio") return [];

  const persona = (c: CustodioApi) => ({
    value: c.usuario.id,
    label: `${c.usuario.nombre} (${c.cantidad})`,
  });

  let opciones: OpcionDePersona[];
  if (alcance === "base") {
    const mios = custodios.find((c) => c.usuario.id === usuarioId)?.cantidad ?? 0;
    opciones = [
      { value: PERSONA_MIOS, label: `Míos (${mios})` },
      { value: "", label: "De la base" },
      ...custodios.filter((c) => c.usuario.id !== usuarioId).map(persona),
    ];
  } else {
    opciones = [{ value: "", label: `Todos (${totalSinFiltro})` }, ...custodios.map(persona)];
  }

  // Una persona elegida por URL que hoy no tiene nada no figura entre los
  // custodios: se agrega para que el selector muestre lo que está filtrado.
  if (!opciones.some((o) => o.value === seleccion)) {
    opciones.push({ value: seleccion, label: "Persona sin envíos (0)" });
  }
  return opciones;
}

export function CustodiaView({
  envios,
  custodios,
  totalSinFiltro,
  usuarioId,
  seleccion,
  error,
}: {
  // null solo cuando el backend rechazó el pedido (ver `error`).
  envios: PaginaDeEnviosEnCustodia | null;
  custodios: CustodioApi[];
  // Total de la lista sin filtro de persona (el "Todos (n)" del selector).
  totalSinFiltro: number;
  usuarioId: string;
  // El valor de `?persona=`: "", "mios" o el id de una persona.
  seleccion: string;
  error?: { title: string; message: string };
}) {
  const router = useRouter();
  const [navegando, startTransition] = React.useTransition();

  function irA(persona: string, pagina: number) {
    startTransition(() => router.push(urlDeCustodia(persona, pagina)));
  }

  if (!envios) {
    return (
      <div>
        <Encabezado />
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <div role="alert">
              <p className="text-sm font-medium">{error?.title ?? "No se pudo cargar Custodia"}</p>
              {error?.message && <p className="text-sm text-muted-foreground">{error.message}</p>}
            </div>
            <Button asChild variant="outline">
              <Link href="/custodia">Volver a la lista</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { datos, total, limite, offset, alcance } = envios;
  const opciones = opcionesDePersona(alcance, custodios, usuarioId, seleccion, totalSinFiltro);
  const soloLoMio = alcance === "propio" || seleccion === PERSONA_MIOS;
  const pagina = Math.floor(offset / limite) + 1;
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = offset + datos.length;

  return (
    <div>
      <Encabezado />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {soloLoMio
            ? `Tenés ${total} envío${total === 1 ? "" : "s"} en custodia`
            : `${total} envío${total === 1 ? "" : "s"} en custodia`}
        </p>
        {opciones.length > 0 && (
          <div className="grid gap-1.5">
            <Label htmlFor="custodia-persona" className="text-xs text-muted-foreground">
              Quién los tiene
            </Label>
            <select
              id="custodia-persona"
              value={seleccion}
              onChange={(e) => irA(e.target.value, 1)}
              className="h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {opciones.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {datos.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={soloLoMio ? "No tenés envíos en custodia" : "No hay envíos en custodia"}
        />
      ) : (
        <div className={cn("rounded-lg border", navegando && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guía / número</TableHead>
                <TableHead>Remitente → Destinatario</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Dónde está</TableHead>
                <TableHead>Quién lo tiene</TableHead>
                <TableHead>Punto</TableHead>
                <TableHead>Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <span className="font-mono font-semibold">#{guiaDeEnvio(e)}</span>
                    {/* Sin guía diaria el número ya es lo que se ve arriba:
                        no se repite. */}
                    {e.guiaDiaria && (
                      <span className="block font-mono text-xs text-muted-foreground">
                        {e.numero}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.remitenteNombre ?? "—"} → {e.destinatarioNombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{e.localidadDestinoNombre}</TableCell>
                  <TableCell>
                    <Badge variant={UBICACION_VARIANT[e.ubicacion] ?? "outline"}>
                      {ubicacionEnPalabras(e.ubicacion)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="gap-1">
                      <UserCheck className="size-3" /> {e.custodia.usuario.nombre}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {e.custodia.punto ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        {e.custodia.punto.nombre}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fechaDeAlta(e.creadoEn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginación real: cada página se pide al backend (`limite`/`offset`);
          no hay más filas en memoria que las que se ven. */}
      {total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {datos.length > 0 ? `Mostrando ${desde}–${hasta} de ${total}` : `${total} en total`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={navegando || pagina <= 1}
              onClick={() => irA(seleccion, pagina - 1)}
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {pagina}</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={navegando || hasta >= total}
              onClick={() => irA(seleccion, pagina + 1)}
            >
              Siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Encabezado() {
  return (
    <PageHeader
      title="Custodia"
      description="Los envíos que están en custodia de una persona ahora: quién los tiene y dónde."
    />
  );
}
