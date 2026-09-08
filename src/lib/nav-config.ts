import type { LucideIcon } from "lucide-react";
import {
  Truck,
  PackagePlus,
  LayoutDashboard,
  Inbox,
  UserCog2,
  Undo2,
  Send,
  Hourglass,
  Users,
  Wallet,
  Landmark,
  ShieldCheck,
  Car,
  UserRound,
  Building2,
  Route,
  MapPin,
  CreditCard,
  FileSpreadsheet,
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
    ],
  },
  {
    label: "Mi depósito",
    items: [
      {
        title: "Recepción",
        href: "/encomiendas/recepcion",
        icon: Inbox,
        description: "Ingreso de bultos al depósito",
      },
      {
        title: "Designaciones",
        href: "/encomiendas/designaciones",
        icon: UserCog2,
        description: "Asignar encomiendas a un repartidor",
      },
      {
        title: "Devolver",
        href: "/encomiendas/devolver",
        icon: Undo2,
        description: "Marcar encomiendas como devueltas",
      },
      {
        title: "Encomiendas activas",
        href: "/encomiendas/activas",
        icon: Send,
        description: "Encomiendas en curso, activas y entregadas",
      },
      {
        title: "Pendientes",
        href: "/encomiendas/pendientes",
        icon: Hourglass,
        description: "Encomiendas cargadas sin procesar",
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
    label: "Administración",
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
      {
        title: "Vehículos",
        href: "/vehiculos",
        icon: Car,
        description: "Flota de motos, camionetas y camiones",
      },
      {
        title: "Sucursales",
        href: "/sucursales",
        icon: Building2,
        description: "Bases y depósitos de la empresa",
      },
      {
        title: "Grupos de ruta",
        href: "/rutas",
        icon: Route,
        description: "Rutas, choferes y localidades asignadas",
      },
      {
        title: "Localidades",
        href: "/localidades",
        icon: MapPin,
        description: "Pueblos y ciudades de cobertura",
      },
      {
        title: "Exportar a Excel",
        href: "/encomiendas/activas?export=1",
        icon: FileSpreadsheet,
        description: "Exportar reportes de encomiendas",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
