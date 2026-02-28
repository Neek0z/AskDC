import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/button";
import { DarkModeSwitch } from "./DarkModeSwitch";
import type { UserRole } from "../types";
import { cn } from "../lib/utils";

const linksByRole: Record<UserRole, { to: string; label: string }[]> = {
  demandeur: [
    { to: "/nouveau-ticket", label: "Nouveau ticket" },
    { to: "/mes-tickets", label: "Mes tickets" }
  ],
  gdr: [
    { to: "/gdr/tickets", label: "Tickets GDR" },
    { to: "/lignes", label: "Lignes des demandes" }
  ],
  admin: [
    { to: "/admin/tickets", label: "Tickets" },
    { to: "/lignes", label: "Lignes des demandes" },
    { to: "/admin/users", label: "Utilisateurs" }
  ]
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-center text-sm font-bold text-primary-foreground leading-8">
              CR
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                CODAG Request Manager
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {role === "demandeur" && "Demandeur"}
                {role === "gdr" && "GDR"}
                {role === "admin" && "Administrateur"}
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            {role &&
              linksByRole[role].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
                      isActive && "bg-slate-100 font-medium text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <DarkModeSwitch />
            <div className="hidden text-right sm:block">
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {profile?.full_name ?? profile?.email}
              </div>
              <div className="text-slate-400 dark:text-slate-500">{profile?.email}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              onClick={() => {
                void signOut();
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-6 text-slate-900 dark:text-slate-100">
        {children}
      </main>
    </div>
  );
}

