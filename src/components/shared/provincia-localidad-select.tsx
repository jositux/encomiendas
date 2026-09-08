"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LOCALIDADES_BY_PROVINCIA } from "@/lib/mock/localidades";
import type { Provincia } from "@/types";

const PROVINCIAS: Provincia[] = ["MISIONES", "CORRIENTES", "CHACO"];

export function ProvinciaLocalidadSelect({
  provincia,
  localidadId,
  onChangeProvincia,
  onChangeLocalidad,
  idPrefix,
}: {
  provincia: Provincia;
  localidadId: string;
  onChangeProvincia: (p: Provincia) => void;
  onChangeLocalidad: (id: string) => void;
  idPrefix: string;
}) {
  const localidades = LOCALIDADES_BY_PROVINCIA[provincia] ?? [];

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-localidad`} className="text-xs text-muted-foreground">
          Localidad
        </Label>
        <Select value={localidadId} onValueChange={onChangeLocalidad}>
          <SelectTrigger id={`${idPrefix}-localidad`} className="w-full">
            <SelectValue placeholder="Localidad" />
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
        <Label htmlFor={`${idPrefix}-provincia`} className="text-xs text-muted-foreground">
          Provincia
        </Label>
        <Select
          value={provincia}
          onValueChange={(v) => onChangeProvincia(v as Provincia)}
        >
          <SelectTrigger id={`${idPrefix}-provincia`} className="w-full">
            <SelectValue placeholder="Provincia" />
          </SelectTrigger>
          <SelectContent>
            {PROVINCIAS.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
