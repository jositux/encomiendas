"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Search, MapPin, Pencil } from "lucide-react";

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
import type { LocalidadBackend } from "@/types";
import type { ProvinciaApi } from "@/server/services/provincias";

// `embedded` la usa la pestaña "Localidades" de Geografía: mismo componente,
// sin el título de página propio (Geografía ya tiene el suyo), con el botón
// de alta en una barra más liviana en vez del PageHeader.
export function LocalidadesView({
  localidades,
  provincias,
  embedded = false,
}: {
  localidades: LocalidadBackend[];
  provincias: ProvinciaApi[];
  embedded?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [toEdit, setToEdit] = React.useState<LocalidadBackend | null>(null);

  const filtered = localidades.filter((l) =>
    l.nombre.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{localidades.length} localidades de cobertura.</p>
          <LocalidadFormDialog provincias={provincias} />
        </div>
      ) : (
        <PageHeader
          title="Localidades"
          description={`${localidades.length} localidades de cobertura.`}
          actions={<LocalidadFormDialog provincias={provincias} />}
        />
      )}

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
              <TableHead className="w-10" />
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
                  <Badge variant="outline">{l.provinciaNombre}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setToEdit(l)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {toEdit && (
        <LocalidadFormDialog
          provincias={provincias}
          localidad={toEdit}
          open={!!toEdit}
          onOpenChange={(v) => !v && setToEdit(null)}
        />
      )}
    </div>
  );
}

// Mismo diálogo para alta y edición (mismo criterio que
// cliente-form-dialog.tsx): sin prop `localidad` crea, con `localidad`
// edita — precargado, llama a `updateLocalidadAction` en vez de
// `createLocalidadAction`. El backend real confirma PATCH /localidades/{id}
// (ver el comentario de localidades.ts) — a diferencia de Provincias/
// Sectores, acá no hace falta reconfirmar nada, ya estaba conectado, solo
// faltaba la UI de edición.
function LocalidadFormDialog({
  provincias,
  localidad,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  provincias: ProvinciaApi[];
  localidad?: LocalidadBackend;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const esEdicion = !!localidad;
  const [openUncontrolled, setOpenUncontrolled] = React.useState(false);
  const open = openControlled ?? openUncontrolled;
  const [nombre, setNombre] = React.useState(localidad?.nombre ?? "");
  const [provinciaId, setProvinciaId] = React.useState(
    localidad?.provinciaId ?? provincias[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = React.useState(false);

  function setOpen(next: boolean) {
    if (next) {
      setNombre(localidad?.nombre ?? "");
      setProvinciaId(localidad?.provinciaId ?? provincias[0]?.id ?? "");
    }
    onOpenChangeControlled?.(next);
    setOpenUncontrolled(next);
  }

  async function handleSubmit() {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre de la localidad.");
      return;
    }
    if (!provinciaId) {
      toast.error("Elegí una provincia.");
      return;
    }
    setSubmitting(true);
    try {
      const resultado =
        esEdicion && localidad
          ? await updateLocalidadAction(localidad.id, {
              nombre: nombre.toUpperCase(),
              provinciaId,
            })
          : await createLocalidadAction({
              nombre: nombre.toUpperCase(),
              provinciaId,
            });
      if (!resultado.ok) {
        toast.error(resultado.title, { description: resultado.message });
        return;
      }
      toast.success(esEdicion ? "Localidad actualizada" : "Localidad agregada");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la localidad.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {openControlled === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-1.5">
            <Plus className="size-4" /> Nueva localidad
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar localidad" : "Nueva localidad"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Provincia</Label>
            <Select value={provinciaId} onValueChange={setProvinciaId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provincias.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {esEdicion ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
