import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { landingPathParaPermisos } from "@/lib/landing";

const SESSION_COOKIE = "neo_session";
const PUBLIC_PATHS = new Set(["/login"]);

// Duplicado a propósito en vez de importar src/server/api-client.ts: ese
// módulo tiene `import "server-only"` y depende de convenciones de Server
// Actions/Route Handlers; proxy.ts corre en el Edge runtime y hoy no
// importa nada de src/server, así que se mantiene con este fetch mínimo
// propio en vez de probar esa combinación en el archivo que intercepta
// TODAS las requests.
const API_BASE_URL = process.env.API_BASE_URL ?? "https://api.srv01.sebastianpaniagua.qzz.io";

// NOTA-2026-09-24-01: landing por rol para una sesión que ya está logueada
// y entra a /login igual. Si el fetch falla (token vencido, backend
// caído, lo que sea) no rompemos nada -- caemos al default de siempre.
async function landingPathParaToken(token: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/yo`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return "/encomiendas/nueva";
    const sesion = (await res.json()) as { permisos?: string[] };
    return landingPathParaPermisos(sesion.permisos ?? []);
  } catch {
    return "/encomiendas/nueva";
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic) {
    // NOTA-2026-09-23-06: por default, una sesión ya logueada que entra a
    // /login (path público) aterriza en Nueva encomienda, no en la vieja
    // "/" de accesos rápidos. NOTA-2026-09-24-01 agrega la excepción por
    // rol (chofer -> /chofer), mismo criterio que login/page.tsx.
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const landingPath = token ? await landingPathParaToken(token) : "/encomiendas/nueva";
    return NextResponse.redirect(new URL(landingPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
