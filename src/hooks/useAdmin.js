import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";

/**
 * Returns true if the current user is an admin.
 * Logic:
 *  1) Custom claim "admin" on the ID token
 *  2) Super-admin by verified email (matches your rules)
 *  3) Fallback: presence of /admins/{uid} doc in Firestore
 */
export default function useAdmin() {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!currentUser) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      // 1) custom claim
      try {
        const token = await currentUser.getIdTokenResult(true);
        if (!cancelled && token?.claims?.admin === true) {
          setIsAdmin(true);
          return;
        }
        // 2) super-admin email (mirrors Firestore rules)
        if (
          !cancelled &&
          token?.claims?.email === "gnetstelecom@gmail.com" &&
          token?.claims?.email_verified === true
        ) {
          setIsAdmin(true);
          return;
        }
      } catch {
        // ignore, fall through to Firestore check
      }

      // 3) fallback: /admins/{uid}
      try {
        const snap = await getDoc(doc(db, "admins", currentUser.uid));
        if (!cancelled) setIsAdmin(snap.exists());
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [currentUser]);

  return isAdmin;
}
