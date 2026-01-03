// ✅ FILE: src/contexts/AuthContext.js
// STRICTMODE-SAFE + FIRESTORE-STABLE (PHASE-2 FINAL)

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

// ------------------------------------------------------------------
// CONTEXT
// ------------------------------------------------------------------

const AuthContext = createContext(undefined);
export const useAuth = () => useContext(AuthContext);

// ------------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 🔒 STRICTMODE SAFETY REFS
  const userDocUnsubRef = useRef(null);
  const userListenerUidRef = useRef(null);
  const attachingRef = useRef(false);

  // ------------------------------------------------------------------
  // 🔄 Refresh user (manual)
  // ------------------------------------------------------------------

  const refreshUser = useCallback(async () => {
    try {
      if (!auth.currentUser) return;

      await auth.currentUser.reload();
      const freshUser = auth.currentUser;

      const snap = await getDoc(doc(db, "users", freshUser.uid));
      if (snap.exists()) {
        setCurrentUser({ ...freshUser, ...snap.data() });
      } else {
        setCurrentUser(freshUser);
      }
    } catch (err) {
      console.error("refreshUser failed:", err);
    }
  }, []);

  // ------------------------------------------------------------------
  // 🛡️ Admin check (claims + Firestore)
  // ------------------------------------------------------------------

  const checkAdminStatus = useCallback(async (user) => {
    if (!user) return false;

    try {
      const token = await user.getIdTokenResult(true);

      if (token.claims?.admin === true) return true;
      if (token.claims?.email === "gnetstelecom@gmail.com") return true;

      const adminSnap = await getDoc(doc(db, "admins", user.uid));
      return adminSnap.exists();
    } catch (err) {
      console.error("Admin check error:", err);
      return false;
    }
  }, []);

  // ------------------------------------------------------------------
  // 🧩 Compose unified user object
  // ------------------------------------------------------------------

  const composeUserData = useCallback(
    (authUser, userDocSnap, isAdminFlag) => {
      const profile = userDocSnap?.exists?.() ? userDocSnap.data() : {};

      const rawCredits =
        typeof profile.trialCreditsLeft === "number"
          ? profile.trialCreditsLeft
          : 5;

      const trialCreditsLeft = Math.max(0, rawCredits);
      const isSubscribed = !!profile.isSubscribed;
      const isTrialExpired = trialCreditsLeft <= 0 && !isSubscribed;

      return {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        username: profile.username || null,
        ...profile,

        // 🔑 derived
        trialCreditsLeft,
        isSubscribed,
        isTrialExpired,

        // 🔑 role
        isAdmin: !!isAdminFlag,
        role: isAdminFlag ? "admin" : profile.role || "user",
      };
    },
    []
  );

  // ------------------------------------------------------------------
  // 👂 STRICTMODE-SAFE Firestore user doc listener
  // ------------------------------------------------------------------

  const attachUserDocListener = useCallback(
    async (authUser) => {
      if (!authUser?.uid) return;

      // 🔒 Guard against duplicate attach
      if (attachingRef.current) return;
      if (userListenerUidRef.current === authUser.uid) return;

      attachingRef.current = true;

      try {
        // Cleanup previous listener
        if (userDocUnsubRef.current) {
          userDocUnsubRef.current();
          userDocUnsubRef.current = null;
        }

        const isAdmin = await checkAdminStatus(authUser);
        const ref = doc(db, "users", authUser.uid);

        userListenerUidRef.current = authUser.uid;

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
      } finally {
        attachingRef.current = false;
      }
    },
    [checkAdminStatus, composeUserData]
  );

  // ------------------------------------------------------------------
  // 📥 One-time fetch (used for login/signup)
  // ------------------------------------------------------------------

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
      } catch (err) {
        console.error("fetchUserDataOnce error:", err);
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

  // ------------------------------------------------------------------
  // 🔐 Auth methods
  // ------------------------------------------------------------------

  const signup = useCallback(
    async (email, password, additionalData = {}) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        username: additionalData.username || null,
        role: "user",
        provider: "password",
        trialCreditsLeft: 5,
        isSubscribed: false,
        createdAt: serverTimestamp(),
      });

      await cred.user.getIdToken(true);
      return await fetchUserDataOnce(cred.user);
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
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        username: user.displayName || "New User",
        email: user.email,
        provider: "google",
        role: "user",
        trialCreditsLeft: 5,
        isSubscribed: false,
        createdAt: serverTimestamp(),
      });
    }

    await user.getIdToken(true);
    return await fetchUserDataOnce(user);
  }, [fetchUserDataOnce]);

  const logout = useCallback(async () => {
    try {
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }
      userListenerUidRef.current = null;
      await signOut(auth);
      setCurrentUser(null);
      window.location.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  // ------------------------------------------------------------------
  // 🔄 Auth state observer (STRICTMODE-SAFE)
  // ------------------------------------------------------------------

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
          userListenerUidRef.current = null;
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
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
      userListenerUidRef.current = null;
    };
  }, [attachUserDocListener]);

  // ------------------------------------------------------------------
  // 🎯 Derived helpers
  // ------------------------------------------------------------------

  const trialCreditsLeft = currentUser?.trialCreditsLeft ?? 0;
  const isSubscribed = !!currentUser?.isSubscribed;
  const isTrialExpired = trialCreditsLeft <= 0 && !isSubscribed;
  const isAdmin = !!currentUser?.isAdmin;

  const value = {
    currentUser,
    loading,
    loadingAuth,

    signup,
    login,
    loginWithGoogle,
    logout,

    refreshUser,

    trialCreditsLeft,
    isSubscribed,
    isTrialExpired,
    isAdmin,

    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
