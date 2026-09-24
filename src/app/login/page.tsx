"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { login } from "@/server/auth-actions";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(usuario, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    // NOTA-2026-09-23-06: el aterrizaje directo pasó a ser "Nueva
    // encomienda" (antes "/", la vieja pantalla de inicio con accesos
    // rápidos) — decisión del humano del backend, "por el momento", es el
    // único flujo que se está probando ahora. Mismo destino que proxy.ts
    // usa cuando una sesión ya logueada entra a /login.
    router.replace("/encomiendas/nueva");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Package className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Neo Encomiendas
            </h1>
            <p className="text-sm text-white/60">Acceso a usuarios</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-white/[0.06]">
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="usuario" className="text-white/80">
                  Usuario o DNI
                </Label>
                <Input
                  id="usuario"
                  autoComplete="username"
                  placeholder="Ej: 41114146"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="border-white/15 bg-white/[0.06] text-white placeholder:text-white/35 focus-visible:ring-white/30"
                  autoFocus
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-white/80">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/15 bg-white/[0.06] pr-9 text-white placeholder:text-white/35 focus-visible:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-white/50 hover:text-white/80"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-200"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className={cn("mt-2 w-full font-semibold")}
              >
                {loading && <Loader2 className="animate-spin" />}
                Ingresar
              </Button>

              <p className="text-center text-xs text-white/40">
                Demo: cualquier DNI de la nómina de personal + cualquier
                contraseña.
                <br />
                Probá <span className="text-white/70">41114146</span>.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Neo Encomiendas · v4.0.3
        </p>
      </div>
    </div>
  );
}
