export interface KPITarget {
  metric: string;
  target: number | string;
  current?: number | string;
  unit: string;
  status?: 'on-track' | 'at-risk' | 'off-track';
}

export const businessKPIs: KPITarget[] = [
  {
    metric: 'Booking Conversion Rate',
    target: '10%+',
    unit: 'percentage',
    status: 'on-track',
  },
  {
    metric: 'Repeat Customers',
    target: '60%+',
    unit: 'percentage',
    status: 'on-track',
  },
  {
    metric: 'Google Reviews',
    target: '100+',
    unit: 'count',
    status: 'on-track',
  },
  {
    metric: 'Average Ticket Value',
    target: 'Growing Monthly',
    unit: 'growth',
    status: 'on-track',
  },
  {
    metric: 'Referral Rate',
    target: '20%+',
    unit: 'percentage',
    status: 'on-track',
  },
  {
    metric: 'No-Show Rate',
    target: 'Under 5%',
    unit: 'percentage',
    status: 'on-track',
  },
  {
    metric: 'Customer Acquisition Cost',
    target: 'Decreasing',
    unit: 'trend',
  },
  {
    metric: 'Customer Lifetime Value',
    target: 'Increasing',
    unit: 'trend',
  },
  {
    metric: 'Staff Utilization',
    target: '80%+',
    unit: 'percentage',
  },
  {
    metric: 'Revenue Growth YoY',
    target: '25%+',
    unit: 'percentage',
  },
];
