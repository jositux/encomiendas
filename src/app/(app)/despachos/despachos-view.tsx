"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Scissors, Loader2, Printer, PackageX } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearDespachoAction } from "@/server/actions";
import type { RecorridoBackend, VehiculoBackend } from "@/types";
import type { UsuarioApi } from "@/server/services/usuarios";
import type { PlanillaGenerada } from "@/server/services/custodia";

// Feature A del pedido "Cortar / Crear despacho" (2026-09-18, sección 32 del
// plan de integración). El corte (POST /despachos) reparte la carga
// pendiente de la base del recorrido elegido en una planilla por sector de
// destino. `vehiculoId`/`choferId` son overrides opcionales — sin tocarlos
// no se mandan, y el backend usa los predeterminados del recorrido (que acá
// se muestran como texto informativo, no como valor inicial de los combos:
// mandar el mismo id que el default no es necesario ni distinto de no
// mandar nada).
export function DespachosView({
  recorridos,
  sinRecorridosPorAlcance,
  vehiculos,
  usuarios,
  permisos,
}: {
  recorridos: RecorridoBackend[];
  // 2026-09-18 (Nota 3): true cuando `recorridos` viene vacío porque el
  // usuario no es `esGlobal` y ninguno de los recorridos activos sale de
  // una base en su `puntosEnAlcance` — a diferencia de que simplemente no
  // haya ningún recorrido activo en todo el sistema.
  sinRecorridosPorAlcance: boolean;
  vehiculos: VehiculoBackend[];
  usuarios: UsuarioApi[];
  // 2026-09-18: gatea el botón "Cortar / Declarar salida" — confirmado en
  // vivo que POST /despachos pide `despachos:crear` (403 real con
  // chofer_obera). Mismo patrón puedeAccion() que el resto de la app.
  permisos: string[];
}) {
  const puedeCortar = permisos.includes("despachos:crear");
  // Nota 3 (2026-09-18): `recorridos` ya llega acotado a `puntosEnAlcance`
  // desde page.tsx (o completo si el usuario es `esGlobal`). Acá solo se
  // decide si vale la pena mostrar la base en la etiqueta de cada opción:
  // con un solo depósito en juego es redundante, pero si el combo mezcla
  // más de una base (usuario global, o con varios puntos en alcance) hace
  // falta que quede claro desde dónde sale cada recorrido.
  const mostrarBase = React.useMemo(
    () => new Set(recorridos.map((r) => r.baseId)).size > 1,
    [recorridos]
  );
  const [recorridoId, setRecorridoId] = React.useState(recorridos[0]?.id ?? "");
  const [vehiculoId, setVehiculoId] = React.useState<string | null>(null);
  const [choferId, setChoferId] = React.useState<string | null>(null);
  const [cortando, setCortando] = React.useState(false);
  const [resultado, setResultado] = React.useState<{ planillas: PlanillaGenerada[] } | null>(null);

  const recorrido = recorridos.find((r) => r.id === recorridoId) ?? null;

  async function cortar() {
    if (!recorridoId) return;
    setCortando(true);
    setResultado(null);
    try {
      const r = await crearDespachoAction({
        recorridoId,
        vehiculoId: vehiculoId ?? undefined,
        choferId: choferId ?? undefined,
      });
      if (r.ok) {
        setResultado({ planillas: r.data.planillas });
        const n = r.data.planillas.length;
        toast.success(n > 0 ? `${n} planilla${n === 1 ? "" : "s"} generada${n === 1 ? "" : "s"}` : "Corte realizado");
      } else {
        toast.error(r.title, { description: r.message });
      }
    } finally {
      setCortando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Despachos"
        description="Cortar la carga pendiente de la base en planillas, por recorrido."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {recorridos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {sinRecorridosPorAlcance
                ? "No hay recorridos activos que salgan de tu base. Pedí que te asignen a la base correspondiente, o cortá desde una cuenta con acceso a esa base."
                : "No hay recorridos activos. Creá uno en Rutas antes de cortar un despacho."}
            </p>
          ) : (
            <>
              <div className="grid gap-1.5 sm:max-w-sm">
                <Label>Recorrido</Label>
                <Select
                  value={recorridoId}
                  onValueChange={(v) => {
                    setRecorridoId(v);
                    setVehiculoId(null);
                    setChoferId(null);
                    setResultado(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un recorrido" />
                  </SelectTrigger>
                  <SelectContent>
                    {recorridos.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {mostrarBase ? `${r.nombre} · ${r.baseNombre}` : r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recorrido && (
                <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Vehículo predeterminado: </span>
                    {recorrido.vehiculoNombre ?? "sin asignar"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Chofer predeterminado: </span>
                    {recorrido.choferNombre ?? "sin asignar"}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Vehículo (opcional, si hoy lo cubre otro)</Label>
                  <Select
                    value={vehiculoId ?? "default"}
                    onValueChange={(v) => setVehiculoId(v === "default" ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Usar el predeterminado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Usar el predeterminado</SelectItem>
                      {vehiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nombre}
                          {v.patente ? ` (${v.patente})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Chofer (opcional, si hoy lo cubre otro)</Label>
                  <Select
                    value={choferId ?? "default"}
                    onValueChange={(v) => setChoferId(v === "default" ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Usar el predeterminado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Usar el predeterminado</SelectItem>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {puedeCortar ? (
                <div>
                  <Button onClick={cortar} disabled={cortando || !recorridoId} className="gap-1.5">
                    {cortando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Scissors className="size-4" />
                    )}
                    Cortar / Declarar salida
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tu usuario no tiene permiso para cortar despachos.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h3 className="font-semibold">Resultado del corte</h3>
            {resultado.planillas.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PackageX className="size-4" />
                El camión sale vacío: no había carga pendiente para este recorrido.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resultado.planillas.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 rounded-md border p-3">
                    <span className="font-mono text-lg font-semibold">{p.codigoCorto}</span>
                    <span className="text-xs text-muted-foreground">{p.codigoQr}</span>
                    <span className="text-sm">
                      {p.envios} envío{p.envios === 1 ? "" : "s"}
                    </span>
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link href={`/planilla/${encodeURIComponent(p.codigoCorto)}`} target="_blank">
                        <Printer className="size-4" />
                        Imprimir
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
