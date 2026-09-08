"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { ItemGasto } from "@/types";

export function GastoListEditor({
  title,
  tone,
  items,
  onChange,
  conceptos,
}: {
  title: string;
  tone: "amber" | "emerald" | "rose";
  items: ItemGasto[];
  onChange: (items: ItemGasto[]) => void;
  conceptos: string[];
}) {
  const [concepto, setConcepto] = React.useState(conceptos[0] ?? "");
  const [detalle, setDetalle] = React.useState("");
  const [importe, setImporte] = React.useState<number | "">("");

  const toneClass = {
    amber: "bg-warning/10 border-warning/30",
    emerald: "bg-success/10 border-success/30",
    rose: "bg-destructive/10 border-destructive/30",
  }[tone];

  function add() {
    if (!concepto || importe === "" || Number(importe) <= 0) return;
    onChange([
      ...items,
      { id: `g-${Date.now()}`, concepto, detalle: detalle.trim() || undefined, importe: Number(importe) },
    ]);
    setDetalle("");
    setImporte("");
  }

  const total = items.reduce((acc, i) => acc + i.importe, 0);

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="mb-2 text-sm font-semibold">{title}</p>

      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <select
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {conceptos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          placeholder="Detalle / N° remito (opcional)"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          className="h-8 flex-1 bg-background"
        />
        <Input
          type="number"
          placeholder="Importe"
          value={importe}
          onChange={(e) => setImporte(e.target.value === "" ? "" : Number(e.target.value))}
          className="h-8 w-28 bg-background"
        />
        <Button type="button" size="icon" className="size-8 shrink-0" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md bg-background/70 px-2 py-1 text-sm"
            >
              <span className="truncate">
                {item.concepto}
                {item.detalle && (
                  <span className="text-muted-foreground"> · {item.detalle}</span>
                )}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums font-medium">{formatCurrency(item.importe)}</span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex justify-end text-sm font-semibold">
        Total: {formatCurrency(total)}
      </div>
    </div>
  );
}
