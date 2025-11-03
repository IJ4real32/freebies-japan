import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔔 Send welcome email
  const sendWelcomeEmail = async (userEmail, userName) => {
    try {
      const response = await fetch(
        "https://asia-northeast1-freebies-japan-v2.cloudfunctions.net/sendWelcomeEmail",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, username: userName }),
        }
      );
      const result = await response.json();
      if (!result.ok) console.warn("⚠️ Welcome email might have failed:", result);
      return result;
    } catch (error) {
      console.error("❌ Welcome email error:", error);
      return { ok: false, error: error.message };
    }
  };

  // 📧 Email/Password Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: username });

      await setDoc(doc(db, "users", user.uid), {
        username,
        email,
        displayName: username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        provider: "password",
        trialCreditsLeft: 5,
        isTrialExpired: false,
        isSubscribed: false,
        language: "en",
        signupSource: "password",
      });

      sendWelcomeEmail(email, username);
      navigate("/items");
    } catch (err) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Google Signup
  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
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
          displayName: user.displayName || "New User",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          provider: "google",
          trialCreditsLeft: 5,
          isTrialExpired: false,
          isSubscribed: false,
          language: "en",
          signupSource: "google",
        });
        sendWelcomeEmail(user.email, user.displayName || "New User");
      }
      navigate("/items");
    } catch (err) {
      console.error("❌ Google signup error:", err);
      setError(err.message || "Google signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8 transition-all">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Create an Account
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Choose a username"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400"
            disabled={loading}
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400"
            disabled={loading}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400"
            disabled={loading}
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
            {loading ? "Creating Account…" : "Sign Up"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="h-px bg-gray-200 dark:bg-gray-600 flex-1"></div>
          <span className="mx-3 text-sm text-gray-400 dark:text-gray-300">or</span>
          <div className="h-px bg-gray-200 dark:bg-gray-600 flex-1"></div>
        </div>

        {/* Google Signup */}
        <button
          onClick={handleGoogleSignup}
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
          Already have an account?{" "}
          <span
            onClick={() => !loading && navigate("/login")}
            className={`font-medium ${
              loading
                ? "text-gray-400 cursor-not-allowed"
                : "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
            }`}
          >
            Log In
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
