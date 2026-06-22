// Dashboard Module Types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalSpent: number;
  visits: number;
  lastVisit: Date;
  loyaltyPoints: number;
  preferredBarber?: string;
  preferences?: string[];
}

export interface Booking {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  price: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string[];
  hourlyRate: number;
  availability: AvailabilitySlot[];
  rating: number;
  totalBookings: number;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Revenue {
  id: string;
  date: Date;
  bookingId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  status: 'pending' | 'completed' | 'refunded';
}

export interface LoyaltyProgram {
  customerId: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  joinDate: Date;
  redeemableRewards: string[];
}

export interface Referral {
  id: string;
  referrerId: string;
  referralPhone: string;
  status: 'pending' | 'converted' | 'expired';
  createdAt: Date;
  reward: number;
}

export interface KPIMetrics {
  monthlyRevenue: number;
  repeatCustomerRate: number;
  averageSpend: number;
  staffPerformance: StaffPerformance[];
  topServices: ServiceMetric[];
  customerRetention: number;
  loyaltyProgramParticipation: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalBookings: number;
  revenue: number;
  rating: number;
  avgServiceTime: number;
}

export interface ServiceMetric {
  serviceId: string;
  serviceName: string;
  bookings: number;
  revenue: number;
  popularity: number;
}
