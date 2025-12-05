// ✅ FILE: src/routes/PrivateRoute.js (PHASE-2 — FINAL, NO FLICKER)
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children }) {
  const { currentUser, loadingAuth } = useAuth();
  const location = useLocation();

  /* ---------------------------------------------------------
     PHASE-2: Ultra-Stable Auth Gating
     - Blocks premature redirects during Firebase boot
     - Removes UI flicker
     - Prevents route bypass on fast page loads
  --------------------------------------------------------- */
  if (loadingAuth || loadingAuth === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Authenticating…</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     If still not logged in → send to login
     Save the "from" path so login can redirect back
  --------------------------------------------------------- */
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
