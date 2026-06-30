// src/context/AuthContext.tsx
// React context that listens to Firebase Auth state and provides the user + role to the app.

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";

// Define what our Auth State looks like
interface AuthState {
  user: User | null;
  role: "customer" | "barber" | "admin" | null;
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
    // 1. Listen to Firebase Auth state changes (handles persistent login sessions)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 2. Fetch user's role from the Firestore document we created in Step 2
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as { role?: AuthState["role"] } | undefined;
            setState({
              user: firebaseUser,
              role: userData?.role ?? "customer",
              loading: false,
            });
          } else {
            // Fallback if Auth exists but Firestore document hasn't populated yet
            setState({ user: firebaseUser, role: "customer", loading: false });
          }
        } catch (error) {
          console.error("Error fetching user profile role:", error);
          setState({ user: firebaseUser, role: null, loading: false });
        }
      } else {
        // User is logged out
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

// Custom hook to use Auth state anywhere in the application
export const useAuth = () => useContext(AuthContext);
