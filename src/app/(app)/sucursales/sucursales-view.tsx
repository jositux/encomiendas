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
import { Badge } from "@/components/ui/badge";
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
import type { PuntoBackend, LocalidadBackend } from "@/types";

// `embedded` la usa la pestaña "Puntos / Sucursales" de Geografía: mismo
// componente, sin el título de página propio (Geografía ya tiene el suyo),
// con el botón de alta en una barra más liviana en vez del PageHeader.
export function SucursalesView({
  sucursales,
  localidades,
  embedded = false,
}: {
  sucursales: PuntoBackend[];
  localidades: LocalidadBackend[];
  embedded?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [localidadId, setLocalidadId] = React.useState(localidades[0]?.id ?? "");
  const [tipo, setTipo] = React.useState<PuntoBackend["tipo"]>("base");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleCreate() {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre.");
      return;
    }
    if (!localidadId) {
      toast.error("Elegí una localidad.");
      return;
    }
    setSubmitting(true);
    try {
      await createSucursalAction({ nombre, localidadId, tipo });
      toast.success("Sucursal creada");
      setNombre("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const nuevaSucursalDialog = (
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
            <Label>Localidad</Label>
            <Select value={localidadId} onValueChange={setLocalidadId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localidades.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as PuntoBackend["tipo"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="deposito">Depósito</SelectItem>
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
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {sucursales.length} puntos entre bases y depósitos.
          </p>
          {nuevaSucursalDialog}
        </div>
      ) : (
        <PageHeader
          title="Sucursales"
          description="Bases y depósitos donde opera la empresa."
          actions={nuevaSucursalDialog}
        />
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Localidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Activa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sucursales.map((s) => (
              <TableRow key={s.id}>
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
                    {s.esCasaCentral && <Badge variant="outline">Casa central</Badge>}
                    {s.esDepositoCentral && <Badge variant="outline">Depósito central</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.localidadId}
                    onValueChange={(v) => v !== s.localidadId && updateSucursalAction(s.id, { localidadId: v })}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {localidades.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.tipo}
                    onValueChange={(v) =>
                      v !== s.tipo && updateSucursalAction(s.id, { tipo: v as PuntoBackend["tipo"] })
                    }
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={s.activo}
                    onCheckedChange={(v) => updateSucursalAction(s.id, { activo: v })}
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
