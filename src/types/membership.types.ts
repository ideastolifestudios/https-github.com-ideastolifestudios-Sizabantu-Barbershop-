// Membership System Types
export type MembershipTier = 'bronze' | 'silver' | 'gold' | 'vip';

export interface MembershipLevel {
  tier: MembershipTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  benefits: MembershipBenefit[];
  discountPercentage: number;
  freebiesPerMonth: number;
  priorityBooking: boolean;
  exclusiveServices: string[];
  loyaltyMultiplier: number;
  monthlyAllowance?: number;
}

export interface MembershipBenefit {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'freebie' | 'priority' | 'exclusive' | 'reward';
  value: number | string;
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  tier: MembershipTier;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: Date;
  renewalDate: Date;
  billingCycle: 'monthly' | 'annual';
  autoRenew: boolean;
  totalSpentUnderMembership: number;
  servicesUsed: number;
  freebiesRemaining: number;
  lastRenewalDate?: Date;
  cancellationDate?: Date;
  cancellationReason?: string;
}

export interface MembershipUsage {
  customerId: string;
  tier: MembershipTier;
  period: DateRange;
  servicesBooked: number;
  freebiesUsed: number;
  discountsSaved: number;
  priorityBookingsUsed: number;
  exclusiveServicesUsed: number;
  loyaltyPointsEarned: number;
}

export interface MembershipAnalytics {
  totalMembers: number;
  membersByTier: Record<MembershipTier, number>;
  activeMembers: number;
  churnRate: number;
  averageLifetimeValue: number;
  upgrades: number;
  downgrades: number;
  renewalRate: number;
  revenueByTier: Record<MembershipTier, number>;
  period: DateRange;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MembershipPromotion {
  id: string;
  name: string;
  description: string;
  tier: MembershipTier;
  discountPercentage?: number;
  discountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
}
