import { Navigate, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function OrganizerRoute({ children }) {
  const { authReady, isAuthenticated, isOrganizer } = useAuth();
  const [searchParams] = useSearchParams();
  const hasAnalyticsInvite = Boolean(String(searchParams.get("invite") || "").trim());

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
  // Allow invite accept links before organizer_enabled is flipped on.
  if (!isOrganizer && !hasAnalyticsInvite) {
    return <Navigate to="/dashboard/user" replace />;
  }
  return children;
}

export default OrganizerRoute;
