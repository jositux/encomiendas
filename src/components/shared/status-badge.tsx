import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstadoEncomienda, TipoEncomienda, EstadoCaja } from "@/types";
import { ESTADO_LABEL, TIPO_LABEL } from "@/lib/mock/encomiendas";

const ESTADO_VARIANT: Record<
  EstadoEncomienda,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"
> = {
  PENDIENTE: "warning",
  EN_TRANSITO: "info",
  PARA_ENTREGAR: "info",
  ENTREGADA: "success",
  DEVUELTA: "destructive",
  ELIMINADA: "outline",
};

export function EstadoBadge({
  estado,
  className,
}: {
  estado: EstadoEncomienda;
  className?: string;
}) {
  return (
    <Badge variant={ESTADO_VARIANT[estado]} className={cn(className)}>
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}

const TIPO_VARIANT: Record<TipoEncomienda, "default" | "secondary" | "outline" | "info"> = {
  CRR: "default",
  PAQUETERIA: "secondary",
  TRAMITE: "outline",
  INTERNO: "info",
};

export function TipoBadge({ tipo }: { tipo: TipoEncomienda }) {
  return <Badge variant={TIPO_VARIANT[tipo]}>{TIPO_LABEL[tipo]}</Badge>;
}

const CAJA_VARIANT: Record<EstadoCaja, "outline" | "warning" | "success"> = {
  CERRADA: "outline",
  INICIADA: "warning",
  HABILITADA: "success",
};

const CAJA_LABEL: Record<EstadoCaja, string> = {
  CERRADA: "Cerrada",
  INICIADA: "Iniciada",
  HABILITADA: "Habilitada",
};

export function CajaBadge({ estado }: { estado: EstadoCaja }) {
  return <Badge variant={CAJA_VARIANT[estado]}>{CAJA_LABEL[estado]}</Badge>;
}
