// src/services/bookingEngine.ts
// The Rule Engine: Handles slot generation, double-booking prevention, and queries.

import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase-config";
import { Booking, Barber, Service, BookingStatus } from "../types/booking";

// Configuration
const SLOT_INTERVAL_MINUTES = 30;
const BUFFER_MINUTES = 10; // Time between appointments

/**
 * Generates all possible time slots for a specific day, factoring in lunch breaks.
 */
function generateBaseSlots(startTime: string, endTime: string, lunchStart?: string, lunchEnd?: string): string[] {
  const slots: string[] = [];
  let current = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);
  
  const lunchS = lunchStart ? new Date(`1970-01-01T${lunchStart}:00`) : null;
  const lunchE = lunchEnd ? new Date(`1970-01-01T${lunchEnd}:00`) : null;

  while (current < end) {
    const timeString = current.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Check if slot falls inside lunch break
    let isLunch = false;
    if (lunchS && lunchE && current >= lunchS && current < lunchE) {
      isLunch = true;
    }

    if (!isLunch) {
      slots.push(timeString);
    }
    
    current.setMinutes(current.getMinutes() + SLOT_INTERVAL_MINUTES);
  }
  return slots;
}

/**
 * THE RULE ENGINE: Returns available start times for a given barber, date, and service duration.
 */
export async function getAvailableSlots(barber: Barber, date: string, service: Service): Promise<string[]> {
  const dayOfWeek = new Date(date).getDay();
  const schedule = barber.schedule.find(s => s.dayOfWeek === dayOfWeek);

  // Rule 1: Respect working hours & holidays
  if (!schedule || !schedule.isWorking) return [];

  // Generate all possible slots for the day
  const allSlots = generateBaseSlots(schedule.startTime, schedule.endTime, schedule.lunchStart, schedule.lunchEnd);

  // Rule 2: Prevent double bookings (Fetch existing bookings for this barber on this date)
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef, 
    where("barberId", "==", barber.id), 
    where("date", "==", date),
    where("status", "in", ["pending", "confirmed"]) // Ignore cancelled/no-shows
  );
  
  const snapshot = await getDocs(q);
  const existingBookings = snapshot.docs.map(doc => doc.data() as Booking);

  // Filter out slots that overlap with existing bookings + buffer
  const availableSlots = allSlots.filter(slotTime => {
    const slotStart = new Date(`1970-01-01T${slotTime}:00`);
    const slotEnd = new Date(slotStart.getTime() + (service.durationMinutes + BUFFER_MINUTES) * 60000);

    // Check against every existing booking
    const hasConflict = existingBookings.some(b => {
      const bStart = new Date(`1970-01-01T${b.startTime}:00`);
      const bEnd = new Date(`1970-01-01T${b.endTime}:00`);
      // A collision happens if the new slot starts before the existing ends AND ends after the existing starts
      return (slotStart < bEnd && slotEnd > bStart);
    });

    return !hasConflict;
  });

  return availableSlots;
}

/**
 * Creates a new booking in Firestore
 */
export async function createBooking(bookingData: Omit<Booking, "id" | "createdAt" | "status">): Promise<string> {
  const newBooking = {
    ...bookingData,
    status: "confirmed" as BookingStatus, // Defaulting to confirmed for MVP
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "bookings"), newBooking);
  return docRef.id;
}

/**
 * Management: Update booking status (cancel, complete, no-show)
 */
export async function updateBookingStatus(bookingId: string, newStatus: BookingStatus): Promise<void> {
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, { status: newStatus });
}
