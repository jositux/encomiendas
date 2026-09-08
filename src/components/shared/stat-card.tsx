import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  hint?: string;
  className?: string;
}) {
  const toneClass: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground dark:text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/15 text-info",
  };

  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardContent className="flex items-center gap-3 px-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            toneClass[tone]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground truncate">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
