"use client";

import * as React from "react";
import { Search, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { localidadNombre } from "@/lib/mock/localidades";
import type { Cliente } from "@/types";

export function ClienteQuickPick({
  clientes,
  onSelect,
}: {
  clientes: Cliente[];
  onSelect: (cliente: Cliente) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const results = React.useMemo(() => {
    if (!query.trim()) return clientes.slice(0, 6);
    const q = query.toLowerCase();
    return clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.dniCuit.includes(q) ||
          c.telefono.includes(q)
      )
      .slice(0, 8);
  }, [clientes, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Search className="size-3.5" />
          Buscar cliente
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <Input
          autoFocus
          placeholder="Nombre, DNI o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {results.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Sin coincidencias.
            </p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="size-3.5 text-muted-foreground" />
                {c.nombre}
              </span>
              <span className="pl-5 text-xs text-muted-foreground">
                {c.telefono} · {localidadNombre(c.localidadId)}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
