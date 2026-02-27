import { Route, Routes, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardRedirect } from "./pages/DashboardRedirect";
import { NouveauTicketPage } from "./pages/NouveauTicketPage";
import { MesTicketsPage } from "./pages/MesTicketsPage";
import { TicketDetailDemandeurPage } from "./pages/TicketDetailDemandeurPage";
import { GdrTicketsPage } from "./pages/GdrTicketsPage";
import { GdrTicketDetailPage } from "./pages/GdrTicketDetailPage";
import { AdminTicketsPage } from "./pages/AdminTicketsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { LignesPage } from "./pages/LignesPage";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute anyRole>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Demandeur */}
        <Route
          path="/nouveau-ticket"
          element={
            <ProtectedRoute allowedRoles={["demandeur"]}>
              <NouveauTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-tickets"
          element={
            <ProtectedRoute allowedRoles={["demandeur"]}>
              <MesTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-tickets/:id"
          element={
            <ProtectedRoute allowedRoles={["demandeur"]}>
              <TicketDetailDemandeurPage />
            </ProtectedRoute>
          }
        />

        {/* GDR */}
        <Route
          path="/gdr/tickets"
          element={
            <ProtectedRoute allowedRoles={["gdr"]}>
              <GdrTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gdr/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={["gdr", "admin"]}>
              <GdrTicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lignes"
          element={
            <ProtectedRoute allowedRoles={["gdr", "admin"]}>
              <LignesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

