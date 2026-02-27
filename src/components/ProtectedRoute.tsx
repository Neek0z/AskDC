import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "../types";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  anyRole?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  anyRole
}: ProtectedRouteProps) {
  const { userId, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-600">
        Chargement...
      </div>
    );
  }

  // Pour les routes "anyRole", seule la présence de la session suffit.
  if (!userId || (!anyRole && !role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!anyRole && allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

