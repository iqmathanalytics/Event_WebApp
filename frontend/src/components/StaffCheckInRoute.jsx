import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/**
 * Venue check-in: admins and organizers only.
 * Unauthenticated users go to staff login with return URL.
 */
function StaffCheckInRoute({ children }) {
  const { authReady, isAuthenticated, isAdmin, isOrganizer } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Preparing check-in session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search || ""}`;
    return (
      <Navigate
        to={`/staff-login?next=${encodeURIComponent(next)}`}
        replace
        state={{ from: location }}
      />
    );
  }

  if (!isAdmin && !isOrganizer) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return children;
}

export default StaffCheckInRoute;
