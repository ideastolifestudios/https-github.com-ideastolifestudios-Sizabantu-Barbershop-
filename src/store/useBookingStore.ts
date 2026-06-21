import { create } from 'zustand';
import { Booking, QueueEntry } from '../types';

interface BookingState {
  bookings: Booking[];
  queue: QueueEntry[];
  setBookings: (bookings: Booking[]) => void;
  setQueue: (queue: QueueEntry[]) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  queue: [],
  setBookings: (bookings) => set({ bookings }),
  setQueue: (queue) => set({ queue }),
}));
