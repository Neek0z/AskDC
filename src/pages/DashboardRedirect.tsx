import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function DashboardRedirect() {
  const { role } = useAuth();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role === "demandeur") {
    return <Navigate to="/mes-tickets" replace />;
  }

  if (role === "gdr") {
    return <Navigate to="/gdr/tickets" replace />;
  }

  return <Navigate to="/admin/tickets" replace />;
}

