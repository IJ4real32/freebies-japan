// ✅ FILE: src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions"; // ✅ include httpsCallable

// ------------------------------------------------------------------
// Firebase configuration (Freebies Japan - Production)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDYgT5dH4fO8_terXBv3rgIO0Q7R2dgALw",
  authDomain: "freebies-japan-v2.firebaseapp.com",
  projectId: "freebies-japan-v2",
  storageBucket: "freebies-japan-v2.firebasestorage.app", // ✅ corrected domain
  messagingSenderId: "207761197083",
  appId: "1:207761197083:web:c8575d247f04edd74090be",
};

// ------------------------------------------------------------------
// Initialize Firebase app
// ------------------------------------------------------------------
const app = initializeApp(firebaseConfig);

// ------------------------------------------------------------------
// Initialize Firebase services
// ------------------------------------------------------------------
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ Use regional Cloud Functions endpoint
const functions = getFunctions(app, "asia-northeast1");

// ------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------
export { app, db, auth, storage, functions, httpsCallable };

// Default export for compatibility
export default app;
