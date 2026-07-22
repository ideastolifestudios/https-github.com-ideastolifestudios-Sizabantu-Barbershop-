import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to universally hunt down environment variables across Vite and Next.js conventions
const getEnv = (key: string): string => {
  const meta = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const proc = typeof process !== "undefined" && process.env ? process.env : {};
  
  return (
    meta[`VITE_${key}`] ||
    meta[`NEXT_PUBLIC_${key}`] ||
    meta[key] ||
    proc[`VITE_${key}`] ||
    proc[`NEXT_PUBLIC_${key}`] ||
    proc[key] ||
    ""
  );
};

const firebaseConfig = {
  apiKey: getEnv("FIREBASE_API_KEY"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID")
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
