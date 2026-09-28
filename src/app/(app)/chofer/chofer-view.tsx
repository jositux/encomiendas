"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackageCheck, Loader2, Search, ScanBarcode } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BarcodeScannerDialog } from "@/components/shared/barcode-scanner-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarPlanillaPorCodigoAction, recibirEnvioSueltoAction, buscarSeguimientoAction } from "@/server/actions";
import {
  BuscadorPlanillaPorCodigo,
  PlanillaDetalle,
  EnvioDePlanillaRow,
  guiaCorta,
  envioApiComoFilaDePlanilla,
} from "@/components/custodia/planilla-parts";
import type { PlanillaApi } from "@/server/services/custodia";
import type { EnvioApi } from "@/server/services/envios";

// NOTA-2026-09-28-03: "Buscar planilla por código" y "Buscar planilla"
// (búsqueda de planilla + su detalle con Cargar/Recibir y las acciones por
// envío) se extrajeron a src/components/custodia/planilla-parts.tsx --
// esta pantalla las reusa tal cual, junto con la pantalla nueva
// /planillas (rol operador). Lo único exclusivo del chofer que queda acá
// es BuscadorEnvioSuelto (dos pasos: Buscar, después Recibir/Entregar/
// Intento/Incidencia -- distinto del flujo de un solo clic de /recepcion),
// renombrado de "Buscar envío suelto" a "Recibir paquete" (solo el
// título -- el comportamiento no cambia, según la nota).
export function ChoferView({
  permisos,
  usuarioId,
}: {
  // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): se
  // pasa hacia abajo a PlanillaDetalle y EnvioDePlanillaRow para gatear en
  // la UI los botones de Cargar/Recibir (`custodia:registrar`) y
  // Entregar/Intento/Incidencia (`entregas:registrar`) — mismo patrón
  // `puedeAccion()` que ya usa seguimiento-view.tsx. Antes de esto, esos 5
  // botones se mostraban siempre habilitados sin importar el permiso
  // real, y el usuario recién se enteraba de que le faltaba al clickear y
  // recibir el toast de error del backend.
  permisos: string[];
  // 2026-09-17 (sección 31 del plan): para decidir en BuscadorEnvioSuelto
  // si un envío EN_CUSTODIA ya está en mi custodia (mostrar Entregar/
  // Intento/Incidencia) o en la de otro (mostrar Recibir).
  usuarioId: string;
}) {
  const [planillaActiva, setPlanillaActiva] = React.useState<PlanillaApi | null>(null);

  async function buscarPorCodigo(codigo: string): Promise<boolean> {
    const r = await buscarPlanillaPorCodigoAction(codigo);
    if (!r.ok) {
      toast.error(r.title, { description: r.message });
      return false;
    }
    const data = r.data!;
    setPlanillaActiva((prev) =>
      // Confirmado en vivo el 2026-09-17: apenas la planilla pasa a
      // "recibida" (POST /custodia/recepcion), GET /planillas deja de
      // devolver sus envíos (pasan a seguimiento individual, ya sueltos de
      // la planilla). Si no conserváramos la última lista no vacía, la UI
      // perdería la referencia a esos envíos justo cuando hace falta
      // entregarlos/marcar intento o incidencia uno por uno — se mantiene
      // la lista anterior cuando el backend ya no la manda.
      prev && prev.id === data.id && data.envios.length === 0 && prev.envios.length > 0
        ? { ...data, envios: prev.envios }
        : data
    );
    return true;
  }

  // Única fuente de `planillaActiva` hoy es la búsqueda por código (ver
  // nota 2026-09-28 más abajo), así que refrescar es simplemente repetir
  // esa misma búsqueda.
  async function refrescarActiva() {
    if (!planillaActiva) return;
    await buscarPorCodigo(planillaActiva.codigoCorto);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chofer"
        description="Cargar y recibir planillas, y registrar entregas, intentos fallidos e incidencias por envío."
      />

      {/* 2026-09-28: la búsqueda secundaria "por Despacho + Localidad" (para
          quien tuviera `despachos:leer`/`geografia:leer`, permisos de
          oficina) se sacó de esta pantalla a pedido explícito del usuario
          ("ocultar de la página de chofer lo de despacho y localidad") --
          con el landing por rol ya resuelto (NOTA-2026-09-28-01), supervisor
          y administración tienen su propia pantalla (/despachos,
          /deposito) y no necesitan este atajo secundario acá; para un
          chofer real (sin esos permisos) nunca se mostraba de todos modos.
          NOTA-2026-09-28-03: esa misma búsqueda ahora vive en /planillas,
          la pantalla nueva del operador -- reconstruida en ese archivo a
          partir de este mismo código (ver el diff del commit que la sacó
          de acá). El único punto de entrada a una planilla en esta
          pantalla es BuscadorPlanillaPorCodigo, justo abajo. */}
      <BuscadorPlanillaPorCodigo
        onBuscar={(codigo) => buscarPorCodigo(codigo)}
      />

      {planillaActiva && (
        <PlanillaDetalle planilla={planillaActiva} onRefrescar={refrescarActiva} permisos={permisos} />
      )}

      <BuscadorEnvioSuelto permisos={permisos} usuarioId={usuarioId} />
    </div>
  );
}

