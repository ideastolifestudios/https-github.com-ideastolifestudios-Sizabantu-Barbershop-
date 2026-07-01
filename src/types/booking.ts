// src/types/booking.ts
import { Timestamp } from "firebase/firestore";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";

export interface Service {
  id?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface BarberSchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isWorking: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  lunchStart?: string; // "13:00"
  lunchEnd?: string;   // "14:00"
}

export interface Barber {
  id?: string;
  userId: string;
  name: string;
  servicesProvided: string[]; // Array of Service IDs
  schedule: BarberSchedule[];
  active: boolean;
}

export interface Booking {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: BookingStatus;
  totalPrice: number;
  createdAt: Timestamp | unknown;
  notes?: string;
}
