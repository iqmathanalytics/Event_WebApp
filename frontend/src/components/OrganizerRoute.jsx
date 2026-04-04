import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function OrganizerRoute({ children }) {
  const { isAuthenticated, isOrganizer } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  if (!isOrganizer) {
    return <Navigate to="/dashboard/user" replace />;
  }
  return children;
}

export default OrganizerRoute;
