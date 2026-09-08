"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSucursalAction, updateSucursalAction } from "@/server/actions";
import type { Provincia, Sucursal } from "@/types";

export function SucursalesView({ sucursales }: { sucursales: Sucursal[] }) {
  const [open, setOpen] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [provincia, setProvincia] = React.useState<Provincia>("MISIONES");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleCreate() {
    if (!nombre.trim() || !codigo.trim()) {
      toast.error("Completá nombre y código.");
      return;
    }
    setSubmitting(true);
    try {
      await createSucursalAction({
        nombre,
        codigo,
        participaCorte: false,
        procesarHastaHora: 0,
        color: "#94a3b8",
        provincia,
      });
      toast.success("Sucursal creada");
      setNombre("");
      setCodigo("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Sucursales"
        description="Bases y depósitos donde opera la empresa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="size-4" /> Nueva sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva sucursal</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Código</Label>
                  <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Provincia</Label>
                  <Select value={provincia} onValueChange={(v) => setProvincia(v as Provincia)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MISIONES">Misiones</SelectItem>
                      <SelectItem value="CORRIENTES">Corrientes</SelectItem>
                      <SelectItem value="CHACO">Chaco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Color</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Participa del corte</TableHead>
              <TableHead>Procesar hasta las</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sucursales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateSucursalAction(s.id, { color: e.target.value })}
                    className="size-7 cursor-pointer rounded border p-0.5"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <Input
                      defaultValue={s.nombre}
                      className="h-8 max-w-52"
                      onBlur={(e) =>
                        e.target.value !== s.nombre &&
                        updateSucursalAction(s.id, { nombre: e.target.value })
                      }
                    />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {s.codigo}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={s.participaCorte}
                    onCheckedChange={(v) => updateSucursalAction(s.id, { participaCorte: v })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={s.procesarHastaHora}
                    className="h-8 w-20"
                    onBlur={(e) =>
                      updateSucursalAction(s.id, { procesarHastaHora: Number(e.target.value) || 0 })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
