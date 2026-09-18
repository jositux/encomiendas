"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPermisosRolAction } from "@/server/actions";
import type { RolApi } from "@/server/services/roles";

// GET /roles/{id}/permisos no tiene schema documentado en el OpenAPI (ver
// el comentario largo en src/server/services/roles.ts) — este diálogo
// todavía muestra el JSON crudo en vez de una grilla de checkboxes editable.
// Es intencional: es el paso de "ver la forma real en vivo" antes de
// construir el editor de verdad (mismo método que se usó para confirmar
// RecepcionDto/CargaDto/etc. — ver plan de integración, sección 30). Una
// vez confirmada la forma, este componente se reemplaza por la grilla real
// con guardado (PUT, ya implementado en actualizarPermisosRolAction).
export function RolPermisosDialog({
  rol,
  open,
  onOpenChange,
}: {
  rol: RolApi | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [cargando, setCargando] = React.useState(false);
  const [data, setData] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (!open || !rol) return;
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) {
        setCargando(true);
        setData(null);
      }
    });
    getPermisosRolAction(rol.id).then((r) => {
      if (cancelado) return;
      if (!r.ok) {
        toast.error(r.title, { description: r.message });
      } else {
        setData(r.data);
      }
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [open, rol]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Permisos de {rol?.nombre}</DialogTitle>
          <DialogDescription>
            Vista de solo lectura por ahora — el editor con guardado llega en cuanto se
            confirme la forma real de esta respuesta.
          </DialogDescription>
        </DialogHeader>
        {cargando ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
