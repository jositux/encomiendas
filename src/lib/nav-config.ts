import type { LucideIcon } from "lucide-react";
import {
  PackagePlus,
  Inbox,
  PackageSearch,
  Users,
  Car,
  UserRound,
  Map,
  Search,
  ClipboardList,
  Scissors,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  // Permiso real (string de SesionUsuario.permisos, ver GET /auth/yo) que
  // hace falta para que el item aparezca en el menú. Opcional: la mayoría
  // de las pantallas no tiene un permiso de lectura propio y sigue
  // visible para cualquier usuario logueado, como siempre. Se agregó por
  // "Chofer" (2026-09-17, corregido el mismo día — ver sección 27 del
  // plan): un usuario sin el permiso de lectura correspondiente rompía
  // toda la pantalla al entrar — mejor no mostrar la opción que mostrarla
  // y que explote.
  permiso?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      // NOTA-2026-09-23-06 (decisión del humano del backend, "por el
      // momento"): se ocultan del menú "Tablero principal" (/panel) y
      // "Levantes" (/levantes) — el mostrador debe entrar y quedar parado
      // en "Nueva encomienda", que es lo único que se está probando ahora.
      // Es ocultar, no borrar: las rutas y el código de esas dos pantallas
      // siguen intactos (src/app/(app)/panel, src/app/(app)/levantes) y
      // entrar por URL directa sigue funcionando — solo se sacan estas dos
      // entradas de NAV_GROUPS (fuente única de sidebar Y de la grilla de
      // accesos rápidos de "/", ver app-sidebar.tsx y (app)/page.tsx). El
      // aterrizaje directo en Nueva encomienda se resolvió aparte, en
      // login/page.tsx y proxy.ts.
      {
        title: "Nueva encomienda",
        href: "/encomiendas/nueva",
        icon: PackagePlus,
        description: "Alta de un nuevo envío",
      },
      {
        title: "Seguimiento",
        href: "/seguimiento",
        icon: Search,
        description: "Buscar un envío por número, remito o guía y ver su historia",
      },
    ],
  },
  {
    label: "Mi depósito",
    items: [
      {
        title: "Depósito",
        href: "/deposito",
        icon: Inbox,
        description: "Recepción, designaciones, devoluciones y encomiendas activas",
      },
      {
        title: "Custodia",
        href: "/custodia",
        icon: PackageSearch,
        description: "Quién tiene cada envío ahora y en qué punto",
      },
      {
        title: "Chofer",
        href: "/chofer",
        icon: ClipboardList,
        description: "Cargar/recibir planillas y registrar entregas, intentos e incidencias",
        // Corregido 2026-09-17 (sección 27 del plan): NO es despachos:leer
        // (permiso de oficina que un chofer real nunca tiene) — el punto
        // de entrada real de la pantalla es la búsqueda de planilla por
        // código, que solo pide planillas:leer.
        permiso: "planillas:leer",
      },
      {
        title: "Despachos",
        href: "/despachos",
        icon: Scissors,
        description: "Cortar la carga pendiente de la base en planillas por recorrido",
        // 2026-09-18 (sección 32 del plan): sin `permiso` todavía — a
        // diferencia de "Chofer", el string exacto que protege POST
        // /despachos (o la lectura de /recorridos que esta pantalla
        // necesita) no está confirmado con un 403 real. Se deja visible
        // para cualquier usuario logueado, como la mayoría de los ítems de
        // este menú, hasta que se confirme en vivo con una cuenta que
        // debería tenerlo (operador) y una que no (chofer).
      },
    ],
  },
  {
    label: "Clientes y personal",
    items: [
      {
        title: "Clientes",
        href: "/clientes",
        icon: Users,
        description: "Base de clientes y cuentas corrientes",
        // 2026-09-24: confirmado en vivo con chofer_obera — GET /clientes
        // (sin variante "segura", es el dato central de la pantalla) tira
        // "Tu usuario no tiene el permiso clientes:leer." sin atrapar,
        // rompiendo la pantalla entera. Mismo criterio que "Chofer": mejor
        // ocultar el ítem que dejarlo y que explote al entrar.
        permiso: "clientes:leer",
      },
      {
        title: "Usuarios y roles",
        href: "/usuarios",
        icon: UserRound,
        description: "Accesos reales al sistema: usuarios, roles y permisos",
        // 2026-09-24: `usuarios:leer` ya está documentado como precondición
        // dura de esta pantalla (claude/esquema-permisos.md — GET /usuarios
        // es su dato central, sin variante "segura" acá a propósito) y
        // confirmado en vivo que rompe para chofer_obera. Mismo criterio
        // que "Chofer"/"Clientes": se oculta el ítem en vez de mostrarlo y
        // que explote.
        permiso: "usuarios:leer",
      },
    ],
  },
  {
    label: "Catálogos",
    items: [
      {
        title: "Vehículos",
        href: "/vehiculos",
        icon: Car,
        description: "Flota de motos, camionetas y camiones",
      },
      {
        title: "Geografía",
        href: "/geografia",
        icon: Map,
        description: "Provincias, localidades, sectores y puntos",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Filtro por permiso real, compartido por el menú lateral (app-sidebar.tsx)
// y la grilla de accesos rápidos de "/" ((app)/page.tsx) — antes cada uno
// tenía su propia copia del mismo `!item.permiso || permisos.includes(...)`
// y en 2026-09-17 eso hizo que un item ya oculto del menú lateral siguiera
// apareciendo en la grilla, porque nadie había actualizado esa segunda
// copia. Un solo lugar, una sola vez que arreglar.
export function esVisibleParaPermisos(item: NavItem, permisos: string[] | undefined): boolean {
  return !item.permiso || (permisos ?? []).includes(item.permiso);
}