// Los 3 estados en los que puede estar un envío suelto que este buscador
// necesita distinguir (ver sección 31 del plan): REGISTRADO/EN_CUSTODIA-de-
// otro (se puede "Recibir"), EN_CUSTODIA-mío (Entregar/Intento/Incidencia,
// igual que un envío de planilla), o un estado terminal (ENTREGADO/
// CONFIRMADO/ANULADO, sin ninguna acción posible acá).
function BuscadorEnvioSuelto({
  permisos,
  usuarioId,
}: {
  permisos: string[];
  // 2026-09-17 (sección 31 del plan): para saber si `custodiaActualUsuarioId`
  // del envío encontrado soy yo (Entregar/Intento/Incidencia) u otro
  // usuario/nadie (Recibir).
  usuarioId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  // Se guarda el envío completo (no el recorte EnvioDePlanillaApi de antes)
  // porque acá hace falta estadoActual/custodiaActualUsuarioId para decidir
  // qué mostrar — envioApiComoFilaDePlanilla() se sigue usando recién al
  // pasarlo a EnvioDePlanillaRow, que no necesita esos campos.
  const [envio, setEnvio] = React.useState<(EnvioApi & { etiquetas: string[] }) | null>(null);
  const [noEncontrado, setNoEncontrado] = React.useState(false);
  const [recibiendo, setRecibiendo] = React.useState(false);
  // Mismo permiso que Cargar/Recibir planilla — el backend no distingue
  // "recibir una planilla" de "recibir un envío suelto", los dos van por
  // POST /custodia/recepcion y piden custodia:registrar (confirmado por el
  // equipo de backend, sección 31).
  const puedeRecibir = permisos.includes("custodia:registrar");

  async function buscar(valorOverride?: string) {
    const texto = (valorOverride ?? query).trim();
    if (!texto) return;
    setBuscando(true);
    setNoEncontrado(false);
    setEnvio(null);
    try {
      const r = await buscarSeguimientoAction(texto);
      if (r.ok) {
        setEnvio(r.data.envio);
      } else if (r.notFound) {
        setNoEncontrado(true);
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setBuscando(false);
    }
  }

  // El código de barras (Code 39) impreso en el remito codifica
  // `RemitoApi.codigoBarras`, que el propio backend documenta como "numero
  // SIN el guion" (ver Barcode39/jsbarcode y la sección 13 del plan de
  // integración) -- ej. numero "000000009-3" se imprime como "0000000093".
  // Para volver a buscarlo hay que deshacer exactamente esa transformación
  // (nunca al revés: sacar el guion), insertando el guion antes del último
  // dígito -- el dígito verificador siempre es el último carácter del
  // numero real, sea cual sea la cantidad de dígitos del correlativo.
  function numeroDesdeCodigoBarras(codigo: string): string {
    const digitos = codigo.replace(/\D/g, "");
    if (digitos.length < 2) return digitos;
    return `${digitos.slice(0, -1)}-${digitos.slice(-1)}`;
  }

  // Se usa el valor leído directo (ya convertido a `numero`), sin esperar a
  // que `query` se actualice -- mismo criterio que ya usa
  // BuscadorPlanillaPorCodigo con su QR.
  function handleScan(valor: string) {
    setScannerOpen(false);
    const numero = numeroDesdeCodigoBarras(valor);
    setQuery(numero);
    buscar(numero);
  }

  async function recibir() {
    if (!envio) return;
    setRecibiendo(true);
    try {
      const r = await recibirEnvioSueltoAction(envio.numero);
      if (r.ok) {
        toast.success(r.data.evento.duplicado ? "Ya estaba en tu custodia" : "Envío recibido");
        await buscar();
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setRecibiendo(false);
    }
  }

  const estado = envio?.estadoActual;
  const enMiCustodia = estado === "EN_CUSTODIA" && envio?.custodiaActualUsuarioId === usuarioId;
  const puedeSerRecibido = estado === "REGISTRADO" || (estado === "EN_CUSTODIA" && !enMiCustodia);
  const estadoFinal = estado === "ENTREGADO" || estado === "CONFIRMADO" || estado === "ANULADO";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div>
          {/* NOTA-2026-09-28-03: "Buscar envío suelto" -> "Recibir paquete"
              (solo el título, el comportamiento no cambia). Como
              /chofer-minimal reusa este mismo componente, el renombre
              aparece también ahí. */}
          <h3 className="font-semibold">Recibir paquete</h3>
          <p className="text-sm text-muted-foreground">
            Para recibir, entregar, marcar intento fallido o incidencia de un envío que ya no
            aparece en ninguna planilla (por número, remito o guía).
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: 000000009-3 o A17"
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear código de barras del remito"
            title="Escanear código de barras"
          >
            <ScanBarcode className="size-4" />
          </Button>
          <Button onClick={() => buscar()} disabled={buscando || !query.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
        {noEncontrado && <p className="text-sm text-muted-foreground">No se encontró ningún envío.</p>}

        {envio && puedeSerRecibido && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-mono text-sm font-semibold">#{guiaCorta(envio.numero)}</p>
              <p className="text-sm">
                {envio.destinatarioNombre} · {envio.cantidadBultos} bulto
                {envio.cantidadBultos === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">
                {estado === "EN_CUSTODIA"
                  ? "En custodia de otro usuario — \"Recibir acá\" te lo transfiere a este punto."
                  : "Registrado, todavía sin custodia — \"Recibir acá\" lo toma para este punto."}
              </p>
            </div>
            {puedeRecibir && (
              <Button size="sm" className="gap-1.5" disabled={recibiendo} onClick={recibir}>
                {recibiendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                Recibir acá
              </Button>
            )}
          </div>
        )}

        {envio && enMiCustodia && (
          <EnvioDePlanillaRow
            envio={envioApiComoFilaDePlanilla(envio)}
            onRefrescar={async () => buscar()}
            permisos={permisos}
          />
        )}

        {envio && estadoFinal && (
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-mono text-sm font-semibold">#{guiaCorta(envio.numero)}</p>
              <p className="text-sm">
                {envio.destinatarioNombre} · {envio.cantidadBultos} bulto
                {envio.cantidadBultos === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="outline">{estado}</Badge>
          </div>
        )}
      </CardContent>
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title="Escanear remito"
        description="Apuntá la cámara al código de barras del remito."
      />
    </Card>
  );
}
