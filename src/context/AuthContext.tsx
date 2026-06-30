// src/context/AuthContext.tsx
// React context that listens to Firebase Auth state and provides the user + role to the app.
// Improvements included:
// - use onIdTokenChanged to pick up token/claim updates
// - use onSnapshot to listen to realtime role changes in Firestore
// - check custom claims (preferred) and fallback to Firestore
// - stronger typing for user profile
// - mounted flag to avoid state updates after unmount

import React, { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { doc, onSnapshot, DocumentSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase-config";

// Strongly-typed Firestore user profile
interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: "customer" | "barber" | "admin";
  createdAt?: any;
  lastLogin?: any;
  status?: string;
}

// Define what our Auth State looks like
interface AuthState {
  user: User | null;
  role: "customer" | "barber" | "admin" | null;
  // `loading` is true while either auth or role is being resolved
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let unsubscribeProfile: (() => void) | null = null;

    // Listen to ID token changes so we pick up custom claim updates as well
    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      // If user is signed out
      if (!firebaseUser) {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (!mounted) return;
        setState({ user: null, role: null, loading: false });
        return;
      }

      // We have a signed-in user; optimistically set user and show loading until role resolved
      if (!mounted) return;
      setState((s) => ({ ...s, user: firebaseUser, loading: true }));

      try {
        // 1) Prefer role from custom claims (set server-side via Admin SDK)
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const claimRole = idTokenResult?.claims?.role as AuthState["role"] | undefined;

        if (claimRole) {
          if (!mounted) return;
          // Attach a snapshot listener too so role updates in Firestore reflect in UI
          const ref = doc(db, "users", firebaseUser.uid);
          unsubscribeProfile = onSnapshot(
            ref,
            (snap: DocumentSnapshot) => {
              if (!mounted) return;
              if (snap.exists()) {
                const data = snap.data() as UserProfile | undefined;
                // If Firestore has an authoritative role different from claim, prefer claim for security
                setState({ user: firebaseUser, role: claimRole, loading: false });
              } else {
                // Firestore doc missing — still use claim
                setState({ user: firebaseUser, role: claimRole, loading: false });
              }
            },
            (err) => {
              console.error("Error listening to user profile snapshot:", err);
              if (!mounted) return;
              setState({ user: firebaseUser, role: claimRole ?? null, loading: false });
            }
          );

          return;
        }

        // 2) Fallback: listen to the Firestore user doc for role
        const ref = doc(db, "users", firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          ref,
          (snap: DocumentSnapshot) => {
            if (!mounted) return;
            if (snap.exists()) {
              const data = snap.data() as UserProfile | undefined;
              setState({ user: firebaseUser, role: data?.role ?? "customer", loading: false });
            } else {
              // If profile doesn't exist yet, fall back to 'customer'
              setState({ user: firebaseUser, role: "customer", loading: false });
            }
          },
          (err) => {
            console.error("Error listening to user profile snapshot:", err);
            if (!mounted) return;
            setState({ user: firebaseUser, role: null, loading: false });
          }
        );
      } catch (error) {
        console.error("Error resolving user role:", error);
        if (!mounted) return;
        setState({ user: firebaseUser, role: null, loading: false });
      }
    });

    return () => {
      mounted = false;
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

// Custom hook to use Auth state anywhere in the application
export const useAuth = () => useContext(AuthContext);
