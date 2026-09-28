"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackageCheck, Loader2, ScanBarcode } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BarcodeScannerDialog } from "@/components/shared/barcode-scanner-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarSeguimientoAction, recibirEnvioSueltoAction } from "@/server/actions";
import { guiaCorta } from "@/components/custodia/planilla-parts";

// NOTA-2026-09-28-03 (menús por rol): pantalla nueva del operador,
// pensada para el flujo de un solo clic ("el operador tipea/escanea y
// aprieta un botón, sin un paso intermedio de 'Buscar' y después
// 'Recibir'") — distinta de BuscadorEnvioSuelto en /chofer, que sigue
// siendo el flujo de dos pasos (buscar, y recién ahí decidir entre
// Recibir/Entregar/Intento/Incidencia según el estado). Acá un solo botón
// busca el envío (buscarSeguimientoAction, mismo endpoint que Seguimiento)
// y, si corresponde, llama directo a recibirEnvioSueltoAction (POST
// /custodia/recepcion) — sin mostrar un resultado intermedio para
// confirmar. El historial es solo de esta sesión de pantalla (en memoria,
// se pierde al recargar) — no hay pedido de un historial persistente
// (eso necesitaría un endpoint nuevo del backend, fuera de alcance de
// esta nota).
type VarianteBadge = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

interface FilaHistorial {
  id: string;
  hora: string;
  query: string;
  numero?: string;
  destinatario?: string;
  bultos?: number;
  resultado: { label: string; variant: VarianteBadge };
}

export function RecepcionView({
  permisos,
  usuarioId,
}: {
  permisos: string[];
  // 2026-09-17 (sección 31 del plan), mismo criterio que BuscadorEnvioSuelto
  // en /chofer: para saber si `custodiaActualUsuarioId` del envío
  // encontrado soy yo (no hace falta recibir de nuevo) u otro/nadie (sí
  // corresponde recibir).
  usuarioId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [procesando, setProcesando] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [historial, setHistorial] = React.useState<FilaHistorial[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mismo permiso que Cargar/Recibir planilla y BuscadorEnvioSuelto — el
  // backend no distingue "recibir una planilla" de "recibir un envío
  // suelto", los dos van por POST /custodia/recepcion y piden
  // custodia:registrar.
  const puedeRecibir = permisos.includes("custodia:registrar");

  function agregarHistorial(fila: Omit<FilaHistorial, "id" | "hora">) {
    setHistorial((prev) => [
      {
        ...fila,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
      ...prev,
    ]);
  }

  function refocus() {
    // Después de cada intento el input se limpia y vuelve a tomar foco,
    // para que el operador pueda encadenar escaneos/números sin tocar el
    // mouse (pedido explícito de la nota: "un solo click").
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function procesar(valorOverride?: string) {
    const texto = (valorOverride ?? query).trim();
    if (!texto || procesando) return;
    setProcesando(true);
    try {
      const r = await buscarSeguimientoAction(texto);
      if (!r.ok) {
        if (r.notFound) {
          agregarHistorial({ query: texto, resultado: { label: "No encontrado", variant: "outline" } });
        } else {
          toast.error(r.title, { description: r.message });
          agregarHistorial({ query: texto, resultado: { label: r.title, variant: "destructive" } });
        }
        return;
      }

      const envio = r.data.envio;
      const estado = envio.estadoActual;
      const base = {
        query: texto,
        numero: envio.numero,
        destinatario: envio.destinatarioNombre,
        bultos: envio.cantidadBultos,
      };
      const enMiCustodia = estado === "EN_CUSTODIA" && envio.custodiaActualUsuarioId === usuarioId;
      const esRecibible = estado === "REGISTRADO" || (estado === "EN_CUSTODIA" && !enMiCustodia);

      if (enMiCustodia) {
        agregarHistorial({ ...base, resultado: { label: "Ya estaba en tu custodia", variant: "secondary" } });
        return;
      }

      if (!esRecibible) {
        // ENTREGADO / CONFIRMADO / ANULADO: ningún estado terminal admite
        // una nueva recepción — se muestra el estado como motivo, igual
        // que hace BuscadorEnvioSuelto en /chofer.
        agregarHistorial({ ...base, resultado: { label: estado, variant: "outline" } });
        return;
      }

      if (!puedeRecibir) {
        agregarHistorial({
          ...base,
          resultado: { label: "Sin permiso para recibir", variant: "destructive" },
        });
        return;
      }

      const res = await recibirEnvioSueltoAction(envio.numero);
      if (!res.ok) {
        toast.error(res.title, { description: res.message });
        agregarHistorial({ ...base, resultado: { label: res.title, variant: "destructive" } });
        return;
      }

      agregarHistorial({
        ...base,
        resultado: res.data.evento.duplicado
          ? { label: "Ya estaba en tu custodia", variant: "secondary" }
          : { label: "Recibido", variant: "success" },
      });
    } finally {
      setProcesando(false);
      setQuery("");
      refocus();
    }
  }

  // Mismo criterio que numeroDesdeCodigoBarras en BuscadorEnvioSuelto
  // (/chofer): el código de barras del remito codifica el número SIN el
  // guion (confirmado con el backend) — hay que reinsertarlo antes del
  // dígito verificador (siempre el último carácter) para volver al número
  // real.
  function numeroDesdeCodigoBarras(codigo: string): string {
    const digitos = codigo.replace(/\D/g, "");
    if (digitos.length < 2) return digitos;
    return `${digitos.slice(0, -1)}-${digitos.slice(-1)}`;
  }

  function handleScan(valor: string) {
    setScannerOpen(false);
    const numero = numeroDesdeCodigoBarras(valor);
    setQuery(numero);
    procesar(numero);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recepción"
        description="Escaneá o escribí el número, remito o guía y recibí el envío en un solo paso."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: 000000009-3 o A17"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && procesar()}
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
            <Button onClick={() => procesar()} disabled={procesando || !query.trim()} className="gap-1.5">
              {procesando ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
              Recibir
            </Button>
          </div>
          {!puedeRecibir && (
            <p className="text-sm text-muted-foreground">
              Tu usuario puede buscar, pero no tiene permiso para recibir envíos.
            </p>
          )}
        </CardContent>
      </Card>

      {historial.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground">Historial de esta sesión</h3>
            <div className="flex flex-col gap-2">
              {historial.map((fila) => (
                <div
                  key={fila.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{fila.hora}</p>
                    <p className="font-mono text-sm font-semibold">
                      #{fila.numero ? guiaCorta(fila.numero) : fila.query}
                    </p>
                    {fila.destinatario && (
                      <p className="text-sm">
                        {fila.destinatario}
                        {fila.bultos != null && (
                          <> · {fila.bultos} bulto{fila.bultos === 1 ? "" : "s"}</>
                        )}
                      </p>
                    )}
                  </div>
                  <Badge variant={fila.resultado.variant}>{fila.resultado.label}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title="Escanear remito"
        description="Apuntá la cámara al código de barras del remito."
      />
    </div>
  );
}
