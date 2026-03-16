import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function OrganizerRoute({ children }) {
  const { isAuthenticated, isOrganizer } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/staff-login" replace />;
  }
  if (!isOrganizer) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default OrganizerRoute;
