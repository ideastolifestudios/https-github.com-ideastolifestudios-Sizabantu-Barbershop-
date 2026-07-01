#!/usr/bin/env bash
# Sizabantu Barbershop — Phase 9 Authentication
# Run from repo root: bash phase9_auth.sh
set -e

echo "🔐 Phase 9 — Auth & Authorization"
mkdir -p src/pages src/auth src/context

# ═══════════════════════════════════════════════════
# FILE 1: src/firebase-config.ts
# ═══════════════════════════════════════════════════
cat > src/firebase-config.ts << 'FIREBASE_CONFIG_EOF'
// src/firebase-config.ts
// Single source of truth for Firebase initialization.
// All other files import { auth, db } from HERE — never call initializeApp elsewhere.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: String(firebaseAppletConfig.messagingSenderId),
  appId: firebaseAppletConfig.appId,
};

// Singleton — only initialize once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
FIREBASE_CONFIG_EOF
echo "  ✔ src/firebase-config.ts"


# ═══════════════════════════════════════════════════
# FILE 2: src/context/AuthContext.tsx
# ═══════════════════════════════════════════════════
cat > src/context/AuthContext.tsx << 'AUTH_CONTEXT_EOF'
// src/context/AuthContext.tsx
// Provides Firebase Auth state + Firestore role to the entire app.

import React, { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import {
  doc, onSnapshot, updateDoc, serverTimestamp, DocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase-config";

export type UserRole = "customer" | "barber" | "admin" | "superAdmin";

export interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: UserRole;
  createdAt?: unknown;
  lastLogin?: unknown;
  status?: "active" | "disabled";
}

interface AuthState {
  user: User | null;
  role: UserRole | null;
  profile: UserProfile | null;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isBarber: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, role: null, profile: null, loading: true,
  isAdmin: false, isSuperAdmin: false, isBarber: false, isCustomer: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null, role: null, profile: null, loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }

      if (!firebaseUser) {
        setState({ user: null, role: null, profile: null, loading: false });
        return;
      }

      setState((s) => ({ ...s, user: firebaseUser, loading: true }));

      // Track lastLogin silently
      updateDoc(doc(db, "users", firebaseUser.uid), {
        lastLogin: serverTimestamp(),
      }).catch(() => null);

      // Real-time Firestore role listener
      const ref = doc(db, "users", firebaseUser.uid);
      unsubscribeProfile = onSnapshot(ref, (snap: DocumentSnapshot) => {
        if (!mounted) return;
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setState({ user: firebaseUser, role: data.role ?? "customer", profile: data, loading: false });
        } else {
          setState({ user: firebaseUser, role: "customer", profile: null, loading: false });
        }
      }, () => {
        if (!mounted) return;
        setState({ user: firebaseUser, role: "customer", profile: null, loading: false });
      });
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  const value: AuthContextValue = {
    ...state,
    isAdmin: state.role === "admin" || state.role === "superAdmin",
    isSuperAdmin: state.role === "superAdmin",
    isBarber: state.role === "barber",
    isCustomer: state.role === "customer" || state.role === null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
AUTH_CONTEXT_EOF
echo "  ✔ src/context/AuthContext.tsx"


# ═══════════════════════════════════════════════════
# FILE 3: src/auth/ProtectedRoute.tsx
# ═══════════════════════════════════════════════════
cat > src/auth/ProtectedRoute.tsx << 'PROTECTED_ROUTE_EOF'
// src/auth/ProtectedRoute.tsx
// Role-based route guard. Redirects unauthenticated + wrong-role users.

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
}

const ROLE_HOME: Record<string, string> = {
  superAdmin: "/admin-dashboard",
  admin: "/admin-dashboard",
  barber: "/barber-dashboard",
  customer: "/",
};

export default function ProtectedRoute({
  children,
  roles,
  redirectTo = "/auth",
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] ?? "/"} replace />;
  }

  return <>{children}</>;
}
PROTECTED_ROUTE_EOF
echo "  ✔ src/auth/ProtectedRoute.tsx"


# ═══════════════════════════════════════════════════
# FILE 4: src/pages/AuthPage.tsx
# ═══════════════════════════════════════════════════
cat > src/pages/AuthPage.tsx << 'AUTH_PAGE_EOF'
// src/pages/AuthPage.tsx
// Unified: Sign-in · Create account · Forgot password
// Redirects by role after login: admin→/admin-dashboard barber→/barber-dashboard customer→/

