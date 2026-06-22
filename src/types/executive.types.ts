// Executive Dashboard Types
export interface ExecutiveDashboardMetrics {
  period: DateRange;
  revenue: RevenueMetrics;
  profit: ProfitMetrics;
  bookings: BookingMetrics;
  retention: RetentionMetrics;
  loyalty: LoyaltyMetrics;
  reviews: ReviewMetrics;
  growth: GrowthMetrics;
  kpis: KPISummary;
}

export interface RevenueMetrics {
  total: number;
  previousPeriod: number;
  growth: number;
  growthPercentage: number;
  bySource: Record<string, number>;
  byService: ServiceRevenue[];
  byStaff: StaffRevenue[];
  averageTransactionValue: number;
  forecast: number;
}

export interface ServiceRevenue {
  serviceId: string;
  serviceName: string;
  revenue: number;
  bookings: number;
  percentage: number;
}

export interface StaffRevenue {
  staffId: string;
  staffName: string;
  revenue: number;
  bookings: number;
  percentage: number;
}

export interface ProfitMetrics {
  gross: number;
  operating: number;
  net: number;
  margin: number;
  previousPeriod: number;
  growth: number;
  expenses: ExpenseBreakdown;
}

export interface ExpenseBreakdown {
  payroll: number;
  rent: number;
  supplies: number;
  marketing: number;
  utilities: number;
  other: number;
}

export interface BookingMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  averageValue: number;
  growthRate: number;
  byDay: DayBookings[];
  byStaff: StaffBookings[];
  utilization: number; // Percentage
}

export interface DayBookings {
  date: Date;
  bookings: number;
  revenue: number;
  utilization: number;
}

export interface StaffBookings {
  staffId: string;
  staffName: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export interface RetentionMetrics {
  customerRetention: number; // Percentage
  repeatCustomers: number;
  churnRate: number;
  averageCustomerLifetime: number; // in days
  activeCustomers: number;
  byMembership: Record<string, number>;
}

export interface LoyaltyMetrics {
  programParticipation: number; // Percentage
  activeMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  memberRevenue: number;
  memberRetention: number;
  byTier: Record<string, LoyaltyTierMetrics>;
}

export interface LoyaltyTierMetrics {
  members: number;
  revenue: number;
  retention: number;
  avgLifetimeValue: number;
}

export interface ReviewMetrics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>; // 1-5 stars
  sentimentScore: number;
  npsScore: number;
  byStaff: StaffReview[];
  recentReviews: Review[];
}

export interface StaffReview {
  staffId: string;
  staffName: string;
  rating: number;
  reviewCount: number;
}

export interface Review {
  id: string;
  customerId: string;
  staffId: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface GrowthMetrics {
  revenueGrowth: number; // Percentage
  customerGrowth: number; // Percentage
  bookingGrowth: number; // Percentage
  membershipGrowth: number; // Percentage
  yearOverYear: YoYComparison;
  trends: TrendData[];
}

export interface YoYComparison {
  revenue: number;
  customers: number;
  bookings: number;
}

export interface TrendData {
  date: Date;
  revenue: number;
  bookings: number;
  customers: number;
}

export interface KPISummary {
  targetRevenue: number;
  actualRevenue: number;
  revenuePace: number; // Percentage
  targetBookings: number;
  actualBookings: number;
  bookingPace: number; // Percentage
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  roi: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardAlert {
  id: string;
  type: 'revenue' | 'performance' | 'retention' | 'rating' | 'operational';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: string;
  timestamp: Date;
}
