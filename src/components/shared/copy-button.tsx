"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// NOTA-2026-09-23-02 (pedido de Sebastian en #cc-relay): botón para copiar
// al portapapeles el número de envío, el remito manual y el código de
// planilla (codigoCorto/codigoQr) donde se muestran — para que el
// operador/chofer no tenga que transcribirlos a mano al pasarlos por
// WhatsApp u otro sistema. `print:hidden` porque no tiene sentido en el
// remito/planilla impresos en papel.
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  // Texto descriptivo para el toast de confirmación, ej. "Número de envío".
  label?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = React.useState(false);

  const copiar = React.useCallback(
    async (e: React.MouseEvent) => {
      // stopPropagation/preventDefault: varios usos van pegados a filas o
      // enlaces clickeables (ej. la lista de "Envíos recientes"), y no
      // queremos que el click en el ícono dispare esa otra acción.
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopiado(true);
        toast.success(label ? `${label} copiado` : "Copiado al portapapeles");
        window.setTimeout(() => setCopiado(false), 1500);
      } catch {
        toast.error("No se pudo copiar");
      }
    },
    [value, label]
  );

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={label ? `Copiar ${label}` : "Copiar"}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground print:hidden",
        className
      )}
    >
      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
