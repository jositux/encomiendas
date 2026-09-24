import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "neo_session";
const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic) {
    // NOTA-2026-09-23-06: mismo destino que login/page.tsx tras un submit
    // exitoso — una sesión ya logueada que entra a /login (path público)
    // aterriza en Nueva encomienda, no en la vieja "/" de accesos rápidos.
    return NextResponse.redirect(new URL("/encomiendas/nueva", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
