# Neo Encomiendas

Sistema de gestión logística para una empresa de encomiendas y paquetería, rediseñado a partir del sistema legado ("Neo_Encomiendas") con una interfaz moderna y una arquitectura de frontend mantenible.

Este proyecto es **solo frontend**: no hay backend real. Todos los datos son simulados con un store en memoria (Zustand) que persiste en `localStorage`, así que podés navegar, crear, editar y eliminar registros y los cambios se mantienen entre recargas del navegador.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (componentes tipo "new-york", basados en Radix UI)
- **Zustand** para el estado global (con persistencia a `localStorage`)
- **@tanstack/react-table** para las tablas de datos
- **react-hook-form + zod** para formularios (donde aplica)
- **next-themes** para modo claro/oscuro
- **sonner** para notificaciones toast
- **Geist Sans / Geist Mono** (paquete `geist`, tipografías oficiales de Vercel, sin depender de Google Fonts)

### Identidad visual

El tema está inspirado en el estilo de Vercel: base neutra en blanco y negro puro (fondo `#000` en modo oscuro), tipografía Geist y un único color de acento en **azul celeste** (`oklch(0.588 0.158 241.966)`, equivalente a `sky-600`/`sky-500`) para botones, estados activos, enlaces y foco. Todos los colores viven como variables OKLCH en `src/app/globals.css`, así que cambiar el acento de marca es cuestión de editar `--primary`, `--ring`, `--sidebar-primary` e `--info`.

## Cómo correrlo

```bash
pnpm install
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000). Vas a ser redirigido a `/login`.

**Usuario de prueba:** cualquier DNI o alias de la nómina de personal simulada funciona con cualquier contraseña de 4+ caracteres (es un login simulado, no hay validación real). Por ejemplo:

- DNI: `41114146`
- Contraseña: `demo1234`

Para producción:

```bash
pnpm build
pnpm start
```

## Arquitectura

```
src/
├── app/                    # Rutas (App Router)
│   ├── login/               # Pantalla de acceso
│   └── (app)/                # Grupo de rutas autenticadas (sidebar + header)
│       ├── panel/             # Tablero principal (kanban de filtros)
│       ├── encomiendas/       # Alta, activas, pendientes, recepción, etc.
│       ├── levantes/
│       ├── cajas/             # Cierre de caja y control
│       ├── crr/               # Contra reembolso
│       ├── clientes/
│       ├── personal/
│       ├── vehiculos/
│       ├── sucursales/
│       ├── rutas/
│       ├── localidades/
│       └── mercadopago/       # Integración simulada
├── components/
│   ├── ui/                  # Primitivas shadcn/ui (button, input, table, dialog, etc.)
│   ├── layout/               # Sidebar, header, guard de autenticación
│   ├── shared/                # DataTable genérica, StatCard, StatusBadge, ConfirmDialog, etc.
│   └── <dominio>/            # Componentes específicos por módulo (encomiendas, clientes, personal...)
├── store/                   # Zustand: auth-store, data-store (CRUD de todas las entidades), ui-store
├── lib/
│   ├── mock/                 # Datos de referencia y generación determinística de datos de prueba
│   ├── format.ts             # Helpers de formato (moneda, fecha)
│   └── utils.ts              # Helper `cn()` de clases
└── types/                   # Modelo de dominio (Encomienda, Cliente, Personal, Vehiculo, etc.)
```

### Decisiones de diseño

- **Capa de datos desacoplada**: todas las pantallas leen y escriben a través de `useDataStore` (Zustand). Si en el futuro se conecta un backend real, solo hay que reemplazar las acciones del store por llamadas a una API; los componentes no necesitan cambiar.
- **Datos de referencia realistas**: sucursales, localidades y grupos de ruta reflejan la operación real capturada del sistema legado (Misiones, Corrientes, Chaco), para que la demo se sienta representativa del negocio.
- **Generación determinística**: los datos simulados (encomiendas, personal, clientes, cierres de caja) se generan con un PRNG con semilla fija, evitando errores de hidratación entre servidor y cliente.
- **Componentes reutilizables**: una `DataTable` genérica (ordenamiento, búsqueda, paginación) y una familia de `StatusBadge` se reutilizan en más de 15 pantallas distintas.
- **Diseño responsivo y con modo oscuro** en toda la aplicación, con un sidebar colapsable en desktop y un menú tipo *sheet* en mobile.

## Notas

- No hay integración real con Mercado Pago, correo ni impresión: esas pantallas están simuladas para completar el flujo visual.
- El botón "Reset de datos demo" (si se agrega en el futuro) debería limpiar `localStorage` y regenerar los datos desde `src/lib/mock`.
