import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function OrganizerRoute({ children }) {
  const { authReady, isAuthenticated, isOrganizer } = useAuth();
  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: "/dashboard/organizer" }} />;
  }
  if (!isOrganizer) {
    return <Navigate to="/dashboard/user" replace />;
  }
  return children;
}

export default OrganizerRoute;
