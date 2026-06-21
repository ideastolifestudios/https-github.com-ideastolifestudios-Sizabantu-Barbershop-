export interface User {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  stamps: number;
  rewardsUnlocked: string[];
  role: 'client' | 'barber' | 'admin';
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  barberId: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: any;
  status: 'pending' | 'confirmed' | 'checked-in' | 'in-progress' | 'completed' | 'expired' | 'missed';
  type: 'scheduled' | 'queue';
  verificationCode: string;
  createdAt: any;
  updatedAt: any;
  totalPaid?: number;
}

export interface QueueEntry {
  id: string;
  bookingId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: 'waiting' | 'next' | 'serving';
}

export interface Barber {
  uid: string;
  name: string;
  isAvailable: boolean;
  specialties: string[];
}

export interface Settings {
  accessToken?: string;
  calendarId?: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  contactsEnabled?: boolean;
  linkedBy?: string;
  linkedAt?: string;
  expiresAt?: string;
  status?: string;
}
