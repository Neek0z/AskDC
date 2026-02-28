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
    default:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200",
    outline:
      "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300",
    info:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    warning:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    success:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/50 dark:text-green-300",
    danger:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300"
  };

  return <span className={cn(base, variants[variant], className)}>{children}</span>;
}

