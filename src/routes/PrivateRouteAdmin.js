// ✅ FILE: src/routes/PrivateRouteAdmin.js (PHASE-2 — HARDENED)
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRouteAdmin({ children }) {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const location = useLocation();

  /* -----------------------------------------------------------
     1️⃣ Prevent flicker + protect against premature redirects
     ----------------------------------------------------------- */
  if (loadingAuth || loadingAuth === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Verifying admin access…</p>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------
     2️⃣ Not logged in → Go to /admin-login
     ----------------------------------------------------------- */
  if (!currentUser) {
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /* -----------------------------------------------------------
     3️⃣ Logged in but NOT admin → Unauthorized
     ----------------------------------------------------------- */
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  /* -----------------------------------------------------------
     4️⃣ Fully authorized → Grant access
     ----------------------------------------------------------- */
  return children;
}
