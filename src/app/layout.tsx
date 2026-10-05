import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neo Encomiendas",
  description: "Sistema de gestión de encomiendas, cajas y logística",
};

// 2026-10-05: la app es una cáscara de alto fijo (h-svh) con el scroll
// adentro de <main>. En un celular, el teclado virtual por defecto se pone
// ENCIMA de la página sin achicarla, así que el campo tocado podía quedar
// tapado por el teclado. Con resizes-content el navegador achica la página
// al abrir el teclado y el campo enfocado queda a la vista (Chrome
// Android; Safari iOS no lo soporta y hace lo suyo).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
