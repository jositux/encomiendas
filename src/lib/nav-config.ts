import type { LucideIcon } from "lucide-react";
import {
  Truck,
  PackagePlus,
  LayoutDashboard,
  Inbox,
  PackageSearch,
  Users,
  Wallet,
  Landmark,
  ShieldCheck,
  Car,
  UserRound,
  Map,
  CreditCard,
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
      {
        title: "Tablero principal",
        href: "/panel",
        icon: LayoutDashboard,
        description: "Vista general de procesos, entregas y pendientes",
      },
      {
        title: "Levantes",
        href: "/levantes",
        icon: Truck,
        description: "Encomiendas a retirar por ruta",
      },
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
    label: "Cajas",
    items: [
      {
        title: "Cierre de caja",
        href: "/cajas",
        icon: Wallet,
        description: "Rendición diaria de un repartidor",
      },
      {
        title: "Control de cajas",
        href: "/cajas/control",
        icon: Landmark,
        description: "Panel administrativo de rendiciones",
      },
      {
        title: "CRR",
        href: "/crr",
        icon: ShieldCheck,
        description: "Contra reembolso: cobros pendientes y rendidos",
      },
      {
        title: "Mercado Pago",
        href: "/mercadopago",
        icon: CreditCard,
        description: "Cobros digitales y conciliación",
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
      },
      {
        title: "Personal",
        href: "/personal",
        icon: UserRound,
        description: "Empleados, roles y permisos",
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
