// Predictive Reporting Types
export interface PredictiveAnalyticsConfig {
  dataRetentionDays: number;
  forecastHorizonDays: number;
  confidenceLevel: number; // 0.8, 0.9, 0.95
  minDataPointsRequired: number;
  updateFrequency: string; // cron expression
}

export interface RevenueForecast {
  period: DateRange;
  predictions: RevenuePrediction[];
  confidence: number;
  model: 'linear' | 'seasonal' | 'arima' | 'ml';
  mape: number; // Mean Absolute Percentage Error
  lastUpdated: Date;
}

export interface RevenuePrediction {
  date: Date;
  predictedRevenue: number;
  confidenceInterval: ConfidenceInterval;
  trend: 'up' | 'down' | 'stable';
  seasonalFactor: number;
  byService?: Record<string, number>;
  byStaff?: Record<string, number>;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  percentage: number; // 80, 90, 95
}

export interface PeakPeriodForecast {
  period: DateRange;
  predictions: PeakPrediction[];
  accuracy: number;
  lastUpdated: Date;
}

export interface PeakPrediction {
  dateRange: DateRange;
  type: 'daily' | 'weekly' | 'monthly';
  peakHours: string[]; // "09:00", "15:00", etc.
  expectedBookings: number;
  bookingDensity: number; // 0-1
  recommendedStaffing: number;
  expectedRevenue: number;
  confidenceLevel: number;
}

export interface StaffRequirementsForecast {
  period: DateRange;
  predictions: StaffPrediction[];
  confidence: number;
  lastUpdated: Date;
}

export interface StaffPrediction {
  date: Date;
  recommendedHeadcount: number;
  bySpecialization: Record<string, number>;
  peakHour: string;
  avgBookingsPerStaff: number;
  overtimeEstimate: number; // hours
  trainingNeeds?: string[];
}

export interface DemandForecast {
  period: DateRange;
  serviceForecasts: ServiceDemand[];
  customerGrowthForecast: number; // percentage
  churnRiskForecast: number; // percentage
  confidence: number;
}

export interface ServiceDemand {
  serviceId: string;
  serviceName: string;
  predictedDemand: number;
  trend: number; // -1 to 1
  seasonality: Record<string, number>; // by month
  recommendedPricing?: number;
  recommendedCapacity?: number;
}

export interface PredictiveAlert {
  id: string;
  type: 'revenue_drop' | 'demand_surge' | 'staffing_shortage' | 'churn_risk' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  predictedImpact: string;
  recommendedAction: string;
  probability: number; // 0-1
  generatedAt: Date;
  affectedPeriod: DateRange;
}

export interface AnomalyDetection {
  period: DateRange;
  anomalies: Anomaly[];
  lastUpdated: Date;
}

export interface Anomaly {
  timestamp: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
  suggestedAction: string;
}

export interface ModelPerformance {
  modelType: string;
  accuracy: number;
  mape: number;
  rmse: number;
  trainingDataPoints: number;
  lastTrained: Date;
  nextTrainingScheduled: Date;
}

export interface ForecastComparison {
  metric: string;
  actual: number;
  forecast: number;
  variance: number;
  variancePercentage: number;
  period: DateRange;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
