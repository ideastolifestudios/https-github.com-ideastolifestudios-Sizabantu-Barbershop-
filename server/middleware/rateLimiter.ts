import rateLimit from 'express-rate-limit';

/** Standardized 429 JSON response */
const handler = (_req: any, res: any, _next: any, options: any) => {
  res.status(429).json({
    error: options.message,
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

/**
 * OTP Request — 5 requests per 15 min per IP.
 * Prevents SMTP quota exhaustion and email harvesting.
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
  handler,
});

/**
 * OTP Verification — 10 attempts per 15 min per IP.
 * Secondary defence; primary lockout is in server/services/otp.ts.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many OTP verification attempts. Please wait 15 minutes.',
  handler,
});

/**
 * Booking check-in — 20 per minute per IP.
 * Prevents brute-force of 6-digit check-in codes.
 */
export const bookingVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many booking verification attempts.',
  handler,
});

/**
 * Notification sends — 10 per minute per IP.
 * Prevents spam email sends via /api/notify.
 */
export const notifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many notification requests. Please slow down.',
  handler,
});

/**
 * Global API — 200 per 5 min per IP applied to all /api/* routes.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests from this IP. Please try again later.',
  handler,
});
