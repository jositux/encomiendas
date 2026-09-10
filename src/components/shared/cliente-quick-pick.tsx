"use client";

import * as React from "react";
import { Search, UserCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchClientesAction } from "@/server/actions";
import type { ClienteApi } from "@/server/services/clientes";

// Antes filtraba un array de Cliente mock ya cargado entero en el cliente.
// El backend real no manda "todos los clientes" de una — busca por prefijo
// contra GET /clientes?q= (minimo 2 caracteres), asi que ahora es una
// busqueda con debounce contra el servidor.
export function ClienteQuickPick({
  onSelect,
}: {
  onSelect: (cliente: ClienteApi) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ClienteApi[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      searchClientesAction(query)
        .then((r) => setResults(r))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

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
          placeholder="Nombre o teléfono (mín. 2 letras)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <p className="flex items-center justify-center gap-1.5 px-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Buscando...
            </p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Sin coincidencias.
            </p>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="size-3.5 text-muted-foreground" />
                  {c.nombre}
                </span>
                <span className="pl-5 text-xs text-muted-foreground">{c.telefono}</span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
