"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { LocalidadBackend } from "@/types";
import type { SectorApi } from "@/server/services/sectores";

// Reemplaza a ProvinciaLocalidadSelect (que sigue mockeado y lo usa la
// pantalla de Clientes, todavia no migrada) para el destinatario de Nueva
// Encomienda: el backend real no tiene "provincia" en el domicilio del
// envio, tiene localidadId + sectorId (el sector es obligatorio en
// DestinatarioDto/DomicilioDto - ver envios.ts).
export function LocalidadSectorSelect({
  idPrefix,
  localidades,
  sectores,
  localidadId,
  sectorId,
  onChangeLocalidad,
  onChangeSector,
}: {
  idPrefix: string;
  localidades: LocalidadBackend[];
  sectores: SectorApi[];
  localidadId: string;
  sectorId: string;
  onChangeLocalidad: (id: string) => void;
  onChangeSector: (id: string) => void;
}) {
  const sectoresDeLocalidad = sectores.filter((s) => s.localidadId === localidadId);

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
        <Label htmlFor={`${idPrefix}-sector`} className="text-xs text-muted-foreground">
          Sector
        </Label>
        <Select
          value={sectorId}
          onValueChange={onChangeSector}
          disabled={sectoresDeLocalidad.length === 0}
        >
          <SelectTrigger id={`${idPrefix}-sector`} className="w-full">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            {sectoresDeLocalidad.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
