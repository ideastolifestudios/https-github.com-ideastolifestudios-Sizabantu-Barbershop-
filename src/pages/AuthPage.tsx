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
