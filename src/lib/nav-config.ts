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
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
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
