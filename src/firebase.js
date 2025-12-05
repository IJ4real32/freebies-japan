// ✅ FILE: src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

/* --------------------------------------------------------------------
   Firebase configuration (Freebies Japan - Production)
   Storage bucket preserved exactly as requested
--------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDYgT5dH4fO8_terXBv3rgIO0Q7R2dgALw",
  authDomain: "freebies-japan-v2.firebaseapp.com",
  projectId: "freebies-japan-v2",
  storageBucket: "freebies-japan-v2.firebasestorage.app",   // ✅ maintained as you asked
  messagingSenderId: "207761197083",
  appId: "1:207761197083:web:c8575d247f04edd74090be",
};

/* --------------------------------------------------------------------
   Initialize Firebase App
--------------------------------------------------------------------- */
const app = initializeApp(firebaseConfig);

/* --------------------------------------------------------------------
   Initialize Core Firebase Services
--------------------------------------------------------------------- */
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/* --------------------------------------------------------------------
   Cloud Functions (GEN-2, Tokyo Region)
--------------------------------------------------------------------- */
const functions = getFunctions(app, "asia-northeast1");

/* --------------------------------------------------------------------
   Exports (Phase-2 Standard)
--------------------------------------------------------------------- */
export { app, db, auth, storage, functions, httpsCallable };

// Default export for legacy imports
export default app;
