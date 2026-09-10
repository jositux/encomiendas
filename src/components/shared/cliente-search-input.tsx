"use client";

import * as React from "react";
import { UserCheck, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { searchClientesAction } from "@/server/actions";
import type { ClienteApi } from "@/server/services/clientes";

// Reemplaza al viejo par "input de nombre" + botón "Buscar cliente" aparte.
// Ahora el mismo campo donde se escribe el remitente/destinatario busca
// contra el backend a medida que se tipea (debounce, mínimo 2 letras) y
// muestra los resultados en un desplegable debajo — sin popover ni input
// duplicado. Elegir un resultado dispara onSelectCliente (que ya sabía
// completar teléfono/domicilio en cada lugar donde se usa); seguir tipeando
// sin elegir nada deja el nombre como texto libre, igual que antes.
export function ClienteSearchInput({
  id,
  value,
  onChange,
  onSelectCliente,
  placeholder,
  disabled,
  ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectCliente: (cliente: ClienteApi) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<ClienteApi[]>([]);
  const [loading, setLoading] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // Al elegir un resultado, el onSelectCliente del padre cambia `value` (por
  // ejemplo a c.nombre) — ese cambio no debe disparar una nueva búsqueda.
  const skipNextSearch = React.useRef(false);

  React.useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      searchClientesAction(query)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleSelect(c: ClienteApi) {
    skipNextSearch.current = true;
    setOpen(false);
    setResults([]);
    onSelectCliente(c);
  }

  return (
    <div ref={wrapperRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input
            id={id}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-72 max-h-64 overflow-y-auto p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (wrapperRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          {loading && (
            <p className="flex items-center justify-center gap-1.5 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Buscando...
            </p>
          )}
          {!loading && value.trim().length >= 2 && results.length === 0 && (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              Sin coincidencias — se va a cargar como cliente nuevo.
            </p>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="size-3.5 text-muted-foreground" />
                  {c.nombre}
                </span>
                <span className="pl-5 text-xs text-muted-foreground">{c.telefono}</span>
              </button>
            ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
