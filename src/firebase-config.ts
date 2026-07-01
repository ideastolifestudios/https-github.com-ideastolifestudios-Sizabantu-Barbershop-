// src/firebase-config.ts
// Firebase client initialization (TypeScript, Firebase v9 modular)
// Reads configuration from environment variables (e.g. NEXT_PUBLIC_FIREBASE_...)
// DO NOT put service account JSON or other secrets in this file or repository.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

// Initialize Firebase app once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exports for the rest of the frontend
export const auth = getAuth(app);
export const db = getFirestore(app);

// Usage notes (do NOT commit secrets):
// - For client-side code, the Firebase "client config" (apiKey, authDomain, projectId...)
//   is safe to expose in your frontend build; keep it in env vars (NEXT_PUBLIC_... for Next.js).
// - For server-side admin tasks (Cloud Functions, backend), load the service account JSON
//   from secure storage or GitHub Secrets at runtime. Do NOT commit service account JSON to the repo.
