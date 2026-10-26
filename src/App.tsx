import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { Entries } from "./pages/Entries";
import { Login } from "./pages/Login";
function Protected() {
  const { authenticated } = useAuth();
  const location = useLocation();
  return authenticated ? (
    <Layout />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="entries" element={<Entries />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
