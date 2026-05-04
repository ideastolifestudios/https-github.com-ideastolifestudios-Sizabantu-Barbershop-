/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MapPin, 
  Mail, 
  Instagram, 
  MessageSquare,
  Star,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Send,
  ExternalLink,
  User,
  Calendar,
  Clock,
  Trophy,
  Users,
  LogOut,
  Scissors,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Zap,
  Settings,
  Trash2,
  RefreshCcw,
  Bell,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { io } from 'socket.io-client';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const socket = io();

// Validate Connection to Firestore (As per instructions)
async function testConnection() {
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('permission-denied'))) {
      console.warn("Firebase connection notice:", error.message);
    }
  }
}
testConnection();

// --- Context / Hooks ---

const useAuth = () => {
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
    // throw new Error(JSON.stringify(errInfo)); // Silent in console but logged
  };

  const [authStep, setAuthStep] = useState<'methods' | 'email' | 'otp'>('methods');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            const newProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || email.split('@')[0],
              email: firebaseUser.email || email,
              phoneNumber: firebaseUser.phoneNumber,
              photoURL: firebaseUser.photoURL,
              stamps: 0,
              rewardsUnlocked: [],
              role: ((firebaseUser.email || email) === 'cbrprints22@gmail.com' || ((firebaseUser.email || email) && (firebaseUser.email || email).endsWith('@sizabantubarbershop.co.za'))) ? 'admin' : 'client',
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            const existingProfile = userDoc.data();
            if (((firebaseUser.email || email) === 'cbrprints22@gmail.com' || ((firebaseUser.email || email) && (firebaseUser.email || email).endsWith('@sizabantubarbershop.co.za'))) && existingProfile?.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              setProfile({ ...existingProfile, role: 'admin' });
            } else {
              setProfile(existingProfile);
            }
            onSnapshot(userRef, (doc) => {
              if (doc.exists()) {
                setProfile(doc.data());
              }
            }, (error) => handleFirestoreError(error, 'get' as any, `users/${firebaseUser.uid}`));
          }
        } catch (err) {
          console.error("Auth profile error:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [email]);

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return alert("Valid email required");
    setIsSendingCode(true);
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setAuthStep('otp');
      } else {
        alert("Failed to send code. Try again.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (response.ok && data.customToken) {
        const { signInWithCustomToken } = await import('firebase/auth');
        await signInWithCustomToken(auth, data.customToken);
        setAuthStep('methods');
      } else {
        alert("Invalid or expired code.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loginGoogle = async () => {
     try {
       // Using Popup, but handling common browser blocks
       await signInWithPopup(auth, googleProvider);
     } catch (err: any) {
       if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
         alert("Please enable popups or try again. If you're in an iframe, open the app in a new tab for the best experience.");
       }
       console.error("Login Error:", err);
     }
  };
  const logout = () => signOut(auth);

  return { 
    user, 
    profile, 
    loading, 
    logout,
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
    handleFirestoreError,
    OperationType 
  };
};

// --- Notifications ---

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    socket.on('notification:reward', (data) => {
      const newNotif = { 
        id: Date.now(), 
        type: 'reward', 
        message: `Congrats! You have ${data.stamps} stamps now.`,
        icon: <Trophy className="w-5 h-5 text-yellow-500" />
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 5000);
    });

    socket.on('queue:updated', (data) => {
      const newNotif = { 
        id: Date.now(), 
        type: 'queue', 
        message: `Queue updated: Slot ${data.bookingId} is now ${data.status}.`,
        icon: <Users className="w-5 h-5 text-blue-500" />
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 5000);
    });

    socket.on('notification:direct', (data) => {
      // Only show if it's for this user
      if (profile && data.userId === profile.uid) {
        const newNotif = { 
          id: Date.now(), 
          type: 'direct', 
          message: data.message,
          icon: <Bell className="w-5 h-5 text-brand-red animate-bounce" />
        };
        setNotifications(prev => [newNotif, ...prev]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 8000);
      }
    });

    socket.on('notification:admin', (data) => {
      if (profile?.role === 'admin') {
        const newNotif = { 
          id: Date.now(), 
          type: 'admin', 
          message: `${data.title}: ${data.message}`,
          icon: <ShieldCheck className="w-5 h-5 text-brand-blue" />
        };
        setNotifications(prev => [newNotif, ...prev]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 8000);
      }
    });

    return () => {
      socket.off('notification:reward');
      socket.off('queue:updated');
      socket.off('notification:direct');
    };
  }, []);

  return (
    <div className="fixed top-24 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xl p-4 rounded-2xl flex items-center gap-4 min-w-[300px] pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
              {notif.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Automated System</p>
              <p className="text-sm font-bold text-slate-900">{notif.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// --- Automation System Components ---

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduled'>('queue');
  const [bookings, setBookings] = useState<any[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { handleFirestoreError } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'confirmed', 'checked-in', 'in-progress']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, 'list' as any, 'bookings'));

    return unsubscribe;
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp() });
  };

  const handleVerify = async () => {
    if (!verifyCode) return;
    setIsVerifying(true);
    try {
      const response = await fetch('/api/bookings/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.toUpperCase() })
      });
      if (response.ok) {
        setVerifyCode('');
        alert("Check-in Successful!");
      } else {
        alert("Invalid or Expired Code");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const sendPing = async (userId: string, message: string) => {
    await fetch(`/api/notify/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  };

  const cancelBooking = async (id: string) => {
    await deleteDoc(doc(db, 'bookings', id));
  };

  const filteredBookings = bookings.filter(b => b.type === activeTab);

  return (
    <section className="py-24 bg-white text-slate-900 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-16">
          <div className="max-w-md">
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Command Center</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">Barber <span className="text-brand-blue italic font-serif lowercase tracking-normal">Hub</span></h2>
            <p className="text-slate-400 text-sm leading-relaxed">Verification and queue control. No-shows are auto-expired after 10 minutes by the system engine.</p>
          </div>

          <div className="w-full lg:w-auto space-y-4">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Check-In Verification</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-black text-lg w-full focus:border-brand-blue outline-none transition-all"
                />
                <button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-brand-blue text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all disabled:opacity-50"
                >
                  {isVerifying ? '...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 w-fit mb-8">
          <button onClick={() => setActiveTab('queue')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-white text-brand-red shadow-sm' : 'text-slate-400'}`}>Live Queue</button>
          <button onClick={() => setActiveTab('scheduled')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'scheduled' ? 'bg-white text-brand-red shadow-sm' : 'text-slate-400'}`}>Scheduled</button>
        </div>

        <div className="grid gap-4">
          {filteredBookings.length > 0 ? filteredBookings.map((b) => (
            <motion.div layout key={b.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden group">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-brand-blue border border-slate-100 text-xl">
                  {b.userName?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-tight text-xl">{b.userName}</h4>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{b.serviceName} • {b.type === 'scheduled' ? b.scheduledAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Queue'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  b.status === 'checked-in' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                  b.status === 'in-progress' ? 'bg-yellow-50 border-yellow-100 text-yellow-500' :
                  'bg-slate-50 border-transparent text-slate-400'
                }`}>
                  {b.status.replace('-', ' ')}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => sendPing(b.userId, "Please prepare, your session is coming up soon.")} title="Ping Client" className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-brand-blue hover:text-white transition-all"><Bell className="w-4 h-4" /></button>
                  {b.status === 'checked-in' && (
                    <button onClick={() => updateStatus(b.id, 'started')} className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-900 transition-all">
                      <Scissors className="w-4 h-4" />
                      Start Cut
                    </button>
                  )}
                  {b.status === 'started' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase text-[10px] hover:bg-green-600 transition-all">
                      <Trophy className="w-4 h-4" />
                      Finish Session
                    </button>
                  )}
                  {b.status === 'confirmed' && b.type === 'queue' && (
                    <button onClick={() => updateStatus(b.id, 'checked-in')} className="px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all">
                      Manual Check-in
                    </button>
                  )}
                  <button onClick={() => updateStatus(b.id, 'missed')} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
              <AlertCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
              <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">No sessions today</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const BookingSystem = ({ profile }: { profile: any }) => {
  const { 
    authStep, setAuthStep, email, setEmail, 
    otp, setOtp, isSendingCode, requestOTP, 
    verifyOTP, loginGoogle, handleFirestoreError 
  } = useAuth();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [bookingFlow, setBookingFlow] = useState<'none' | 'queue' | 'scheduled'>('none');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);

  const services = [
    { id: 'buzz', name: 'Buzz Cut', price: 150, time: '30m' },
    { id: 'fade', name: 'Skin Fade', price: 250, time: '45m' },
    { id: 'beard', name: 'Beard Trim', price: 100, time: '20m' },
  ];

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', profile.uid),
      where('status', 'in', ['pending', 'confirmed', 'checked-in', 'in-progress']),
      limit(1)
    );

    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveBooking({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        setBookingFlow('none');
      } else {
        setActiveBooking(null);
      }
    }, (error) => handleFirestoreError(error, 'get' as any, 'bookings'));

    const queueQuery = query(
      collection(db, 'bookings'),
      where('type', '==', 'queue'),
      where('status', 'in', ['pending', 'confirmed', 'checked-in']),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeQueue = onSnapshot(queueQuery, (snapshot) => {
      setQueue(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, 'list' as any, 'bookings'));

    return () => {
      unsubscribeBookings();
      unsubscribeQueue();
    };
  }, [profile]);

  const createBooking = async (type: 'queue' | 'scheduled') => {
    if (!profile || !selectedService) return;
    
    setIsProcessingPayment(true);
    // Simulate Payment Gateway Handshake (Stripe/Yoco)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const service = services.find(s => s.id === selectedService);
    let scheduledDate = serverTimestamp();

    if (type === 'scheduled' && selectedTime) {
      const today = new Date();
      const [hours, minutes] = selectedTime.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      scheduledDate = Timestamp.fromDate(today);
    }

    const bookingData = {
      userId: profile.uid,
      userName: profile.displayName,
      userEmail: profile.email,
      type,
      location: 'shop',
      clientAddress: 'Klipfontein View Shop',
      travelFee: 0,
      totalPaid: (service?.price || 0),
      status: 'confirmed', // Confirmed after payment simulation
      serviceId: selectedService,
      serviceName: service?.name || 'Custom Cut',
      verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      scheduledAt: scheduledDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'bookings'), bookingData);
      
      // Emit to server to trigger Google Calendar sync
      socket.emit('booking:new', { 
        ...bookingData, 
        scheduledAt: scheduledDate instanceof Timestamp ? scheduledDate.toDate().toISOString() : new Date().toISOString() 
      });

      setBookingFlow('none');
      setPaymentStep(false);
      setSelectedService('');
      setSelectedTime('');
    } catch (err) {
      console.error("Booking Error:", err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!profile) return (
    <section id="book" className="py-32 bg-slate-900 border-t border-white/5 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-red/10 via-transparent to-transparent opacity-50"></div>
      <div className="max-w-xl mx-auto px-6 text-center relative z-10">
        <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-8 block">Step Into The Realm</span>
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-12">
          Identity <br /> <span className="text-brand-blue italic font-serif lowercase tracking-normal">Verification</span>
        </h2>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black/50">
          <AnimatePresence mode="wait">
            {authStep === 'methods' && (
              <motion.div 
                key="methods"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => setAuthStep('email')}
                  className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-red hover:text-white transition-all transition-all flex items-center justify-center gap-3"
                >
                  <Mail className="w-4 h-4" />
                  Continue with Email
                </button>
                <div className="flex items-center gap-4 py-4">
                  <div className="h-px flex-1 bg-white/10"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">or alternative</span>
                  <div className="h-px flex-1 bg-white/10"></div>
                </div>
                <button 
                  onClick={loginGoogle}
                  className="w-full bg-white/5 border border-white/10 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                  Google Workspace
                </button>
              </motion.div>
            )}

            {authStep === 'email' && (
              <motion.form 
                key="email"
                onSubmit={requestOTP}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <p className="text-white/40 text-xs font-bold font-serif italic mb-6">Enter your email. A 6-digit access code will be generated for your session.</p>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-white font-bold outline-none focus:border-brand-blue transition-all"
                />
                <button 
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full bg-brand-red text-white py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20"
                >
                  {isSendingCode ? 'Sending...' : 'Request Access Code'}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthStep('methods')}
                  className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white"
                >
                  Go Back
                </button>
              </motion.form>
            )}

            {authStep === 'otp' && (
              <motion.form 
                key="otp"
                onSubmit={verifyOTP}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-brand-blue" />
                  </div>
                  <p className="text-white/40 text-xs font-bold font-serif italic">Access code sent to {email}</p>
                </div>
                <input 
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000"
                  required
                  className="w-full bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-white font-black text-4xl text-center tracking-[0.5em] outline-none focus:border-brand-blue transition-all"
                />
                <button 
                  type="submit"
                  className="w-full bg-brand-blue text-white py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20"
                >
                  Verify & Enter
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthStep('email')}
                  className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white"
                >
                  Change Email
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );

  return (
    <section id="book" className="py-24 bg-slate-900 text-white overflow-hidden relative scroll-mt-20">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      
      {/* Payment Bridge Overlay */}
      <AnimatePresence>
        {isProcessingPayment && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-900 flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-slate-900 text-center shadow-3xl">
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl animate-pulse">
                  <ShieldCheck className="w-8 h-8 text-brand-blue" />
                </div>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Securing Session</h3>
              <p className="text-slate-400 text-xs font-bold leading-relaxed mb-8">Handshaking with payment gateway. Do not refresh or close this window. Your slot is being held.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span>Authorizing Card</span>
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-ping"></div>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 2 }}
                    className="h-full bg-brand-blue"
                  ></motion.div>
                </div>
              </div>
              <p className="mt-8 text-[8px] font-black uppercase tracking-[0.4em] text-slate-200">Sizabantu Barbershop • Secure Link</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Main Action Buttons (Front UX) */}
          {bookingFlow === 'none' && !activeBooking && (
            <div className="flex flex-col md:flex-row gap-6 mb-16">
              <motion.button 
                onClick={() => setBookingFlow('queue')} 
                whileHover={{ y: -5 }}
                className="flex-1 bg-brand-red text-white p-12 rounded-[3.5rem] shadow-2xl shadow-red-500/30 text-left relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 block opacity-60">Instant Entry</span>
                  <h3 className="text-4xl md:text-5xl font-black uppercase mb-2">Live <br/> Queue</h3>
                  <p className="text-white/60 text-xs font-bold font-serif italic">Walk-ins handled by system automation.</p>
                </div>
                <Users className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform" />
              </motion.button>

              <motion.button 
                onClick={() => setBookingFlow('scheduled')} 
                whileHover={{ y: -5 }}
                className="flex-1 bg-white/5 border border-white/10 p-12 rounded-[3.5rem] text-left relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 block opacity-60">Future Slot</span>
                  <h3 className="text-4xl md:text-5xl font-black uppercase mb-2">Book <br/> Ahead</h3>
                  <p className="text-white/40 text-xs font-bold font-serif italic">Pick your time, secure your day.</p>
                </div>
                <Calendar className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="className">
              {activeBooking ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] relative overflow-hidden group shadow-2xl shadow-black/50">
                <div className="absolute top-0 right-0 p-10">
                  <QrCode className="w-16 h-16 text-brand-red opacity-60" />
                </div>
                <p className="text-brand-red font-black uppercase tracking-widest text-[10px] mb-8">Active Session Code</p>
                <div className="flex items-center gap-8 mb-12">
                  <h3 className="text-6xl font-black tracking-tighter text-white">{activeBooking.verificationCode}</h3>
                  <div className="h-16 w-px bg-white/10"></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Status</p>
                    <p className="text-lg font-black uppercase text-brand-blue">{activeBooking.status.replace('-', ' ')}</p>
                  </div>
                </div>

                <div className="p-8 bg-white/5 rounded-[2rem] mb-8 border border-white/10">
                  <div className="flex items-center gap-4 text-white/80 mb-6 bg-brand-red/10 p-4 rounded-xl border border-brand-red/20">
                    <AlertCircle className="w-5 h-5 text-brand-red" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Arrive 10 minutes before session. Late arrivals auto-expire.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Queue Pos</p>
                      <p className="text-4xl font-black">{activeBooking.type === 'queue' ? (queue.findIndex(b => b.id === activeBooking.id) + 1 || '...') : 'STA'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Est. Wait</p>
                      <p className="text-4xl font-black">~{(activeBooking.type === 'queue' ? (queue.findIndex(b => b.id === activeBooking.id) * 15) : 0) || 5}m</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => updateDoc(doc(db, 'bookings', activeBooking.id), { status: 'missed' })} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-brand-red transition-all underline underline-offset-8">Cancel My Spot</button>
              </motion.div>
            ) : bookingFlow === 'queue' ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/10 max-w-lg text-center">
                <button onClick={() => setBookingFlow('none')} className="text-white/40 flex items-center gap-2 hover:text-white transition-all mb-4">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                </button>
                <div className="w-20 h-20 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-10 h-10 text-brand-red" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Rapid <span className="text-brand-red">Queue</span> Entry</h3>
                <p className="text-white/40 text-xs italic font-serif">Instant walk-in. Pay now to lock your current position #{(queue.length + 1)} in line.</p>
                
                <div className="space-y-4 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Service</p>
                  <div className="grid grid-cols-1 gap-3">
                    {services.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setSelectedService(s.id)}
                        className={`p-6 rounded-2xl border text-left transition-all flex justify-between items-center ${selectedService === s.id ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                      >
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">{s.name}</p>
                          <p className="text-[8px] opacity-60">{s.time} process</p>
                        </div>
                        <span className="text-lg font-black italic">R{s.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-8">
                   <button 
                    disabled={!selectedService || isProcessingPayment}
                    onClick={() => createBooking('queue')}
                    className="w-full bg-brand-red text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-dark transition-all disabled:opacity-20 shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {isProcessingPayment ? 'Connecting...' : 'Secure My Spot'}
                  </button>
                </div>
              </motion.div>
            ) : bookingFlow === 'scheduled' ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/10 max-w-lg">
                <button onClick={() => setBookingFlow('none')} className="text-white/40 flex items-center gap-2 hover:text-white transition-all mb-4">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                </button>
                <h3 className="text-3xl font-black uppercase tracking-tight">Pick <span className="text-brand-blue">Scheduled</span> Time</h3>
                
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">1. Select Service</p>
                  <div className="grid grid-cols-2 gap-3">
                    {services.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setSelectedService(s.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${selectedService === s.id ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                      >
                        <p className="font-black text-xs uppercase tracking-tight">{s.name}</p>
                        <p className="text-[8px] opacity-60">R{s.price} • {s.time}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {bookingFlow === 'scheduled' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">2. Select Time (Today Only)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map(t => (
                        <button 
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`p-3 rounded-xl border text-[10px] font-black transition-all ${selectedTime === t ? 'bg-brand-blue border-brand-blue text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 border-t border-white/5 mt-8">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Grand Total</span>
                      <span className="text-3xl font-black text-white">R{(services.find(s => s.id === selectedService)?.price || 0)}</span>
                   </div>

                   <button 
                    disabled={!selectedService || (bookingFlow === 'scheduled' && !selectedTime) || isProcessingPayment}
                    onClick={() => createBooking(bookingFlow as any)}
                    className="w-full bg-brand-red text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-dark transition-all disabled:opacity-20 shadow-2xl shadow-red-500/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay & Confirm Slot
                      </>
                    )}
                  </button>
                  <p className="text-[8px] text-white/20 text-center mt-4 uppercase tracking-widest">Secured by Stripe & Google Cloud</p>
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="relative">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] p-8 md:p-12 relative z-10 shadow-3xl shadow-black/80">
              <div className="flex items-center justify-between mb-12">
                <h4 className="text-xl font-black uppercase tracking-tight">Live Tracker</h4>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-green-500/20 text-green-500 rounded-full border border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Operational</span>
                </div>
              </div>

              <div className="space-y-3">
                {queue.length > 0 ? queue.slice(0, 5).map((entry, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={entry.id}
                    className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${idx === 0 ? 'bg-brand-blue border-brand-blue text-white shadow-2xl shadow-blue-500/40 relative z-20 overflow-hidden' : 'bg-white/5 border-white/5 text-white/60'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-white text-brand-blue' : 'bg-white/10'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className={`font-black uppercase tracking-tight ${idx === 0 ? 'text-white' : 'text-white'}`}>{entry.userName.split(' ')[0]}</p>
                        <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">{entry.serviceName}</p>
                      </div>
                    </div>
                    {idx === 0 && (
                      <div className="bg-white/20 px-4 py-1 rounded-xl">
                        <span className="text-[9px] font-black uppercase tracking-widest">On Deck</span>
                      </div>
                    )}
                  </motion.div>
                )) : (
                  <div className="py-24 text-center border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center">
                    <Users className="w-16 h-16 text-white/5 mb-6" />
                    <p className="text-white/20 font-black uppercase tracking-[0.4em] text-[10px]">Queue Standby</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Improved Loyalty Section */}
            <motion.div 
              whileHover={{ rotate: 0, y: -10 }}
              initial={{ rotate: 2 }}
              className="absolute -bottom-8 -right-4 lg:-right-12 z-20 bg-white p-8 rounded-[2.5rem] shadow-3xl w-[280px] border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-red/10 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-brand-red" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Loyalty Stamps</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-brand-red">{profile?.stamps || 0}<span className="text-[10px] text-slate-300">/10</span></span>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-3 mb-8">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="relative">
                    <div className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${i < (profile?.stamps || 0) ? 'bg-brand-red border-brand-red text-white' : 'border-slate-100 bg-slate-50 text-slate-200'}`}>
                      {i < (profile?.stamps || 0) ? <Scissors className="w-3 h-3" /> : <div className="w-1 h-1 bg-current rounded-full" />}
                    </div>
                    {(i === 4 || i === 9) && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                        <Zap className="w-2 h-2 text-white fill-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${profile?.stamps >= 5 ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-transparent'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-widest ${profile?.stamps >= 5 ? 'text-green-600' : 'text-slate-400'}`}>5 Fills: Free Cap</p>
                  {profile?.stamps >= 5 ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3 border border-slate-200 rounded-full" />}
                </div>
                <div className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${profile?.stamps >= 10 ? 'bg-brand-blue/5 border-brand-blue/10' : 'bg-slate-50 border-transparent'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-widest ${profile?.stamps >= 10 ? 'text-brand-blue' : 'text-slate-400'}`}>10 Fills: Free Haircut</p>
                  {profile?.stamps >= 10 ? <CheckCircle2 className="w-3 h-3 text-brand-blue" /> : <div className="w-3 h-3 border border-slate-200 rounded-full" />}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Newsletter / Welcome Section ---

const WelcomeJourney = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 hidden md:block"></div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-transparent to-slate-900 z-10 hidden md:block"></div>
          
          <div className="relative z-20 max-w-xl">
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-8 block">Exclusive Entry</span>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-8">
              Join The <br /> <span className="text-brand-blue italic font-serif lowercase tracking-normal">Inner Circle</span>
            </h2>
            <p className="text-white/40 text-sm md:text-lg mb-12 leading-relaxed font-serif italic">
              New customers get an automated 20% discount code on their first session. Join our newsletter to receive grooming guides and priority slot alerts.
            </p>

            {subscribed ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-brand-red rounded-3xl text-white text-center">
                <p className="font-black uppercase tracking-widest text-xs mb-2">Check Your Inbox!</p>
                <p className="text-sm font-bold opacity-80 italic font-serif">Welcome to the Sizabantu family.</p>
              </motion.div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-white font-bold outline-none focus:border-brand-blue transition-all"
                />
                <button type="submit" className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-red hover:text-white transition-all shadow-2xl">
                  Sign Me Up
                </button>
              </form>
            )}
          </div>

          <div className="relative z-20 flex-shrink-0">
             <div className="w-56 h-56 bg-brand-red rounded-[3rem] rotate-6 border-8 border-white/10 shadow-2xl overflow-hidden">
                <img src="https://images.unsplash.com/photo-1599351431247-f579338421f0?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover grayscale" alt="Welcome" />
             </div>
             <div className="absolute -top-4 -left-4 w-24 h-24 bg-brand-blue rounded-3xl -rotate-12 border-4 border-slate-900 flex items-center justify-center p-4">
                <Scissors className="w-10 h-10 text-white" />
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TopNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  
  const navLinks = [
    { name: 'Book Session', href: '#book' },
    { name: 'Services', href: '#pricing' },
    { name: 'Gallery', href: '#portfolio' },
    { name: 'Reviews', href: '#reviews' },
  ];

  const handleLoginClick = () => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-white/80 backdrop-blur-md py-4 border-b border-slate-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div 
          className="flex items-center cursor-pointer group" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img 
            src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png" 
            alt="Sizabantu Barbershop" 
            className="h-10 md:h-12 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              href={link.href}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-brand-red transition-all"
            >
              {link.name}
            </a>
          ))}
          
          {profile?.role === 'admin' && (
            <a href="#admin-hub" className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue animate-pulse">Admin Hub</a>
          )}

          <div className="h-4 w-px bg-slate-200"></div>

          {profile ? (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">{profile.displayName?.split(' ')[0]}</span>
                </div>
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-brand-red">{profile.stamps || 0}/10 Stamps</span>
              </div>
              <button onClick={logout} className="p-3 bg-slate-50 text-slate-400 hover:text-brand-red hover:bg-brand-red/5 rounded-2xl transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <motion.button 
              onClick={handleLoginClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-900 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200/50 transition-all flex items-center gap-2 group"
            >
              <User className="w-3 h-3 group-hover:rotate-12 transition-transform" />
              Member Login
            </motion.button>
          )}
        </div>

        {/* Mobile Header Elements */}
        <div className="flex md:hidden items-center gap-4">
          {!profile && (
            <button onClick={handleLoginClick} className="p-2 text-slate-900">
              <User className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[120]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className="absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] p-8 flex flex-col pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-16">
                <img 
                  src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png" 
                  alt="Logo" 
                  className="h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-900" />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl font-black uppercase tracking-tighter flex justify-between items-center group py-2"
                  >
                    <span>{link.name}</span>
                    <ArrowRight className="w-6 h-6 text-brand-red opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </motion.a>
                ))}
              </div>

              <div className="mt-auto pt-10 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 text-center md:text-left">Let's Connect</p>
                <div className="flex justify-center md:justify-start gap-8">
                  <a href="https://www.instagram.com/sizabantub/" className="group flex flex-col items-center gap-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-brand-red transition-all">
                      <Instagram className="w-6 h-6" />
                    </div>
                  </a>
                  <a href="https://wa.me/27607246829" className="group flex flex-col items-center gap-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-brand-blue transition-all">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shadow-2xl shadow-slate-300 hover:bg-brand-red transition-all group overflow-hidden"
        >
          <img 
            src="https://res.cloudinary.com/dggitwduo/image/upload/v1775635697/SB_BARBER_LOGO_ASSET_ag52o1.png" 
            alt="Barber" 
            className="w-7 h-7 object-contain brightness-0 invert group-hover:rotate-12 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 opacity-60 group-hover:opacity-100 transition-opacity">Top</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

const LiveStatus = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOpen = () => {
    const day = time.getDay(); // 0 = Sunday, 1 = Monday, ...
    const hour = time.getHours();
    
    if (day === 1) return false; // Monday Closed
    return hour >= 9 && hour < 18; // 09:00 - 18:00
  };

  return (
    <div className="absolute bottom-10 right-10 text-right">
      <div className="flex items-center justify-end gap-3 mb-1">
        <span className={`relative flex h-2 w-2 ${isOpen() ? 'text-emerald-500' : 'text-brand-red'}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen() ? 'bg-emerald-400' : 'bg-brand-red/40'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen() ? 'bg-emerald-500' : 'bg-brand-red'}`}></span>
        </span>
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isOpen() ? 'text-emerald-500' : 'text-brand-red'}`}>
          {isOpen() ? 'Open Now' : 'Closed Now'}
        </p>
      </div>
      <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">
        {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
};

const Hero = () => {
  return (
    <section className="relative h-[80vh] md:h-[90vh] flex items-end bg-slate-900 overflow-hidden pb-20">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-40"
        >
          <source src="https://cdn.coverr.co/videos/preview/720p/coverr-barber-cutting-hair-5426.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-900/20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <p className="text-white/60 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase max-w-xl">
            The pinnacle of grooming where tradition meets modern precision.
          </p>
        </motion.div>
      </div>

      {/* Live Status on the frame */}
      <div className="hidden md:block">
        <LiveStatus />
      </div>
    </section>
  );
};

const Mission = () => {
  return (
    <section className="py-24 bg-white text-slate-900 relative overflow-hidden border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        {/* Restored logo - Bigger, no transparency */}
        <div className="flex justify-center mb-16">
          <img 
            src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png" 
            alt="SB Logo" 
            className="h-28 md:h-40 object-contain drop-shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <p className="text-3xl md:text-5xl font-light italic font-serif leading-relaxed text-slate-700 mb-16">
            "Our mission is to provide exceptional grooming experience by delivering superior service, building long lasting relationships and fostering a welcoming environment for people of all ages."
          </p>
          <div className="flex flex-col items-center">
            <div className="h-px w-24 bg-brand-red mb-6"></div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-blue">
              Thobane Nlhapo
            </p>
            <p className="text-[10px] font-light italic font-serif text-slate-400 uppercase tracking-[0.4em] mt-2">
              Founder
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const HaircutPricing = () => {
  const prices = [
    // HAIRSTYLES
    { name: "Fade", price: "R50", desc: "Precision blending", id: "01" },
    { name: "Brush", price: "R35", desc: "Classic brush cut", id: "02" },
    { name: "Chiskop", price: "R30", desc: "Clean bald cut", id: "03" },
    { name: "Razor Blade", price: "R60", desc: "Traditional razor finish", id: "04" },
    
    // OTHER
    { name: "Line Up", price: "R15", desc: "Edge definition", id: "05" },
    { name: "Beard Shave", price: "R15", desc: "Facial grooming", id: "06" },
    { name: "Custom Design", price: "R15", desc: "Artistic patterns", id: "07" },
    { name: "Wave Maintenance", price: "R30", desc: "Wave care", id: "08" },
    { name: "Waving", price: "R60", desc: "Professional waving", id: "09" },
    { name: "Wash - Long Hair", price: "R50", desc: "Deep cleansing", id: "10" },
    { name: "Eyebrow & Tint", price: "R50", desc: "Brow shaping", id: "11" },
    
    // COMBO PACKAGES
    { name: "Fade & Shave", price: "R60", desc: "Full cut & beard", id: "12" },
    { name: "Fade & Graphic", price: "R60", desc: "Cut & design", id: "13" },
    { name: "Fade & Wash", price: "R75", desc: "Cut & wash", id: "14" },
    { name: "Cut & Edge", price: "R75", desc: "Precision cut", id: "15" },
    { name: "Cut & Permanent", price: "R110", desc: "Style finish", id: "16" },
  ];

  return (
    <section id="pricing" className="bg-slate-50 text-slate-900 py-20 md:py-32 scroll-mt-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Interactive Frame Banner */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="w-full h-40 md:h-80 relative overflow-hidden rounded-[2rem] md:rounded-[3rem] mb-12 md:mb-20 group shadow-2xl shadow-slate-200"
        >
          <motion.div 
            initial={{ scale: 1.1 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 z-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2000" 
              alt="Barbershop Background" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
          </motion.div>
          
          <div className="absolute inset-0 z-10 flex flex-col justify-center items-center p-8 md:p-16 text-center">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="w-full"
              >
                <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Service Menu</span>
                <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
                  HAIR<span className="text-brand-blue italic font-serif lowercase tracking-normal">CUTS</span>
                </h2>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Minimized Haircut Offerings in 1 Balanced Frame */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 border border-slate-100 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-12">
                <div className="h-px flex-1 bg-slate-100"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Master Barber Menu</p>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                {prices.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={{ x: 5 }}
                    className="flex justify-between items-end border-b border-slate-50 pb-4 group/item cursor-default"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight group-hover/item:text-brand-red transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-brand-red">{item.price}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Precision grooming for <span className="text-brand-blue italic font-serif lowercase tracking-normal">everyone</span>
                </p>
                <a 
                  href="https://wa.me/27607246829"
                  className="flex items-center gap-3 bg-brand-red text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-dark transition-all shadow-lg shadow-red-100"
                >
                  Enquire on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


// --- Portfolio Component (Enhanced Gallery) ---

const Portfolio = () => {
  const images = [
    { url: "https://res.cloudinary.com/dggitwduo/image/upload/v1776183249/WhatsApp_Image_2026-04-14_at_11.14.44_1_aqb6zl.jpg", title: "Signature Fade", size: "large", category: "Master Selection" },
    { url: "https://images.unsplash.com/photo-1599351431247-f10b21ce9630?auto=format&fit=crop&q=80&w=1000", title: "Beard Sculpt", size: "small", category: "Grooming" },
    { url: "https://res.cloudinary.com/dggitwduo/image/upload/v1776191196/WhatsApp_Image_2026-04-14_at_11.14.50_wdxnqw.jpg", title: "Classic Taper", size: "small", category: "Traditional" },
    { url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1000", title: "The Legacy", size: "medium", isLogo: true },
    { url: "https://images.unsplash.com/photo-1621605815841-aa1291129994?auto=format&fit=crop&q=80&w=1000", title: "Razor Edge", size: "small", category: "Detailing" },
    { url: "https://images.unsplash.com/photo-1593702295094-1725842951cd?auto=format&fit=crop&q=80&w=1000", title: "Textured Crop", size: "small", category: "Modern" },
    { url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000", title: "Master Craft", size: "medium", category: "Atmosphere" },
    { url: "https://images.unsplash.com/photo-1532710093739-9470acff00bc?auto=format&fit=crop&q=80&w=1000", title: "Sharp Definition", size: "small", category: "Finish" },
    { url: "https://images.unsplash.com/photo-1512690199101-83749aabf0bc?auto=format&fit=crop&q=80&w=1000", title: "Precision Tools", size: "small", category: "Artistry" },
    { url: "https://images.unsplash.com/photo-1590540179852-21102545e1cc?auto=format&fit=crop&q=80&w=1000", title: "The Sanctuary", size: "medium", category: "Interior" },
  ];

  return (
    <section id="portfolio" className="py-32 bg-white text-slate-900 overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12 mb-20">
          <div className="max-w-2xl">
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-6 block">Our Work</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]">
              Dream Cut <br /> <span className="italic font-serif text-brand-blue lowercase tracking-normal">Reality</span>
            </h2>
          </div>
          <p className="text-lg text-slate-400 font-medium max-w-sm leading-relaxed italic font-serif">
            A curated showcase of precision, style, and the dedication we put into every single session.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[200px] md:auto-rows-[260px] gap-4 md:gap-6">
          {images.map((img, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className={`relative rounded-[2.5rem] overflow-hidden group cursor-pointer border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-brand-blue/10
                ${img.size === 'large' ? 'col-span-2 row-span-2 md:col-span-4 md:row-span-2' : ''}
                ${img.size === 'medium' ? 'col-span-2 row-span-1 md:col-span-2 md:row-span-1' : ''}
              `}
            >
              <img 
                src={img.url} 
                alt={img.title} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              
              {img.isLogo ? (
                <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-brand-red/40 via-brand-dark/20 to-brand-blue/20 backdrop-blur-[2px]">
                  <img 
                    src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png" 
                    alt="SB Logo" 
                    className="h-32 md:h-56 w-auto object-contain brightness-0 invert drop-shadow-2xl transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red/80 mb-2">{img.category}</span>
                  <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">{img.title}</h4>
                </div>
              )}

              {/* Status Indicator for non-logo */}
              {!img.isLogo && (
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-500">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* View Instagram Button */}
        <div className="mt-20 md:mt-32 flex justify-center">
          <motion.a 
            href="https://www.instagram.com/sizabantub/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-8 bg-slate-900 text-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] group shadow-3xl shadow-slate-200 transition-all w-full max-w-2xl"
          >
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white/40 group-hover:text-brand-red transition-colors mb-2">Connect With Us</span>
              <span className="text-2xl md:text-5xl font-black uppercase tracking-tighter leading-none">View Instagram</span>
            </div>
            <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-3xl md:rounded-[2rem] flex items-center justify-center shrink-0 group-hover:bg-brand-red transition-all">
              <Instagram className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
};

const Reviews = () => {
  const reviews = [
    { name: "Thabo Mokoena", rating: 5, text: "Best fade in the city. Professional service and great atmosphere. Highly recommended!", date: "2 weeks ago" },
    { name: "Sarah Jenkins", rating: 5, text: "Brought my son here and they were so patient. The cut was perfect. We'll be back!", date: "1 month ago" },
    { name: "David Smith", rating: 5, text: "Premium experience from start to finish. The attention to detail is unmatched.", date: "3 days ago" },
    { name: "Lerato Cele", rating: 5, text: "Too fresh, too clean! Exactly what I asked for. Best barbershop in Klipfontein.", date: "1 week ago" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  return (
    <section id="reviews" className="py-20 md:py-32 bg-white text-slate-900 relative overflow-hidden scroll-mt-20">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12 md:mb-20">
          <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-4 md:6 block">Testimonials</span>
          <h2 className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-6 md:mb-8">
            The <span className="text-brand-blue italic font-serif lowercase tracking-normal">Word</span> <br /> On The Street
          </h2>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-brand-red text-brand-red" />
            ))}
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-brand-red ml-2">5.0 Overall Rating</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto relative h-[300px] md:h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0 glass p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-slate-100 flex flex-col justify-center text-center group"
            >
              {/* Stars added here too */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-brand-red text-brand-red" />
                ))}
              </div>
              <p className="text-lg md:text-2xl font-light italic font-serif leading-relaxed text-slate-600 mb-8 md:mb-12 relative z-10">
                "{reviews[currentIndex].text}"
              </p>
              <div className="flex flex-col items-center gap-4 pt-6 md:pt-8 border-t border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-red rounded-full flex items-center justify-center text-white font-black text-xs md:text-sm">
                  {reviews[currentIndex].name.charAt(0)}
                </div>
                <div>
                  <p className="font-black uppercase tracking-tight text-xs md:text-sm text-slate-900">{reviews[currentIndex].name}</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-widest">{reviews[currentIndex].date}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Carousel Indicators */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
            {reviews.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-8 bg-brand-red' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-24 text-center">
          <a 
            href="https://share.google/0S8TOcfrmPkNRfo0Z" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-blue transition-colors group"
          >
            <Star className="w-3 h-3" />
            View all Google Reviews
          </a>
        </div>
      </div>
    </section>
  );
};

const ContactSection = () => {
  return (
    <section id="contact" className="py-32 bg-white text-slate-900 relative overflow-hidden scroll-mt-20">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-blue/5 -skew-x-12 translate-x-1/4 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-24 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-6 block">Contact Us</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-16">
              Get <br /> <span className="text-brand-blue italic font-serif lowercase tracking-normal">In Touch</span>
            </h2>
            
            <div className="grid gap-12">
              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Call Us</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight">+27 60 724 6829</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-brand-blue group-hover:text-white transition-all duration-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Visit Us</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                    Klipfontein view 644 <br /> Nancy Ndamase street
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight">info@sizabantubarbershop.co.za</p>
                </div>
              </div>
            </div>

            <div className="mt-20 flex gap-6">
              <a href="https://www.instagram.com/sizabantub/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/27607246829" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            {/* Fixed Google Map - Precise Location */}
            <div className="rounded-[3rem] overflow-hidden h-[450px] border border-slate-200 shadow-2xl relative group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.0531518388435!2d28.127814476081078!3d-26.01524317719602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9513364f3d2f95%3A0x678663806f339b1a!2sSizabantu%20Barbershop!5e0!3m2!1sen!2sza!4v1713697200000!5m2!1sen!2sza" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Sizabantu Barbershop Location"
                className="grayscale hover:grayscale-0 transition-all duration-1000"
              ></iframe>
            </div>
            
            <div className="p-12 glass rounded-[3rem] border border-slate-200 shadow-2xl">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red mb-10">Direct Message</h4>
              <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Name</label>
                    <input type="text" placeholder="John Doe" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all font-bold text-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
                    <input type="email" placeholder="john@example.com" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message</label>
                  <textarea placeholder="Tell us about your dream cut..." rows={4} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all resize-none font-bold text-sm"></textarea>
                </div>
                <button className="w-full bg-brand-red text-white hover:bg-brand-dark py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-4">
                  Send Message
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-slate-50 text-slate-900 pt-24 pb-12 relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <img 
              src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png" 
              alt="Sizabantu Barbershop" 
              className="h-16 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-slate-500 text-sm leading-relaxed">
              Established in 2022, Sizabantu Barbershop is dedicated to providing the ultimate grooming experience.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/sizabantub/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-red transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/27607246829" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Quick Navigation</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><a href="#pricing" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Pricing</a></li>
              <li><a href="#portfolio" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Portfolio</a></li>
              <li><a href="#reviews" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Reviews</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Contact Information</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-brand-red" /> +27 60 724 6829</li>
              <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-brand-red" /> info@sizabantubarbershop.co.za</li>
              <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-brand-red" /> Klipfontein View, Midrand</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Community</h4>
            <p className="text-slate-400 text-xs mb-6">Join our barber community for updates and tips.</p>
            <a 
              href="https://wa.me/27607246829" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-red text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-brand-dark transition-all flex items-center justify-between group shadow-xl shadow-red-50"
            >
              Join WhatsApp Community
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] text-slate-400 uppercase tracking-widest font-normal">
          <p className="text-center">&copy; 2026 Sizabantu Barbershop. Crafted for perfection.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-brand-blue">Privacy</a>
            <a href="#" className="hover:text-brand-blue">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  const { user, profile, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand-blue selection:text-white">
      <NotificationCenter />
      <TopNav />
      <main className="transition-all duration-500">
        <Hero />
        <Mission />
        
        {/* Conditional Admin Hub */}
        {profile?.role === 'admin' && (
          <div id="admin-hub" className="scroll-mt-32">
            <AdminDashboard />
          </div>
        )}
        
        <BookingSystem profile={profile} />
        <WelcomeJourney />
        <HaircutPricing />
        <Portfolio />
        <Reviews />
        <ContactSection />
        <Footer />
      </main>
      <BackToTop />
    </div>
  );
}
