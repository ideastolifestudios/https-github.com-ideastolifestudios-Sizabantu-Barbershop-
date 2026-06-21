import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  signInWithCustomToken
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';

export const useAuth = () => {
  const { setUserProfile, setLoading: setStoreLoading } = useAuthStore();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
      emailVerified?: boolean | null;
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  const [authStep, setAuthStep] = useState<'methods' | 'email' | 'otp'>('methods');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailStr) return "Email is required";
    if (!re.test(emailStr)) return "Please enter a valid email address";
    return "";
  };

  const validateOTP = (otpStr: string) => {
    if (!otpStr) return "Access code is required";
    if (otpStr.length !== 6) return "Code must be 6 digits";
    return "";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ uid: firebaseUser.uid, ...docSnap.data() });
          } else {
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'client' });
          }
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.GET, 'users/profile'));
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const requestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setIsSendingCode(true);
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setAuthStep('otp');
      } else {
        const data = await response.json();
        setEmailError(data.error || 'Failed to send code');
      }
    } catch (err) {
      setEmailError('Network error. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const err = validateOTP(otp);
    if (err) {
      setOtpError(err);
      return;
    }
    setOtpError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (response.ok && data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
        setAuthStep('methods');
        setEmail('');
        setOtp('');
      } else {
        setOtpError(data.error || 'Invalid code');
      }
    } catch (err) {
      setOtpError('Verification failed. Try again.');
    }
  };

  const loginGoogle = async () => {
    const googleProvider = new GoogleAuthProvider();
    try {
       await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
       if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
          console.log('Google login was cancelled or blocked.');
       } else {
          console.error('Google login error:', err);
       }
    }
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    setUserProfile(user, profile);
    setStoreLoading(loading);
  }, [user, profile, loading]);

  return {
    user,
    profile,
    loading,
    authStep,
    setAuthStep,
    email,
    setEmail,
    otp,
    setOtp,
    isSendingCode,
    requestOTP,
    verifyOTP,
    loginGoogle,
    logout,
    handleFirestoreError,
    emailError,
    otpError,
    OperationType
  };
};
