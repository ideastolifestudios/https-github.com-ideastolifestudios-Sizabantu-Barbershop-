export interface BackupConfig {
  daily: DailyBackup;
  weekly: WeeklyBackup;
  retention: RetentionPolicy;
}

export interface DailyBackup {
  schedule: string; // cron expression: "0 2 * * *" = daily at 2 AM
  targets: string[];
  encryption: boolean;
  retention: number; // days
}

export interface WeeklyBackup {
  schedule: string; // cron expression: "0 3 * * 0" = Sunday at 3 AM
  targets: string[];
  encryption: boolean;
  retention: number; // days
}

export interface RetentionPolicy {
  daily: number; // 7 days
  weekly: number; // 30 days
  monthly: number; // 90 days
  yearly: number; // 365 days
}

export const backupConfig: BackupConfig = {
  daily: {
    schedule: '0 2 * * *', // 2 AM daily
    targets: [
      'firestore:customers',
      'firestore:bookings',
      'firestore:revenue',
      'firestore:loyalty',
      'firestore:reviews',
      'googlesheets:crm',
    ],
    encryption: true,
    retention: 7, // Keep 7 days of daily backups
  },
  weekly: {
    schedule: '0 3 * * 0', // 3 AM every Sunday
    targets: [
      'github:source-code',
      'firebase:configuration',
      'environment:variables',
      'deployment:settings',
    ],
    encryption: true,
    retention: 30, // Keep 30 days of weekly backups
  },
  retention: {
    daily: 7,
    weekly: 30,
    monthly: 90,
    yearly: 365,
  },
};

export const backupTargets = {
  firestore: {
    customers: 'gs://sizabantu-backup/firestore/customers',
    bookings: 'gs://sizabantu-backup/firestore/bookings',
    revenue: 'gs://sizabantu-backup/firestore/revenue',
    loyalty: 'gs://sizabantu-backup/firestore/loyalty',
    reviews: 'gs://sizabantu-backup/firestore/reviews',
  },
  googlesheets: {
    crm: 'Google Sheets CRM Backup',
  },
  github: {
    sourceCode: 'GitHub Repository Backup',
  },
  firebase: {
    configuration: 'Firebase Configuration Backup',
  },
  environment: {
    variables: 'Environment Variables Inventory',
  },
  deployment: {
    settings: 'Deployment Configuration Backup',
  },
};
