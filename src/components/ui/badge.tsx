import { ReactNode } from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "outline" | "info" | "warning" | "success" | "danger";

export function Badge({
  children,
  className,
  variant = "default"
}: {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

  const variants: Record<BadgeVariant, string> = {
    default: "border-slate-200 bg-slate-100 text-slate-800",
    outline: "border-slate-300 text-slate-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-orange-200 bg-orange-50 text-orange-700",
    success: "border-green-200 bg-green-50 text-green-700",
    danger: "border-red-200 bg-red-50 text-red-700"
  };

  return <span className={cn(base, variants[variant], className)}>{children}</span>;
}