import React, { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

type AuthMode = "signin" | "signup" | "forgot";

const ROLE_REDIRECT: Record<string, string> = {
  superAdmin: "/admin-dashboard",
  admin: "/admin-dashboard",
  barber: "/barber-dashboard",
  customer: "/",
};

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user && role) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from ?? ROLE_REDIRECT[role] ?? "/", { replace: true });
    }
  }, [user, role, authLoading, navigate, location]);

  useEffect(() => {
    setError(""); setSuccess("");
    firstRef.current?.focus();
  }, [mode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      setError(friendlyError((err as { code?: string }).code ?? ""));
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = cred.user;
      await updateProfile(fbUser, { displayName: fullName.trim() });
      await setDoc(doc(db, "users", fbUser.uid), {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phone.trim(),
        role: "customer",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        status: "active",
      });
      await sendEmailVerification(fbUser);
      setSuccess("Account created! Check your email to verify, then sign in.");
      setMode("signin");
    } catch (err: unknown) {
      setError(friendlyError((err as { code?: string }).code ?? ""));
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!email.trim()) return setError("Enter your email address first.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Reset email sent! Check your inbox.");
    } catch (err: unknown) {
      setError(friendlyError((err as { code?: string }).code ?? ""));
    } finally { setLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-spinner-wrap"><div className="auth-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3L3 6l3 3 6-6"/><path d="M18 3l3 3-3 3-6-6"/>
              <circle cx="12" cy="12" r="3"/><path d="M12 15v6"/>
            </svg>
          </div>
          <div>
            <p className="auth-brand-name">Sizabantu</p>
            <p className="auth-brand-sub">Barbershop</p>
          </div>
        </div>

        {/* Tabs */}
        {mode !== "forgot" && (
          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={mode === "signin"} className={`auth-tab ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")} type="button">Sign in</button>
            <button role="tab" aria-selected={mode === "signup"} className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")} type="button">Create account</button>
          </div>
        )}

        {/* Heading */}
        <div className="auth-heading">
          {mode === "forgot" && (
            <button className="auth-back-btn" onClick={() => setMode("signin")} type="button">← Back to sign in</button>
          )}
          <h2>{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}</h2>
          {mode === "forgot" && <p className="auth-sub-text">Enter your email and we'll send a reset link.</p>}
        </div>

        {/* Alerts */}
        {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
        {success && <div className="auth-alert auth-alert-success" role="status">{success}</div>}

        {/* Sign In */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="si-email">Email</label>
              <input ref={firstRef} id="si-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} autoComplete="email"/>
            </div>
            <div className="auth-field">
              <div className="auth-field-row">
                <label htmlFor="si-pw">Password</label>
                <button type="button" className="auth-text-btn" onClick={() => setMode("forgot")}>Forgot password?</button>
              </div>
              <div className="auth-pw-wrap">
                <input id="si-pw" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required disabled={loading} autoComplete="current-password"/>
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-btn-dot"/> : "Sign in"}
            </button>
          </form>
        )}

        {/* Sign Up */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="su-name">Full name</label>
              <input ref={firstRef} id="su-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required disabled={loading} autoComplete="name"/>
            </div>
            <div className="auth-field">
              <label htmlFor="su-email">Email</label>
              <input id="su-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} autoComplete="email"/>
            </div>
            <div className="auth-field">
              <label htmlFor="su-phone">Phone <span className="auth-optional">(optional)</span></label>
              <input id="su-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 71 000 0000" disabled={loading} autoComplete="tel"/>
            </div>
            <div className="auth-field">
              <label htmlFor="su-pw">Password</label>
              <div className="auth-pw-wrap">
                <input id="su-pw" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required disabled={loading} autoComplete="new-password"/>
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="su-confirm">Confirm password</label>
              <input id="su-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required disabled={loading} autoComplete="new-password"/>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-btn-dot"/> : "Create account"}
            </button>
            <p className="auth-legal">By creating an account you agree to our terms of service.</p>
          </form>
        )}

        {/* Forgot Password */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="fp-email">Email</label>
              <input ref={firstRef} id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} autoComplete="email"/>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-btn-dot"/> : "Send reset link"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
AUTH_PAGE_EOF
echo "  ✔ src/pages/AuthPage.tsx"


# ═══════════════════════════════════════════════════
# FILE 5: src/pages/AuthPage.css
# ═══════════════════════════════════════════════════
cat > src/pages/AuthPage.css << 'AUTH_CSS_EOF'
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #07080b;
  background-image:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,160,60,0.06) 0%, transparent 70%);
  padding: 24px;
  font-family: 'DM Sans', sans-serif;
}

.auth-card {
  width: 100%;
  max-width: 404px;
  background: #0f1014;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 22px;
  padding: 36px 36px 40px;
  box-shadow: 0 32px 64px rgba(0,0,0,0.6);
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 28px;
}

.auth-brand-icon {
  width: 42px; height: 42px;
  background: #1a1c23;
  border: 1px solid rgba(200,160,60,0.22);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #c8a03c; flex-shrink: 0;
}

.auth-brand-name {
  font-family: 'Syne', sans-serif;
  font-size: 17px; font-weight: 800;
  color: #fff; letter-spacing: -0.02em;
  line-height: 1.1; margin: 0;
}

.auth-brand-sub {
  font-size: 10.5px; color: #4b5563; font-weight: 400;
  letter-spacing: 0.12em; text-transform: uppercase; margin: 2px 0 0;
}

.auth-tabs {
  display: flex;
  background: #09090d;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 11px;
  padding: 4px; margin-bottom: 24px; gap: 2px;
}

.auth-tab {
  flex: 1; padding: 8px 10px;
  font-size: 13.5px; font-weight: 500; color: #4b5563;
  background: transparent; border: none; border-radius: 8px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  transition: background 0.16s, color 0.16s;
}

.auth-tab.active {
  background: #1a1c23; color: #f3f4f6;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.auth-tab:hover:not(.active) { color: #9ca3af; }

.auth-heading { margin-bottom: 20px; }

.auth-heading h2 {
  font-family: 'Syne', sans-serif;
  font-size: 21px; font-weight: 700;
  color: #fff; letter-spacing: -0.03em;
  margin: 0 0 3px; line-height: 1.2;
}

.auth-sub-text { font-size: 13.5px; color: #6b7280; margin: 4px 0 0; }

.auth-back-btn {
  display: inline-flex; align-items: center;
  font-size: 12.5px; color: #6b7280;
  background: none; border: none; cursor: pointer;
  padding: 0; margin-bottom: 10px;
  font-family: 'DM Sans', sans-serif;
  transition: color 0.14s;
}
.auth-back-btn:hover { color: #d1d5db; }

.auth-alert {
  border-radius: 10px; padding: 11px 14px;
  font-size: 13.5px; line-height: 1.45; margin-bottom: 16px;
}
.auth-alert-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); color: #fca5a5; }
.auth-alert-success { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.18); color: #86efac; }

.auth-form { display: flex; flex-direction: column; gap: 14px; }

.auth-field { display: flex; flex-direction: column; gap: 6px; }

.auth-field label { font-size: 13px; font-weight: 500; color: #9ca3af; display: flex; align-items: center; gap: 5px; }

.auth-optional { font-weight: 400; color: #374151; font-size: 12px; }

.auth-field-row { display: flex; justify-content: space-between; align-items: center; }

.auth-field input {
  background: #09090d;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; padding: 11px 14px;
  font-size: 14.5px; color: #f3f4f6;
  font-family: 'DM Sans', sans-serif;
  width: 100%; box-sizing: border-box;
  outline: none; -webkit-appearance: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}
.auth-field input:focus {
  border-color: rgba(200,160,60,0.4);
  box-shadow: 0 0 0 3px rgba(200,160,60,0.07);
}
.auth-field input::placeholder { color: #2d3748; }
.auth-field input:disabled { opacity: 0.4; cursor: not-allowed; }

.auth-pw-wrap { position: relative; }
.auth-pw-wrap input { padding-right: 56px; }

.auth-eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: #374151;
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; cursor: pointer;
  font-family: 'DM Sans', sans-serif; padding: 0;
  transition: color 0.14s;
}
.auth-eye-btn:hover { color: #9ca3af; }

.auth-text-btn {
  font-size: 12.5px; color: #6b7280;
  background: none; border: none; cursor: pointer; padding: 0;
  font-family: 'DM Sans', sans-serif;
  text-decoration: underline; text-decoration-color: transparent;
  transition: color 0.14s, text-decoration-color 0.14s;
}
.auth-text-btn:hover { color: #d1d5db; text-decoration-color: currentColor; }

.auth-submit-btn {
  width: 100%; padding: 12px;
  background: #c8a03c; color: #07080b;
  border: none; border-radius: 10px;
  font-size: 14.5px; font-weight: 700;
  font-family: 'DM Sans', sans-serif; cursor: pointer;
  margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  min-height: 46px; letter-spacing: 0.01em;
  transition: background 0.14s, opacity 0.14s;
}
.auth-submit-btn:hover:not(:disabled) { background: #d4ac45; }
.auth-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.auth-btn-dot {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(7,8,11,0.3); border-top-color: #07080b;
  border-radius: 50%; animation: auth-spin 0.55s linear infinite;
}

.auth-legal { font-size: 12px; color: #374151; text-align: center; margin: 4px 0 0; }

.auth-spinner-wrap, .auth-loading {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #07080b;
}

.auth-spinner {
  width: 28px; height: 28px;
  border: 2.5px solid rgba(255,255,255,0.08);
  border-top-color: rgba(200,160,60,0.8);
  border-radius: 50%; animation: auth-spin 0.65s linear infinite;
}

@keyframes auth-spin { to { transform: rotate(360deg); } }

@media (max-width: 460px) {
  .auth-card { padding: 28px 20px 32px; border-radius: 16px; }
}
AUTH_CSS_EOF
echo "  ✔ src/pages/AuthPage.css"


# ═══════════════════════════════════════════════════
# FILE 6: src/main.tsx
# ═══════════════════════════════════════════════════
cat > src/main.tsx << 'MAIN_TSX_EOF'
// src/main.tsx — Phase 9: AuthProvider + role-based protected routes
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProtectedRoute from "./auth/ProtectedRoute.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Legacy: /admin-login → /auth */}
          <Route path="/admin-login" element={<Navigate to="/auth" replace />} />

          {/* ── Admin dashboard — admin + superAdmin only ── */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute roles={["admin", "superAdmin"]}>
                <App />
              </ProtectedRoute>
            }
          />

          {/* ── Barber dashboard — barbers + admins ── */}
          <Route
            path="/barber-dashboard"
            element={
              <ProtectedRoute roles={["barber", "admin", "superAdmin"]}>
                <App />
              </ProtectedRoute>
            }
          />

          {/* ── Customer / public ── */}
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>
);
MAIN_TSX_EOF
echo "  ✔ src/main.tsx"


# ═══════════════════════════════════════════════════
# PATCH: src/App.tsx — Fix Firebase duplicate instance
# ═══════════════════════════════════════════════════
echo ""
echo "🔧 Patching src/App.tsx (removing duplicate Firebase init)..."

# Use Python for reliable multi-line replacement
python3 << 'PYTHON_PATCH_EOF'
import re, sys

with open("src/App.tsx", "r") as f:
    content = f.read()

# Pattern: remove initializeApp import
content = re.sub(r"import \{ initializeApp \} from 'firebase/app';\n", "", content)

# Remove firebaseConfig JSON import
content = re.sub(r"import firebaseConfig from '../firebase-applet-config\.json';\n", "", content)

# Remove getAuth from firebase/auth import (keep others)
content = re.sub(r",?\s*getAuth", "", content)

# Remove getFirestore from firebase/firestore import (keep others)  
content = re.sub(r",?\s*getFirestore", "", content)

# Remove Firebase initialization block
old_init = """// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const socket = io();"""

new_init = """import { auth, db } from './firebase-config';

const googleProvider = new GoogleAuthProvider();
const socket = io();"""

if old_init in content:
    content = content.replace(old_init, new_init)
    print("  ✔ Replaced Firebase init block in App.tsx")
else:
    # Try a more targeted approach - just add the import after existing imports
    # and remove the 3 init lines individually
    init_lines_to_remove = [
        "const app = initializeApp(firebaseConfig);",
        "export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);",
        "const auth = getAuth(app);",
        "// Initialize Firebase",
    ]
    for line in init_lines_to_remove:
        content = content.replace(line + "\n", "")
    
    # Add the import before googleProvider
    if "import { auth, db } from './firebase-config';" not in content:
        content = content.replace(
            "const googleProvider = new GoogleAuthProvider();",
            "import { auth, db } from './firebase-config';\n\nconst googleProvider = new GoogleAuthProvider();"
        )
    print("  ✔ Patched Firebase imports in App.tsx (fallback mode)")

# Clean up double blank lines
content = re.sub(r'\n{3,}', '\n\n', content)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("  ✔ src/App.tsx patched")
PYTHON_PATCH_EOF


# ═══════════════════════════════════════════════════
# GIT — commit and push
# ═══════════════════════════════════════════════════
echo ""
echo "📦 Staging files for commit..."

git add \
  src/firebase-config.ts \
  src/context/AuthContext.tsx \
  src/auth/ProtectedRoute.tsx \
  src/pages/AuthPage.tsx \
  src/pages/AuthPage.css \
  src/main.tsx \
  src/App.tsx

echo ""
git diff --cached --stat
echo ""

git commit -m "feat(auth): Phase 9 — unified auth system

- Single Firebase instance via firebase-config.ts (fixes silent auth failure)
- AuthProvider with real-time Firestore role detection
- Unified AuthPage: sign-in / create account / forgot password
- Role-aware redirect after login (admin→/admin-dashboard, barber→/barber-dashboard)
- ProtectedRoute component — role-based route guards
- /admin-login legacy URL → redirects to /auth
- Roles: customer | barber | admin | superAdmin
- Session persistence via Firebase localStorage default"

git push origin main

echo ""
echo "✅ Phase 9 deployed! Test at your Vercel URL + /auth"
echo ""
echo "   Admin login:   /auth  →  sign in with admin email → auto-redirects to /admin-dashboard"
echo "   Customer:      /auth  →  sign in → stays on /"
echo "   New users:     /auth  →  'Create account' tab"
echo "   Password reset: /auth  →  'Forgot password?' link"