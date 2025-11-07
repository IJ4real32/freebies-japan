// ✅ FILE: src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
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

/* ------------------------------------------------------------
 * Auth redirect + Navbar visibility controller
 * ------------------------------------------------------------ */
function AuthRedirectController({ setShowNavbar }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const isPublicPage = [
        "/login",
        "/signup",
        "/onboarding",
        "/admin-login",
        "/unauthorized",
      ].some((p) => location.pathname.startsWith(p));

      const isAdminPage = location.pathname.startsWith("/admin");

      if (user) {
        setShowNavbar(!isAdminPage);
        if (isPublicPage || location.pathname === "/") {
          navigate("/items", { replace: true });
        }
      } else {
        const hideNavbarRoutes = ["/onboarding", "/login", "/signup", "/admin"];
        setShowNavbar(
          !hideNavbarRoutes.some((p) => location.pathname.startsWith(p))
        );
        if (location.pathname === "/") {
          navigate("/onboarding", { replace: true });
        }
      }
    });
    return () => unsub();
  }, [navigate, location, setShowNavbar]);

  return null;
}

/* ------------------------------------------------------------
 * Main App Component
 * ------------------------------------------------------------ */
function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AuthRedirectController setShowNavbar={setShowNavbar} />
          {showNavbar && <Navbar />}

          {/* ✅ App Routes */}
          <Routes>
            {/* Public + Onboarding */}
            <Route path="/" element={<OnboardingSlides />} />
            <Route path="/onboarding" element={<OnboardingSlides />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/health" element={<HealthCheck />} />

            {/* User Routes */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route path="/items" element={<Items />} />
            <Route
              path="/donate"
              element={
                <PrivateRoute>
                  <Donate />
                </PrivateRoute>
              }
            />

            {/* ⚠️ Removed /subscribe page route (replaced with modal) */}
            {/* <Route
              path="/subscribe"
              element={
                <PrivateRoute>
                  <DonateMoney />
                </PrivateRoute>
              }
            /> */}

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

            {/* ------------------------------------------------------------
             * Admin Protected Routes
             * ------------------------------------------------------------ */}
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

            {/* ✅ Admin Create Sponsored Item Route */}
            <Route
              path="/admin/create-donation"
              element={
                <PrivateRouteAdmin>
                  <AdminDonate />
                </PrivateRouteAdmin>
              }
            />

            {/* Deliveries Route */}
            <Route
              path="/admin/pickups"
              element={
                <PrivateRouteAdmin>
                  <AdminPickups />
                </PrivateRouteAdmin>
              }
            />
          </Routes>

          {/* ✅ Global Toast Notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#fff",
                color: "#333",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "0.9rem",
              },
              success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
