import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, sendEmailVerification } from 'firebase/auth';
import { Mail, LogOut, ExternalLink, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

export const EmailVerificationPrompt = ({ user, logout }: { user: FirebaseUser; logout: () => void }) => {
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendVerification = async () => {
    setIsSending(true);
    setMessage('');
    setError('');
    try {
      await sendEmailVerification(user);
      setMessage('A new verification email has been sent to your inbox. Please check your spam folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    let active = true;
    const initialSend = async () => {
      try {
        await sendEmailVerification(user);
        if (active) {
          setMessage('A verification email has been sent. Please check your email to verify your address.');
        }
      } catch (err: any) {
        console.warn("Initial verification send failed:", err);
        if (active) {
          setMessage('Please look for the verification link previously sent to your email.');
        }
      }
    };
    initialSend();
    return () => { active = false; };
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage('');
    setError('');
    try {
      await user.reload();
      if (user.emailVerified) {
        window.location.reload();
      } else {
        setError('Email is still unverified. Please check your email and click the verification link.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 text-white"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 pointer-events-none"></div>

      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 border border-white/10 rounded-[3rem] p-10 text-center shadow-3xl relative"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-red/10 border border-brand-red/25 rounded-2xl flex items-center justify-center text-brand-red animate-pulse">
            <Mail className="w-8 h-8" />
          </div>
        </div>

        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Verify Your Email</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          We have introduced a mandatory email verification step to ensure client authenticity.
          Please verify <strong className="text-white">{user.email}</strong> to unlock booking and features.
        </p>

        {message && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs text-left mb-6 leading-relaxed flex gap-3 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-left mb-6 leading-relaxed flex gap-3 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'I have verified my email'
            )}
          </button>

          <button
            onClick={handleSendVerification}
            disabled={isSending || isRefreshing}
            className="w-full bg-slate-700/50 hover:bg-slate-700 hover:border-white/10 text-slate-200 border border-white/5 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all"
          >
            {isSending ? 'Sending link...' : 'Resend Verification Email'}
          </button>

          <button
            onClick={logout}
            className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[9px] py-2 transition-all mt-2"
          >
            Cancel & Logout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EmailVerificationPrompt;
