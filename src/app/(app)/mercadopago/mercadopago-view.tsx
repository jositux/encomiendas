"use client";

import * as React from "react";
import { toast } from "sonner";
import { CreditCard, Eye, EyeOff, RefreshCcw, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MovimientoCrr } from "@/types";

export function MercadoPagoView({ movimientosCrr }: { movimientosCrr: MovimientoCrr[] }) {
  const [conectado, setConectado] = React.useState(true);
  const [cobrarCrr, setCobrarCrr] = React.useState(true);
  const [showToken, setShowToken] = React.useState(false);

  const cobrados = movimientosCrr.filter((m) => m.estado !== "PENDIENTE").slice(0, 10);
  const token = "APP_USR-3457812093-090711-a1b2c3d4e5f6";

  function regenerar() {
    toast.success("Se generó un nuevo access token (demo)");
  }

  return (
    <div>
      <PageHeader
        title="Mercado Pago"
        description="Cobros digitales y conciliación de pagos con contra reembolso."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#00b1ea]/15 text-[#009ee3]">
                    <CreditCard className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Cuenta conectada</CardTitle>
                    <CardDescription>Neo Encomiendas S.R.L.</CardDescription>
                  </div>
                </div>
                <Badge variant={conectado ? "success" : "outline"} className="gap-1">
                  {conectado && <CheckCircle2 className="size-3" />}
                  {conectado ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="conectado" className="text-sm font-normal">
                  Integración activa
                </Label>
                <Switch id="conectado" checked={conectado} onCheckedChange={setConectado} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cobrar-crr" className="text-sm font-normal">
                  Permitir cobrar CRR con Mercado Pago
                </Label>
                <Switch id="cobrar-crr" checked={cobrarCrr} onCheckedChange={setCobrarCrr} />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Access token</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={showToken ? "text" : "password"}
                    value={token}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowToken((v) => !v)}
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 w-fit gap-1.5"
                  onClick={regenerar}
                >
                  <RefreshCcw className="size-3.5" /> Regenerar token
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumen del mes</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cobrado vía MP</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(cobrados.reduce((a, m) => a + m.monto, 0))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Comisión estimada (5.5%)</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(cobrados.reduce((a, m) => a + m.monto, 0) * 0.055)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimos cobros conciliados</CardTitle>
            <CardDescription>Movimientos de CRR asociados a un pago digital.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Remito</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cobrados.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">#{m.remito}</TableCell>
                    <TableCell className="max-w-36 truncate">{m.cliente}</TableCell>
                    <TableCell>{formatDate(m.fecha)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(m.monto)}
                    </TableCell>
                  </TableRow>
                ))}
                {cobrados.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Todavía no hay cobros conciliados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
