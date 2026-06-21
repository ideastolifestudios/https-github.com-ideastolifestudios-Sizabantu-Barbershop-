import { useEffect, useState } from 'react';
import { query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const triggerToast = (message: string, type: 'reward' | 'queue' | 'direct' | 'admin' | 'info' = 'info') => {
  const event = new CustomEvent('app-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const useAppointmentReminders = (profile: any) => {
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  // 1. Sync User's Bookings in Real Time
  useEffect(() => {
    if (!profile) {
      setActiveBookings([]);
      return;
    }

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', profile.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsList: any[] = [];
      snapshot.forEach((doc) => {
        bookingsList.push({ id: doc.id, ...doc.data() });
      });
      setActiveBookings(bookingsList);
    }, (error) => {
      console.error("Firestore reminders listener error: ", error);
    });

    return () => unsubscribe();
  }, [profile]);

  // 2. Request notification permission on login/mount
  useEffect(() => {
    if (profile && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [profile]);

  // 3. Periodic check tick
  useEffect(() => {
    if (!profile || activeBookings.length === 0) return;

    const checkWindow = () => {
      const now = Date.now();
      const localNotifiedStr = localStorage.getItem('notified_appointments_1h');
      const notifiedMap = localNotifiedStr ? JSON.parse(localNotifiedStr) : {};
      let changed = false;

      activeBookings.forEach((booking) => {
        if (booking.type !== 'scheduled') return;

        const bookingId = booking.id;

        let scheduledTime: Date;
        if (booking.scheduledAt?.toDate) {
          scheduledTime = booking.scheduledAt.toDate();
        } else {
          scheduledTime = new Date(booking.scheduledAt);
        }

        const diffMs = scheduledTime.getTime() - now;
        const diffMins = diffMs / (1000 * 60);

        // We notify if the appointment is in the 1-hour window (between 0 and 60 minutes)
        if (diffMins > 0 && diffMins <= 60) {
          if (!notifiedMap[bookingId]) {
            const timeStr = scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const messageStr = `Your appointment for ${booking.serviceName || 'Legacy Grooming'} is scheduled in 1 hour (at ${timeStr})!`;

            // A. Desktop Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification("Appointment Reminder", {
                  body: messageStr,
                  icon: "https://res.cloudinary.com/dk8jbgjhl/image/upload/v1777916389/WhatsApp_Image_2026-04-22_at_21.13.26_t3c8ji.jpg"
                });
              } catch (e) {
                console.warn("Failed to show desktop notification: ", e);
              }
            }

            // B. Toast Alert
            triggerToast(messageStr, 'direct');

            notifiedMap[bookingId] = true;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('notified_appointments_1h', JSON.stringify(notifiedMap));
      }
    };

    // Run check immediately on bookings load/update, then check every 10 seconds
    checkWindow();
    const timer = setInterval(checkWindow, 10000);

    return () => clearInterval(timer);
  }, [profile, activeBookings]);
};
