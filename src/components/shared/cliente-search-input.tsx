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
//
// Navegación por teclado (bug real reportado: no se podía elegir un
// resultado sin mouse, y Tab después de elegir con mouse se iba al chrome
// del navegador en vez del siguiente campo):
//  - Flecha abajo/arriba mueve el resaltado entre los resultados.
//  - Enter confirma el resultado resaltado (sin enviar el formulario).
//  - Tab confirma el resultado resaltado Y deja que el foco siga su curso
//    normal hacia el siguiente campo (no hacemos preventDefault).
//  - Al elegir con mouse, devolvemos el foco al input a mano: Radix cierra
//    el popover y el botón clickeado desaparece del DOM, así que sin esto
//    el foco queda "perdido" y el próximo Tab del usuario salta al chrome
//    del navegador en vez de al siguiente campo del formulario.
export function ClienteSearchInput({
  id,
  value,
  onChange,
  onSelectCliente,
  placeholder,
  disabled,
  ariaInvalid,
  // NOTA-2026-09-23-05 (pedido de Sebastian): en Carga Rápida, al terminar
  // de cargar un destino el foco tiene que volver solo al campo de
  // "Destino" de la fila siguiente — sin esto, el operador tiene que
  // clickear a mano en cada fila nueva, que es justo el paso que Carga
  // Rápida existe para evitar.
  autoFocus,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectCliente: (cliente: ClienteApi) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<ClienteApi[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(-1);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);
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
          setHighlighted(r.length > 0 ? 0 : -1);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    if (highlighted < 0) return;
    resultRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function handleSelect(c: ClienteApi) {
    skipNextSearch.current = true;
    setOpen(false);
    setResults([]);
    setHighlighted(-1);
    onSelectCliente(c);
    // Radix cierra el popover (y desmonta el botón elegido) recién en el
    // próximo tick — recuperamos el foco después para que el navegador no
    // lo pierda.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1 >= results.length ? 0 : i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 < 0 ? results.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      if (highlighted < 0) return;
      e.preventDefault();
      handleSelect(results[highlighted]);
      return;
    }
    if (e.key === "Tab") {
      // No preventDefault: confirmamos el resaltado y dejamos que el Tab
      // siga de largo hacia el siguiente campo, como espera el usuario.
      if (highlighted >= 0) handleSelect(results[highlighted]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input
            id={id}
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
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
            results.map((c, i) => (
              <button
                key={c.id}
                ref={(el) => {
                  resultRefs.current[i] = el;
                }}
                type="button"
                onClick={() => handleSelect(c)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm ${
                  i === highlighted ? "bg-accent" : "hover:bg-accent"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="size-3.5 text-muted-foreground" />
                  {c.nombre}
                </span>
                <span className="pl-5 text-xs text-muted-foreground">
                  {c.telefono} · {c.localidadNombre ?? "—"}
                </span>
              </button>
            ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
