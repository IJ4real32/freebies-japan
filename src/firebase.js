
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
 apiKey: "AIzaSyDYgT5dH4fO8_terXBv3rgIO0Q7R2dgALw",
  authDomain: "freebies-japan-v2.firebaseapp.com",
  projectId: "freebies-japan-v2",
  storageBucket: "freebies-japan-v2.firebasestorage.app",
  messagingSenderId: "207761197083",
  appId: "1:207761197083:web:c8575d247f04edd74090be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Export the services you'll use
export { db, auth, storage };

// Optional: Export the Firebase app in case you need it elsewhere
export default app;


