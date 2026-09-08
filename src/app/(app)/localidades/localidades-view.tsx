"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Search, MapPin } from "lucide-react";

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
import { createLocalidadAction, updateLocalidadAction } from "@/server/actions";
import type { Localidad, Provincia } from "@/types";

export function LocalidadesView({ localidades }: { localidades: Localidad[] }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [provincia, setProvincia] = React.useState<Provincia>("MISIONES");
  const [submitting, setSubmitting] = React.useState(false);

  const filtered = localidades.filter((l) =>
    l.nombre.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCreate() {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre de la localidad.");
      return;
    }
    setSubmitting(true);
    try {
      await createLocalidadAction({
        nombre: nombre.toUpperCase(),
        provincia,
        corte: false,
        despachaSabados: false,
      });
      toast.success("Localidad agregada");
      setNombre("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Localidades"
        description={`${localidades.length} localidades de cobertura.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="size-4" /> Nueva localidad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva localidad</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
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

      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar localidad..."
          className="pl-8"
        />
      </div>

      <div className="max-h-[65vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Localidad</TableHead>
              <TableHead>Provincia</TableHead>
              <TableHead>Corte</TableHead>
              <TableHead>Despacha sábados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="flex items-center gap-2 font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {l.nombre}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{l.provincia}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={l.corte}
                    onCheckedChange={(v) => updateLocalidadAction(l.id, { corte: v })}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={l.despachaSabados}
                    onCheckedChange={(v) => updateLocalidadAction(l.id, { despachaSabados: v })}
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
