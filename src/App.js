// ✅ FILE: src/App.js (FULLY CLEANED + SUBSCRIPTION BANNER FIXED)
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

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

import PrivateRoute from "./routes/PrivateRoute";
import PrivateRouteAdmin from "./routes/PrivateRouteAdmin";

import Navbar from "./components/UI/Navbar";
import SubscriptionBanner from "./components/UI/SubscriptionBanner";
import { Toaster } from "react-hot-toast";

/* ---------------- User Pages ---------------- */
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

/* ---------------- Admin Pages ---------------- */
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

/* ---------------- Debug ---------------- */
import { verifyFirestoreIndexes } from "./firebaseIndexHelper";

if (process.env.NODE_ENV === "development") {
  verifyFirestoreIndexes();
}

/* ---------------- Body CSS Controller ---------------- */
function BodyClassController() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    document.body.classList.toggle("admin-mode", isAdmin);
  }, [location.pathname]);

  return null;
}

/* ---------------- Auth Redirect Controller ---------------- */
function AuthRedirectController({ setShowNavbar }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const path = location.pathname;
      const isAdminPage = path.startsWith("/admin");

      // Hide navbar on these public pages
      const publicHideNavbar = ["/onboarding", "/login", "/signup", "/admin"];

      if (user) {
        setShowNavbar(!isAdminPage);

        /* -------- Onboarding Logic -------- */
        const seenOnboarding =
          localStorage.getItem("hasSeenOnboarding") === "true";
        const seenWelcome =
          sessionStorage.getItem("hasSeenWelcome") === "true";

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

        const publicPages = [
          "/login",
          "/signup",
          "/welcome-back",
          "/onboarding",
          "/admin-login",
        ];

        if (publicPages.some((p) => path.startsWith(p))) {
          navigate("/items", { replace: true });
        }
      } else {
        // Logged out
        setShowNavbar(!publicHideNavbar.some((p) => path.startsWith(p)));

        if (path === "/") navigate("/onboarding", { replace: true });
      }
    });
  }, [location.pathname, navigate, setShowNavbar]);

  return null;
}

/* ---------------- Subscription Banner Controller ---------------- */
function BannerController({ setShowBanner }) {
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    const path = location.pathname;
    const loggedIn = !!currentUser;
    const isAdmin = path.startsWith("/admin");
    const bannerClosed = localStorage.getItem("bannerClosed") === "true";

    if (loggedIn && !isAdmin) {
      if (path.startsWith("/items")) {
        // Reset on items page
        setShowBanner(true);
        localStorage.removeItem("bannerClosed");
      } else {
        setShowBanner(!bannerClosed);
      }
    } else {
      setShowBanner(false);
    }
  }, [location.pathname, currentUser, setShowBanner]);

  return null;
}

/* ---------------- Main App ---------------- */
function App() {
  const [showNavbar, setShowNavbar] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  return (
    <>
      {/* Controllers */}
      <AuthRedirectController setShowNavbar={setShowNavbar} />
      <BannerController setShowBanner={setShowBanner} />
      <BodyClassController />

      {/* Navbar */}
      {showNavbar && <Navbar />}

      {/* Banner (non-admin only) */}
      {showNavbar && showBanner && (
        <div className="relative z-[40]">
    <div className="mt-[56px] md:mt-[64px]"></div>
          <SubscriptionBanner />
        </div>
      )}

      {/* Routes */}
      <Routes>
        {/* Public */}
        <Route path="/" element={<OnboardingSlides />} />
        <Route path="/onboarding" element={<OnboardingSlides />} />
        <Route path="/welcome-back" element={<WelcomeBack />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/health" element={<HealthCheck />} />

        {/* Authenticated User Routes */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

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

        {/* Admin Routes */}
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-center" />
    </>
  );
}

/* ---------------- Wrapper ---------------- */
export default function AppWrapper() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}
