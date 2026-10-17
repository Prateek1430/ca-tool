import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAppSelector } from "./app/hooks";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FinanceDashboardPage from "./pages/FinanceDashboardPage";
import ContractsPage from "./pages/ContractsPage";
import ContractDetailPage from "./pages/ContractDetailPage";
import MyCasPage from "./pages/MyCasPage";
import CaClientsPage from "./pages/CaClientsPage";
import CaClientDetailPage from "./pages/CaClientDetailPage";
import CaClientContractDetailPage from "./pages/CaClientContractDetailPage";
import CaDraftsPage from "./pages/CaDraftsPage";

function HomeRedirect() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "CA" ? "/ca/clients" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <FinanceDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <ContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:id"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <ContractDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-cas"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <MyCasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ca/clients"
          element={
            <ProtectedRoute allowedRoles={["CA"]}>
              <CaClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ca/clients/:clientId"
          element={
            <ProtectedRoute allowedRoles={["CA"]}>
              <CaClientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ca/clients/:clientId/contracts/:contractId"
          element={
            <ProtectedRoute allowedRoles={["CA"]}>
              <CaClientContractDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ca/drafts"
          element={
            <ProtectedRoute allowedRoles={["CA"]}>
              <CaDraftsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
