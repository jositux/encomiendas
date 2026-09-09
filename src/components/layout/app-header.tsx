"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Menu, LogOut, ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SidebarContent } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/server/auth-actions";
import { resetDemoDataAction } from "@/server/actions";
import { ALL_NAV_ITEMS } from "@/lib/nav-config";
import { initials } from "@/lib/format";
import type { SesionUsuario, Sucursal } from "@/types";

export function AppHeader({
  session,
  sucursal,
}: {
  session: SesionUsuario;
  sucursal: Sucursal | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const current = ALL_NAV_ITEMS.find(
    (i) => i.href.split("?")[0] === pathname
  );

  async function handleLogout() {
    await logout();
    toast.success("Sesión finalizada");
    router.replace("/login");
    router.refresh();
  }

  async function handleReset() {
    setPending(true);
    await resetDemoDataAction();
    setPending(false);
    toast.success("Datos de demostración restablecidos");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <VisuallyHidden>
              <SheetTitle>Menú</SheetTitle>
            </VisuallyHidden>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {current?.title ?? "Inicio"}
        </p>
      </div>

      {sucursal && (
        <Badge
          variant="outline"
          className="hidden sm:inline-flex items-center gap-1.5 border-dashed"
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: sucursal.color }}
          />
          {sucursal.nombre}
        </Badge>
      )}

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-2">
            <Avatar className="size-6.5">
              <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
                {initials(session.nombre)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {session.nombre.split(" ")[0]}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{session.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {session.esGlobal ? "Alcance global" : "Alcance de sucursal"}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onClick={() => setResetOpen(true)}>
            <RotateCcw />
            {pending ? "Restableciendo..." : "Restablecer datos demo"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="¿Restablecer los datos de demostración?"
        description="Se van a descartar todos los cambios (encomiendas, clientes, personal, cierres de caja, etc.) y se va a volver al set de datos inicial. Esta acción no se puede deshacer."
        confirmLabel="Restablecer"
        onConfirm={handleReset}
      />
    </header>
  );
}
