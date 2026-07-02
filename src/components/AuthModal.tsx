"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  type AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase"; 
import { X, AlertCircle, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function getAuthError(err: AuthError): string {
  switch (err.code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setFullName(""); setEmail(""); setPassword(""); setConfirm(""); setError(null); };
  const switchMode = (m: Mode) => { reset(); setMode(m); };
  const handleClose = () => { reset(); onClose(); };

  if (typeof document !== "undefined") {
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup") {
      if (!fullName.trim()) return setError("Please enter your full name.");
      if (password !== confirm) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      reset(); onSuccess?.(); handleClose();
    } catch (err) {
      setError(getAuthError(err as AuthError));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(null); setGLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      reset(); onSuccess?.(); handleClose();
    } catch (err) {
      setError(getAuthError(err as AuthError));
    } finally { setGLoading(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white border border-slate-100
                       rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Top Color Bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-brand-blue" />

            <div className="relative px-10 pt-10 pb-6 text-center">
              <button onClick={handleClose} aria-label="Close"
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                  bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100
                  rounded-full transition-all">
                <X size={16} />
              </button>
              
              <AnimatePresence mode="wait">
                <motion.div key={mode}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}>
                  <h2 className="font-serif text-3xl font-black text-slate-900 tracking-tight">
                    {mode === "signin" ? "Welcome Back" : "Join Sizabantu"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 font-medium">
                    {mode === "signin" ? "Sign in to manage your appointments" : "Create your account to book easily"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex mx-10 border-b border-slate-200">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase relative
                    ${mode === m ? "text-brand-blue" : "text-slate-400 hover:text-slate-600"}`}>
                  {m === "signin" ? "Sign In" : "Create Account"}
                  {mode === m && (
                    <motion.div layoutId="tab-bar"
                      className="absolute bottom-[-1px] inset-x-0 h-0.5 bg-brand-blue"
                      transition={{ type:"spring", stiffness:400, damping:35 }} />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="px-10 py-8 space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                    exit={{ opacity:0, height:0 }}
                    className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {mode === "signup" && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                    exit={{ opacity:0, height:0 }} transition={{ duration:0.3 }}>
                    <Field label="Full Name" type="text" value={fullName}
                      onChange={setFullName} placeholder="Thabo Nkosi" required />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="Email Address" type="email" value={email}
                onChange={setEmail} placeholder="you@example.com" required />
              <Field label="Password" type="password" value={password}
                onChange={setPassword} placeholder="••••••••" required />

              <AnimatePresence>
                {mode === "signup" && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                    exit={{ opacity:0, height:0 }} transition={{ duration:0.3, delay:0.05 }}>
                    <Field label="Confirm Password" type="password" value={confirm}
                      onChange={setConfirm} placeholder="••••••••" required />
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" disabled={loading || gLoading}
                className="w-full mt-4 py-4 bg-slate-900 hover:bg-slate-800
                  disabled:opacity-50 rounded-xl text-white text-sm
                  font-bold tracking-wide transition-all shadow-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {mode === "signin" ? "Signing In..." : "Creating Account..."}
                  </span>
                ) : (mode === "signin" ? "Sign In" : "Create Account")}
              </button>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <button type="button" onClick={handleGoogle} disabled={loading || gLoading}
                className="w-full py-3.5 border border-slate-200 hover:border-slate-300
                  hover:bg-slate-50 disabled:opacity-50 rounded-xl text-slate-600
                  font-semibold text-sm transition-all flex items-center justify-center gap-3">
                {gLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>

              <p className="text-center text-sm font-medium text-slate-500 pt-2">
                {mode === "signin" ? (
                  <>No account?{" "}
                    <button type="button" onClick={() => switchMode("signup")}
                      className="text-brand-blue font-bold hover:underline">Create one</button>
                  </>
                ) : (
                  <>Have an account?{" "}
                    <button type="button" onClick={() => switchMode("signin")}
                      className="text-brand-blue font-bold hover:underline">Sign in</button>
                  </>
                )}
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, type, value, onChange, placeholder, required }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold tracking-wider uppercase
        text-slate-500 mb-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl
          text-slate-900 text-sm placeholder:text-slate-400
          focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue
          transition-all duration-200"
        autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "name"}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.01 17.64 11.7 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
