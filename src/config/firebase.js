// ✅ FILE: src/config/firebase.js (PATCHED - Fixed Duplicate Initialization)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYgT5dH4fO8_terXBv3rgIO0Q7R2dgALw",
  authDomain: "freebies-japan-v2.firebaseapp.com",
  projectId: "freebies-japan-v2",
  storageBucket: "freebies-japan-v2.firebasestorage.app",
  messagingSenderId: "207761197083",
  appId: "1:207761197083:web:c8575d247f04edd74090be",
  measurementId: "G-L2MNNHB3FR"
};

// ✅ FIXED: Check if Firebase is already initialized to prevent duplicate app error
let app;
let analytics;

if (!getApps().length) {
  // Initialize Firebase only if no app exists
  app = initializeApp(firebaseConfig);
  
  // Initialize Analytics only in client-side environment
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} else {
  // Use existing app instance
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export { analytics };

export default app;