"use client";

import Link from "next/link";
import { Package, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/nav-config";
import { useUiStore } from "@/store/ui-store";
import { NavLinkItem } from "./nav-link-item";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Package className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold">Neo Encomiendas</p>
            <p className="text-[11px] text-sidebar-foreground/50">
              Gestión logística
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/40 uppercase">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          {!collapsed && <span>v4.0.3 · Menú principal</span>}
        </Link>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-in-out lg:block",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="fixed inset-y-0 z-30 flex h-svh flex-col" style={{ width: collapsed ? 64 : 256 }}>
        <SidebarContent collapsed={collapsed} />
      </div>
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleSidebar}
        className="absolute top-16 -right-3 z-40 size-6 rounded-full border shadow-sm"
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-3.5" />
        ) : (
          <PanelLeftClose className="size-3.5" />
        )}
      </Button>
    </aside>
  );
}
