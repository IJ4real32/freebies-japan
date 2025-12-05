// ✅ FILE: src/App.js (PHASE 2 — FINAL ROUTE UPGRADE)

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

/* ---------------- Context Providers ---------------- */
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

/* ---------------- Route Guards ---------------- */
import PrivateRoute from "./routes/PrivateRoute";
import PrivateRouteAdmin from "./routes/PrivateRouteAdmin";

/* ---------------- UI ---------------- */
import Navbar from "./components/UI/Navbar";
import SubscriptionBanner from "./components/UI/SubscriptionBanner";
import { Toaster } from "react-hot-toast";

/* ---------------- User Pages ---------------- */
import OnboardingSlides from "./pages/OnboardingSlides";
import WelcomeBack from "./pages/WelcomeBack";
import Home from "./pages/Home";
import Items from "./pages/Items";
import Donate from "./pages/Donate";
import MyActivity from "./pages/MyActivity";             // 🚀 Phase 2 Compatible
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

import AdminMoneyDonationsList from "./pages/AdminMoneyDonationsList";
import AdminMoneyDonations from "./pages/AdminMoneyDonations";

import AdminPickups from "./pages/AdminPickups";
import AdminDonate from "./pages/AdminDonate";

/* ---------------- Debug ---------------- */
import { verifyFirestoreIndexes } from "./firebaseIndexHelper";
if (process.env.NODE_ENV === "development") {
  verifyFirestoreIndexes();
}

/* ==========================================================
   BODY CLASS CONTROLLER (Admin Mode UI toggle)
========================================================== */
function BodyClassController() {
  const location = useLocation();
  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    document.body.classList.toggle("admin-mode", isAdmin);
  }, [location.pathname]);
  return null;
}

/* ==========================================================
   AUTH REDIRECT HANDLER
   Handles: navbar, onboarding, welcome-back logic
========================================================== */
function AuthRedirectController({ setShowNavbar }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const path = location.pathname;
      const isAdminPage = path.startsWith("/admin");

      const hideNavbarPages = ["/onboarding", "/login", "/signup", "/admin"];

      if (user) {
        // Logged-in User
        setShowNavbar(!isAdminPage);

        const seenOnboarding = localStorage.getItem("hasSeenOnboarding") === "true";
        const seenWelcomeBack = sessionStorage.getItem("hasSeenWelcome") === "true";

        if (!seenOnboarding) {
          localStorage.setItem("hasSeenOnboarding", "true");
          navigate("/onboarding", { replace: true });
          return;
        }

        if (!seenWelcomeBack) {
          sessionStorage.setItem("hasSeenWelcome", "true");
          navigate("/welcome-back", { replace: true });
          return;
        }

        // Don’t leave user on login pages
        const publicPages = ["/login", "/signup", "/welcome-back", "/onboarding", "/admin-login"];
        if (publicPages.some((p) => path.startsWith(p))) {
          navigate("/items", { replace: true });
        }
      } else {
        // Logged OUT
        setShowNavbar(!hideNavbarPages.some((p) => path.startsWith(p)));
        if (path === "/") navigate("/onboarding", { replace: true });
      }
    });
  }, [location.pathname, navigate, setShowNavbar]);

  return null;
}

/* ==========================================================
   SUBSCRIPTION BANNER CONTROLLER (Phase 2 logic intact)
========================================================== */
function BannerController({ setShowBanner }) {
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    const path = location.pathname;
    const isAdmin = path.startsWith("/admin");
    const loggedIn = !!currentUser;
    const bannerClosed = localStorage.getItem("bannerClosed") === "true";

    if (loggedIn && !isAdmin) {
      if (path.startsWith("/items")) {
        // Fresh reset when entering Items page
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

/* ==========================================================
   🌐 MAIN APPLICATION COMPONENT
========================================================== */
function App() {
  const [showNavbar, setShowNavbar] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  return (
    <>
      {/* State Controllers */}
      <AuthRedirectController setShowNavbar={setShowNavbar} />
      <BannerController setShowBanner={setShowBanner} />
      <BodyClassController />

      {/* Navbar */}
      {showNavbar && <Navbar />}

      {/* Subscription Banner */}
      {showNavbar && showBanner && (
        <div className="relative z-[40]">
          <div className="mt-[56px] md:mt-[64px]"></div>
          <SubscriptionBanner />
        </div>
      )}

      {/* =====================================================
         ROUTES — PHASE 2 READY
      ===================================================== */}
      <Routes>
        {/* -------- Public Routes -------- */}
        <Route path="/" element={<OnboardingSlides />} />
        <Route path="/onboarding" element={<OnboardingSlides />} />
        <Route path="/welcome-back" element={<WelcomeBack />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/health" element={<HealthCheck />} />

        {/* -------- Authenticated User Routes -------- */}
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
              <Items />    {/* 🚀 Phase 2 Premium + Free Items */}
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
              <MyActivity />  {/* 🚀 Phase 2 Delivery Flow Integrated */}
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

        {/* -------- ADMIN ROUTES (Phase 2 Compatible) -------- */}
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

        {/* -------- Fallback -------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Toasts */}
      <Toaster position="top-center" />
    </>
  );
}

/* ==========================================================
   WRAPPER (Providers + Router)
========================================================== */
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
