import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function AdminRoute({ children }) {
  const { authReady, isAuthenticated, isAdmin } = useAuth();
  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Preparing admin session…</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default AdminRoute;
