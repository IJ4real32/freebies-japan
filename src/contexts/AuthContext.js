// ✅ FILE: src/contexts/AuthContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const AuthContext = createContext(undefined);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const userDocUnsubRef = useRef(null);

  /* ------------------------------------------------------------
   * ✅ Refresh the current user (Firebase + Firestore merge)
   * ------------------------------------------------------------ */
  const refreshUser = useCallback(async () => {
    try {
      if (auth.currentUser) {
        // Reload Firebase Auth user
        await auth.currentUser.reload();
        const freshUser = auth.currentUser;

        // Merge with Firestore document if it exists
        const userRef = doc(db, "users", freshUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser({ ...freshUser, ...userSnap.data() });
        } else {
          setCurrentUser(freshUser);
        }

        console.log("🔄 [AuthContext] User refreshed:", freshUser.email);
      }
    } catch (err) {
      console.error("⚠️ refreshUser failed:", err);
    }
  }, []);
   /* ------------------------------------------------------------
   * 👀 Auth state listener
   * ------------------------------------------------------------ */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (userDocUnsubRef.current) userDocUnsubRef.current(); // cleanup old listener

        // Merge user data with Firestore live updates
        const userRef = doc(db, "users", user.uid);
        userDocUnsubRef.current = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              setCurrentUser({ ...user, ...snap.data() });
            } else {
              setCurrentUser(user);
            }
          },
          (err) => console.error("User doc snapshot error:", err)
        );
      } else {
        if (userDocUnsubRef.current) userDocUnsubRef.current();
        setCurrentUser(null);
      }
      setLoading(false);
      setLoadingAuth(false);
    });

    return () => {
      unsubAuth();
      if (userDocUnsubRef.current) userDocUnsubRef.current();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 🔐 Admin + User Composition Helpers                                */
  /* ------------------------------------------------------------------ */
  const checkAdminStatus = useCallback(async (user) => {
    if (!user) return false;
    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims?.admin) return true;

      const adminDocRef = doc(db, "admins", user.uid);
      const adminDocSnap = await getDoc(adminDocRef);
      return adminDocSnap.exists();
    } catch (error) {
      console.error("Admin check error:", error);
      return false;
    }
  }, []);

  const composeUserData = useCallback((authUser, userDocSnap, isAdminFlag) => {
    const profile = userDocSnap?.exists?.() ? userDocSnap.data() : {};

    const trialCreditsRaw =
      typeof profile.trialCreditsLeft === "number"
        ? profile.trialCreditsLeft
        : 5;
    const trialCreditsLeft = Math.max(0, trialCreditsRaw);

    const isSubscribed = !!profile.isSubscribed;
    const isTrialExpired = trialCreditsLeft <= 0 && !isSubscribed;

    return {
      uid: authUser.uid,
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      username: profile.username || null,
      isAdmin: !!isAdminFlag,
      role: isAdminFlag ? "admin" : profile.role || "user",
      ...profile,
      trialCreditsLeft,
      isSubscribed,
      isTrialExpired,
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 👂 User Document Sync                                              */
  /* ------------------------------------------------------------------ */
  const attachUserDocListener = useCallback(
    async (authUser) => {
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }
      if (!authUser) return;

      const isAdmin = await checkAdminStatus(authUser);
      const ref = doc(db, "users", authUser.uid);

      userDocUnsubRef.current = onSnapshot(
        ref,
        (snap) => {
          const composed = composeUserData(authUser, snap, isAdmin);
          setCurrentUser(composed);
        },
        (err) => {
          console.error("User doc listener error:", err);
          setCurrentUser({
            uid: authUser.uid,
            email: authUser.email,
            emailVerified: authUser.emailVerified,
            isAdmin,
            role: isAdmin ? "admin" : "user",
          });
        }
      );
    },
    [checkAdminStatus, composeUserData]
  );

  const fetchUserDataOnce = useCallback(
    async (authUser) => {
      if (!authUser) {
        setCurrentUser(null);
        return null;
      }
      try {
        const [snap, isAdmin] = await Promise.all([
          getDoc(doc(db, "users", authUser.uid)),
          checkAdminStatus(authUser),
        ]);
        const data = composeUserData(authUser, snap, isAdmin);
        setCurrentUser(data);
        return data;
      } catch (error) {
        console.error("Error fetching user data:", error);
        const fallback = {
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          isAdmin: false,
          role: "user",
        };
        setCurrentUser(fallback);
        return fallback;
      }
    },
    [checkAdminStatus, composeUserData]
  );

  /* ------------------------------------------------------------------ */
  /* 🚪 Auth Core Methods                                               */
  /* ------------------------------------------------------------------ */
  const signup = useCallback(
    async (email, password, additionalData = {}) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);

        await setDoc(doc(db, "users", cred.user.uid), {
          email,
          username: additionalData.username || null,
          role: "user",
          createdAt: serverTimestamp(),
          provider: "password",
          trialCreditsLeft: 5,
          isSubscribed: false,
        });

        await cred.user.getIdToken(true);
        return await fetchUserDataOnce(cred.user);
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      }
    },
    [fetchUserDataOnce]
  );

  const login = useCallback(
    async (email, password) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      return await fetchUserDataOnce(cred.user);
    },
    [fetchUserDataOnce]
  );

  const loginWithGoogle = useCallback(async () => {
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
          role: "user",
          createdAt: serverTimestamp(),
          trialCreditsLeft: 5,
          isSubscribed: false,
        });
      }

      await user.getIdToken(true);
      return await fetchUserDataOnce(user);
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  }, [fetchUserDataOnce]);

  const logout = useCallback(async () => {
    try {
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }
      await signOut(auth);
      setCurrentUser(null);
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }, []);

  const adminLogin = useCallback(
    async (email, password) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      const data = await fetchUserDataOnce(cred.user);
      if (!data.isAdmin) {
        await logout();
        throw new Error("Admin privileges required");
      }
      return data;
    },
    [fetchUserDataOnce, logout]
  );

  /* ------------------------------------------------------------------ */
  /* 🧠 Trial Credits Utility Helpers                                   */
  /* ------------------------------------------------------------------ */
  const getUserProfile = useCallback(async (uid) => {
    if (!uid) return null;
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  }, []);

  const updateTrialCredits = useCallback(async (uid, newCredits) => {
    if (!uid || typeof newCredits !== "number") return null;
    try {
      const ref = doc(db, "users", uid);
      await updateDoc(ref, {
        trialCreditsLeft: Math.max(newCredits, 0),
        updatedAt: serverTimestamp(),
      });
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              trialCreditsLeft: Math.max(newCredits, 0),
              isTrialExpired:
                Math.max(newCredits, 0) <= 0 && !prev.isSubscribed,
            }
          : prev
      );
      return newCredits;
    } catch (err) {
      console.error("Error updating trial credits:", err);
      return null;
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* ♻️ Trial Credit + Subscription Management                           */
  /* ------------------------------------------------------------------ */
  const decrementTrialCredit = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return null;

      const currentCredits = snap.data().trialCreditsLeft ?? 5;
      const newCredits = Math.max(currentCredits - 1, 0);
      await updateDoc(userRef, {
        trialCreditsLeft: newCredits,
        updatedAt: serverTimestamp(),
      });

      setCurrentUser((prev) =>
        prev
          ? { ...prev, trialCreditsLeft: newCredits, isTrialExpired: newCredits <= 0 }
          : prev
      );

      return newCredits;
    } catch (err) {
      console.error("Failed to decrement trial credits:", err);
      return null;
    }
  }, []);

  const markUserSubscribed = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        isSubscribed: true,
        subscriptionActivatedAt: serverTimestamp(),
      });
      setCurrentUser((prev) =>
        prev
          ? { ...prev, isSubscribed: true, isTrialExpired: false }
          : prev
      );
      await fetchUserDataOnce(auth.currentUser);
    } catch (err) {
      console.error("Failed to mark user as subscribed:", err);
    }
  }, [fetchUserDataOnce]);

  /* ------------------------------------------------------------------ */
  /* 👀 Auth State Observer                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await user.getIdToken(true);
          await attachUserDocListener(user);
        } else {
          if (userDocUnsubRef.current) {
            userDocUnsubRef.current();
            userDocUnsubRef.current = null;
          }
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
        setLoadingAuth(false);
      }
    });

    return () => {
      unsubscribe();
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }
    };
  }, [attachUserDocListener]);

  /* ------------------------------------------------------------------ */
  /* 🌍 Context Value (Hybrid Backward-Compatible)                      */
  /* ------------------------------------------------------------------ */
  const trialCreditsLeft = currentUser?.trialCreditsLeft ?? 0;
  const isSubscribed = !!currentUser?.isSubscribed;
  const isTrialExpired = trialCreditsLeft <= 0 && !isSubscribed;

  const value = {
    currentUser,
    loading,
    loadingAuth,
    signup,
    login,
    loginWithGoogle,
    adminLogin,
    logout,
    decrementTrialCredit,
    markUserSubscribed,
    getUserProfile,
    updateTrialCredits,
 refreshUser,
    // ✅ Reactive values
    trialCreditsLeft,
    isSubscribed,
    isTrialExpired,

    // ✅ Compatibility helpers
    isAuthenticated: !!currentUser,
    isAdmin: () => currentUser?.isAdmin || false, // ← restored callable for Navbar
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
