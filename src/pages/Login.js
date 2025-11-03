import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;
  const targetAfterLogin =
    !from || from === "/" || from === "/login" ? "/items" : from;

  // 📧 Email + Password Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate(targetAfterLogin, { replace: true });
    } catch (err) {
      const msg = (err?.code || err?.message || "").toString();
      setError(
        msg.includes("wrong-password") || msg.includes("auth/invalid-credential")
          ? "Invalid email or password"
          : "Failed to log in"
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Google Login
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        await setDoc(userRef, {
          username: user.displayName || "New User",
          email: user.email,
          provider: "google",
          createdAt: serverTimestamp(),
        });
      }
      navigate("/items");
    } catch (err) {
      console.error(err);
      setError("Google login failed. Please try again.");
    }
  };

  // ----------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8 transition-all">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Welcome Back
        </h2>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-full font-semibold text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Logging In…" : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="h-px bg-gray-200 dark:bg-gray-600 flex-1"></div>
          <span className="mx-3 text-sm text-gray-400 dark:text-gray-300">
            or
          </span>
          <div className="h-px bg-gray-200 dark:bg-gray-600 flex-1"></div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium shadow transition ${
            loading
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
          }`}
        >
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
