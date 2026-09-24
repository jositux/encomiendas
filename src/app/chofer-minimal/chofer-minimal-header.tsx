"use client";

import { useRouter } from "next/navigation";
import { LogOut, Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logout } from "@/server/auth-actions";
import { initials } from "@/lib/format";
import type { SesionUsuario } from "@/types";

// Cabecera mínima de /chofer-minimal (2026-09-24, ver charla sobre UX
// mobile del rol chofer en claude/esquema-permisos.md). A diferencia de
// AppHeader (el de (app)/layout.tsx) acá NO hay botón de hamburguesa ni
// sidebar que abrir, ni selector de "pantalla actual" — esta ruta existe
// justamente para sacarle de encima al chofer el menú completo de oficina
// (12 ítems, la mayoría irrelevantes o directamente rotos para su rol —
// confirmado en vivo que "Usuarios y roles" y "Clientes" tiran un 403 sin
// atrapar para chofer_obera). Tampoco tiene "Restablecer datos demo" (herramienta
// de QA/admin, no algo que un chofer real en la calle debería poder tocar).
export function ChoferMinimalHeader({ session }: { session: SesionUsuario }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("Sesión finalizada");
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Package className="size-4" />
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">Chofer</p>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-2">
            <Avatar className="size-6.5">
              <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
                {initials(session.nombre)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{session.nombre}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
