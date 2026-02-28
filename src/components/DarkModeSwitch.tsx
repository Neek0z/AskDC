import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils";

export function DarkModeSwitch() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode sombre" : "Mode clair"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "border border-slate-300 dark:border-slate-600",
        isDark ? "bg-slate-700" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          isDark ? "translate-x-6" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
