// ✅ FILE: src/routes/PrivateRouteAdmin.js (FIXED)
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PrivateRouteAdmin = ({ children }) => {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const location = useLocation();

  if (loadingAuth) return <div className="p-6 text-center">Checking admin access...</div>;

  if (!currentUser) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRouteAdmin;
