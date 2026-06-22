// Marketing Intelligence Types
export interface LeadSource {
  id: string;
  name: string;
  type: 'organic' | 'paid' | 'referral' | 'direct' | 'social' | 'email';
  description: string;
  isActive: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  sourceId: string;
  captureDate: Date;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  conversionDate?: Date;
  conversionValue?: number;
  notes?: string;
  tags: string[];
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  source: string;
  budget: number;
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'active' | 'paused' | 'completed';
  metrics: CampaignMetrics;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roi: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  cpa: number; // Cost per acquisition
  conversionRate: number;
}

export interface ConversionFunnel {
  leads: number;
  contacted: number;
  qualified: number;
  converted: number;
  conversionRate: number;
  avgTimeToConversion: number; // in days
  bySource: Record<string, ConversionMetrics>;
}

export interface ConversionMetrics {
  leads: number;
  conversions: number;
  rate: number;
  avgValue: number;
}

export interface RevenueAttribution {
  campaignId: string;
  campaignName: string;
  totalRevenue: number;
  directRevenue: number;
  assistedRevenue: number;
  conversionCount: number;
  avgOrderValue: number;
  roi: number;
  period: DateRange;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MarketingDashboardMetrics {
  totalLeads: number;
  conversionRate: number;
  totalCampaignSpend: number;
  totalCampaignRevenue: number;
  averageROI: number;
  topCampaigns: Campaign[];
  topLeadSources: LeadSourceMetric[];
  conversionFunnel: ConversionFunnel;
  period: DateRange;
}

export interface LeadSourceMetric {
  sourceId: string;
  sourceName: string;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  roi: number;
}
