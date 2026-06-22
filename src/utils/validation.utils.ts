export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

export async function validateProduction(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    timestamp: new Date(),
  };

  // Check environment variables
  const requiredEnvVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY',
    'EMAIL_FROM',
    'EMAIL_TO',
    'NEXT_PUBLIC_SITE_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      result.errors.push(`Missing environment variable: ${envVar}`);
      result.passed = false;
    }
  }

  // Check Firebase configuration
  try {
    // Validate Firebase connection
    result.warnings.push('Firebase connection validation pending');
  } catch (error) {
    result.errors.push(`Firebase configuration error: ${error}`);
    result.passed = false;
  }

  // Check email configuration
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_TO) {
    result.errors.push('Email configuration incomplete');
    result.passed = false;
  }

  // Check API keys
  const apiKeys = ['GEMINI_API_KEY', 'GOOGLE_CLIENT_ID'];
  for (const key of apiKeys) {
    if (!process.env[key]) {
      result.errors.push(`Missing API key: ${key}`);
      result.passed = false;
    }
  }

  return result;
}

export function validateCustomerJourney(journey: any): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    timestamp: new Date(),
  };

  const requiredSteps = [
    'website_visit',
    'booking_submitted',
    'booking_stored',
    'confirmation_email',
    'owner_notification',
    'reminder_sent',
    'visit_completed',
    'review_request',
    'loyalty_updated',
    'rebooking_reminder',
  ];

  for (const step of requiredSteps) {
    if (!journey[step]) {
      result.errors.push(`Missing journey step: ${step}`);
      result.passed = false;
    }
  }

  return result;
}

export function validateAdminAccess(adminUser: any): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    timestamp: new Date(),
  };

  const requiredPermissions = [
    'add_services',
    'edit_prices',
    'manage_staff',
    'view_bookings',
    'view_revenue',
    'export_reports',
    'view_loyalty',
    'view_referrals',
  ];

  for (const permission of requiredPermissions) {
    if (!adminUser.permissions?.includes(permission)) {
      result.errors.push(`Missing permission: ${permission}`);
      result.passed = false;
    }
  }

  return result;
}
