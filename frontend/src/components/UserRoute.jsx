import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function UserRoute({ children }) {
  const { isAuthenticated, isUser } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isUser) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default UserRoute;
