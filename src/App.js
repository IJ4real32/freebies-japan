// ✅ FILE: src/App.js (FINAL PATCHED)
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import PrivateRoute from "./routes/PrivateRoute";
import PrivateRouteAdmin from "./routes/PrivateRouteAdmin";

import Navbar from "./components/UI/Navbar";
import { Toaster } from "react-hot-toast";

/* ------------------------------------------------------------
 * Public + User Pages
 * ------------------------------------------------------------ */
import OnboardingSlides from "./pages/OnboardingSlides";
import WelcomeBack from "./pages/WelcomeBack";
import Home from "./pages/Home";
import Items from "./pages/Items";
import Donate from "./pages/Donate";
import MyActivity from "./pages/MyActivity";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import DepositInstructions from "./pages/DepositInstructions";

/* ------------------------------------------------------------
 * Admin Pages
 * ------------------------------------------------------------ */
import AdminLogin from "./pages/AdminLogin";
import Unauthorized from "./pages/Unauthorized";
import HealthCheck from "./pages/HealthCheck";
import AdminDashboard from "./pages/AdminDashboard";
import RequestsAdmin from "./pages/RequestsAdmin";
import AdminManageItems from "./pages/AdminManageItems";
import AdminItemDetail from "./pages/AdminItemDetail";
import AdminUsers from "./pages/AdminUsers";
import AdminLotteryDashboard from "./pages/AdminLotteryDashboard";
import AdminPaymentsQueue from "./pages/AdminPaymentsQueue";
import AdminPaymentDetails from "./pages/AdminPaymentDetails";
import AdminMoneyDonations from "./pages/AdminMoneyDonations";
import AdminMoneyDonationsList from "./pages/AdminMoneyDonationsList";
import AdminPickups from "./pages/AdminPickups";
import AdminDonate from "./pages/AdminDonate";

import { verifyFirestoreIndexes } from "./firebaseIndexHelper";

/* ------------------------------------------------------------
 * Dev Mode Index Verification
 * ------------------------------------------------------------ */
if (process.env.NODE_ENV === "development") {
  verifyFirestoreIndexes();
}

/* ------------------------------------------------------------
 * Body Class Controller (Admin Mode Styling)
 * ------------------------------------------------------------ */
function BodyClassController() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    if (isAdmin) {
      document.body.classList.add("admin-mode");
    } else {
      document.body.classList.remove("admin-mode");
    }
  }, [location.pathname]);

  return null;
}

/* ------------------------------------------------------------
 * Auth Redirect + Navbar visibility controller
 * ------------------------------------------------------------ */
function AuthRedirectController({ setShowNavbar }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const path = location.pathname;
      const isAdminPage = path.startsWith("/admin");
      const publicPages = [
        "/login",
        "/signup",
        "/onboarding",
        "/welcome-back",
        "/admin-login",
        "/unauthorized",
      ];

      const isPublicPage = publicPages.some((p) => path.startsWith(p));

      if (user) {
        // Show navbar except on admin pages
        setShowNavbar(!isAdminPage);

        // Onboarding logic
        const seenOnboarding = localStorage.getItem("hasSeenOnboarding") === "true";
        const seenWelcome = sessionStorage.getItem("hasSeenWelcome") === "true";

        if (!seenOnboarding) {
          localStorage.setItem("hasSeenOnboarding", "true");
          navigate("/onboarding", { replace: true });
          return;
        }

        if (!seenWelcome) {
          sessionStorage.setItem("hasSeenWelcome", "true");
          navigate("/welcome-back", { replace: true });
          return;
        }

        // Already logged in but hitting a public page → go to items
        if (isPublicPage) navigate("/items", { replace: true });

      } else {
        // User logged out
        const hideNavbarRoutes = ["/onboarding", "/login", "/signup", "/admin"];
        setShowNavbar(!hideNavbarRoutes.some((p) => path.startsWith(p)));

        if (path === "/") navigate("/onboarding", { replace: true });
      }
    });

    return () => unsub();
  }, [navigate, location, setShowNavbar]);

  return null;
}

/* ------------------------------------------------------------
 * Main App
 * ------------------------------------------------------------ */
function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AuthRedirectController setShowNavbar={setShowNavbar} />
          <BodyClassController />

          {showNavbar && <Navbar />}

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<OnboardingSlides />} />
            <Route path="/onboarding" element={<OnboardingSlides />} />
            <Route path="/welcome-back" element={<WelcomeBack />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/health" element={<HealthCheck />} />

            {/* User Routes (auth required) */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />

            {/* ⭐ protect items */}
            <Route
              path="/items"
              element={
                <PrivateRoute>
                  <Items />
                </PrivateRoute>
              }
            />

            <Route
              path="/donate"
              element={
                <PrivateRoute>
                  <Donate />
                </PrivateRoute>
              }
            />

            <Route
              path="/myactivity"
              element={
                <PrivateRoute>
                  <MyActivity />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            <Route
              path="/deposit-instructions"
              element={
                <PrivateRoute>
                  <DepositInstructions />
                </PrivateRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <PrivateRouteAdmin>
                  <AdminDashboard />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/requests"
              element={
                <PrivateRouteAdmin>
                  <RequestsAdmin />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/items"
              element={
                <PrivateRouteAdmin>
                  <AdminManageItems />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/item/:id"
              element={
                <PrivateRouteAdmin>
                  <AdminItemDetail />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/users"
              element={
                <PrivateRouteAdmin>
                  <AdminUsers />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/lottery"
              element={
                <PrivateRouteAdmin>
                  <AdminLotteryDashboard />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/payments"
              element={
                <PrivateRouteAdmin>
                  <AdminPaymentsQueue />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/payments/:id"
              element={
                <PrivateRouteAdmin>
                  <AdminPaymentDetails />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/money-donations"
              element={
                <PrivateRouteAdmin>
                  <AdminMoneyDonationsList />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/money-donations/:id"
              element={
                <PrivateRouteAdmin>
                  <AdminMoneyDonations />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/create-donation"
              element={
                <PrivateRouteAdmin>
                  <AdminDonate />
                </PrivateRouteAdmin>
              }
            />

            <Route
              path="/admin/pickups"
              element={
                <PrivateRouteAdmin>
                  <AdminPickups />
                </PrivateRouteAdmin>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast */}
          <Toaster position="top-center" />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
