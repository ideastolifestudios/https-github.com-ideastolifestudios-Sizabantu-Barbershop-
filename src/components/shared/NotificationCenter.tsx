import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldCheck, Users, Trophy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { socket } from '../../lib/socket';

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const getIcon = () => {
        switch (type) {
          case 'reward': return <Trophy className="w-5 h-5 text-yellow-500" />;
          case 'queue': return <Users className="w-5 h-5 text-blue-500" />;
          case 'admin': return <ShieldCheck className="w-5 h-5 text-brand-blue" />;
          case 'direct': return <Bell className="w-5 h-5 text-brand-red animate-bounce" />;
          default: return <Bell className="w-5 h-5 text-slate-500" />;
        }
      };

      const newNotif = {
        id: Date.now(),
        type,
        message,
        icon: getIcon()
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 6000);
    };

    window.addEventListener('app-toast', handleCustomToast);

    socket.on('notification:reward', (data: any) => {
      const newNotif = {
        id: Date.now(),
        type: 'reward',
        message: `Congrats! You have ${data.stamps} stamps now.`,
        icon: <Trophy className="w-5 h-5 text-yellow-500" />
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 5000);
    });

    socket.on('queue:updated', (data: any) => {
      const newNotif = {
        id: Date.now(),
        type: 'queue',
        message: `Queue updated: Slot ${data.bookingId} is now ${data.status}.`,
        icon: <Users className="w-5 h-5 text-blue-500" />
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 5000);
    });

    socket.on('notification:direct', (data: any) => {
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

    socket.on('notification:admin', (data: any) => {
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
      socket.off('notification:admin');
      window.removeEventListener('app-toast', handleCustomToast);
    };
  }, [profile]);

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

export default NotificationCenter;
