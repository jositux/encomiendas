"use client";

import * as React from "react";
import { toast } from "sonner";
import { Wallet, Save, RefreshCcw } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GastoListEditor } from "@/components/cajas/gasto-list-editor";
import { createCierreCajaAction } from "@/server/actions";
import { formatCurrency } from "@/lib/format";
import type { Encomienda, ItemGasto, Personal } from "@/types";

const DENOMINACIONES_BASE = [20000, 10000, 2000, 1000, 500, 200, 100];

export function CierreCajaView({
  personal,
  encomiendas,
  defaultPersonalId,
}: {
  personal: Personal[];
  encomiendas: Encomienda[];
  defaultPersonalId: string;
}) {
  const [personalId, setPersonalId] = React.useState(defaultPersonalId);

  const [entregasRemito, setEntregasRemito] = React.useState(0);
  const [entregasFlete, setEntregasFlete] = React.useState(0);
  const [entregasCrr, setEntregasCrr] = React.useState(0);
  const [levantesRemito, setLevantesRemito] = React.useState(0);
  const [levantesFlete, setLevantesFlete] = React.useState(0);
  const [soloEntrega, setSoloEntrega] = React.useState(0);

  const [gastosBase, setGastosBase] = React.useState<ItemGasto[]>([]);
  const [gastoCliente, setGastoCliente] = React.useState<ItemGasto[]>([]);
  const [otrasCobranzas, setOtrasCobranzas] = React.useState<ItemGasto[]>([]);
  const [denominaciones, setDenominaciones] = React.useState(
    DENOMINACIONES_BASE.map((nominacion) => ({ nominacion, cantidad: 0 }))
  );

  const misEncomiendasHoy = React.useMemo(
    () =>
      encomiendas.filter((e) => {
        const hoy = new Date().toDateString();
        return (
          e.designadoId === personalId &&
          (new Date(e.fechaAlta).toDateString() === hoy ||
            (e.fechaFinalizado && new Date(e.fechaFinalizado).toDateString() === hoy))
        );
      }),
    [encomiendas, personalId]
  );

  function sugerir() {
    const entregadas = misEncomiendasHoy.filter((e) => e.estado === "ENTREGADA");
    setEntregasRemito(entregadas.length);
    setEntregasFlete(entregadas.reduce((a, e) => a + (e.fleteCobrado ? e.flete : 0), 0));
    setEntregasCrr(entregadas.reduce((a, e) => a + (e.crrCobrado ? e.montoCrr ?? 0 : 0), 0));
    const levantadas = misEncomiendasHoy.filter((e) => e.estado !== "PENDIENTE");
    setLevantesRemito(levantadas.length);
    setLevantesFlete(levantadas.reduce((a, e) => a + e.flete, 0));
    toast.success("Valores sugeridos según encomiendas de hoy");
  }

  const totalGastosBase = gastosBase.reduce((a, i) => a + i.importe, 0);
  const totalGastoCliente = gastoCliente.reduce((a, i) => a + i.importe, 0);
  const totalOtras = otrasCobranzas.reduce((a, i) => a + i.importe, 0);
  const efectivoRendido = denominaciones.reduce((a, d) => a + d.cantidad * d.nominacion, 0);

  const resumen = {
    fletesDestino: entregasFlete,
    fletesOrigen: levantesFlete,
    totalCrr: entregasCrr,
    otrasCobranzas: totalOtras,
    gastoCliente: totalGastoCliente,
    gastosBase: totalGastosBase,
  };
  const totalARendir =
    resumen.fletesDestino +
    resumen.fletesOrigen +
    resumen.totalCrr +
    resumen.otrasCobranzas -
    resumen.gastoCliente -
    resumen.gastosBase;
  const diferencia = efectivoRendido - totalARendir;

  async function guardarCierre() {
    if (!personalId) return;
    await createCierreCajaAction({
      personalId,
      fecha: new Date().toISOString(),
      entregasCobradas: { remito: entregasRemito, flete: entregasFlete, crr: entregasCrr },
      levantes: { remito: levantesRemito, flete: levantesFlete },
      soloEntrega,
      gastosBase,
      gastoCliente,
      otrasCobranzas,
      denominaciones,
      efectivoRendido,
      estado: "CERRADA",
    });
    toast.success("Cierre de caja guardado");
  }

  return (
    <div>
      <PageHeader
        title="Cierre de caja"
        description="Rendición diaria de un repartidor: entregas cobradas, gastos y efectivo rendido."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={sugerir}>
            <RefreshCcw className="size-3.5" /> Sugerir desde encomiendas
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Repartidor</Label>
                <Select value={personalId} onValueChange={setPersonalId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personal.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.apellidoNombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Fecha</Label>
                <Input value={new Date().toLocaleDateString("es-AR")} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entregas cobradas y levantes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <NumberField label="Entregas · remitos" value={entregasRemito} onChange={setEntregasRemito} />
              <NumberField label="Entregas · flete" value={entregasFlete} onChange={setEntregasFlete} money />
              <NumberField label="Entregas · CRR" value={entregasCrr} onChange={setEntregasCrr} money />
              <NumberField label="Levantes · remitos" value={levantesRemito} onChange={setLevantesRemito} />
              <NumberField label="Levantes · flete" value={levantesFlete} onChange={setLevantesFlete} money />
              <NumberField label="Solo entrega" value={soloEntrega} onChange={setSoloEntrega} />
            </CardContent>
          </Card>

          <GastoListEditor
            title="Gastos base"
            tone="amber"
            items={gastosBase}
            onChange={setGastosBase}
            conceptos={["Viático", "Nafta", "Comisión", "Peaje", "Gomería", "Lavadero", "Repuestos", "Otros"]}
          />
          <GastoListEditor
            title="Gasto cliente"
            tone="emerald"
            items={gastoCliente}
            onChange={setGastoCliente}
            conceptos={["CRR armado", "Gasto cliente realizado", "Cheque", "Ticket"]}
          />
          <GastoListEditor
            title="Otras cobranzas"
            tone="rose"
            items={otrasCobranzas}
            onChange={setOtrasCobranzas}
            conceptos={["Cambio recibido", "Cuenta corriente cobrada", "Préstamo recupero", "Faltante remito"]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Efectivo rendido — arqueo de billetes</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {denominaciones.map((d, idx) => (
                <div key={d.nominacion} className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">${d.nominacion}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={d.cantidad}
                    onChange={(e) => {
                      const next = [...denominaciones];
                      next[idx] = { ...d, cantidad: Number(e.target.value) || 0 };
                      setDenominaciones(next);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="size-4" /> Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 px-4 text-sm">
            <ResumenRow label="Fletes destino" value={resumen.fletesDestino} />
            <ResumenRow label="Fletes origen" value={resumen.fletesOrigen} />
            <ResumenRow label="Total CRR" value={resumen.totalCrr} />
            <ResumenRow label="Otras cobranzas" value={resumen.otrasCobranzas} />
            <ResumenRow label="Gasto cliente" value={-resumen.gastoCliente} />
            <ResumenRow label="Gastos base" value={-resumen.gastosBase} />
            <Separator className="my-1" />
            <ResumenRow label="Total a rendir" value={totalARendir} bold />
            <ResumenRow label="Efectivo rendido" value={efectivoRendido} bold />
            <Separator className="my-1" />
            <ResumenRow
              label="Diferencia"
              value={diferencia}
              bold
              tone={diferencia === 0 ? "success" : diferencia > 0 ? "info" : "destructive"}
            />

            <Button className="mt-4 gap-1.5" onClick={guardarCierre}>
              <Save className="size-4" /> Guardar cierre
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  money,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  money?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      {money && (
        <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
      )}
    </div>
  );
}

function ResumenRow({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "success" | "destructive" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "info"
          ? "text-info"
          : "";
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${toneClass}`}>{formatCurrency(value)}</span>
    </div>
  );
}
