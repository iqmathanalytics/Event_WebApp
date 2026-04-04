import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function UserRoute({ children }) {
  const { isAuthenticated, isUser, isOrganizer, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (isAdmin) {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (!isUser && !isOrganizer) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default UserRoute;
