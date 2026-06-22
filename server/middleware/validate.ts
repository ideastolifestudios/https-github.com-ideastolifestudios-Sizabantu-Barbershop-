import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

export const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .email('Invalid email address.')
  .max(255, 'Email must not exceed 255 characters.')
  .toLowerCase()
  .trim();

export const otpCodeSchema = z
  .string({ required_error: 'OTP code is required.' })
  .regex(/^\d{6}$/, 'OTP must be exactly 6 digits.');

export const userIdSchema = z
  .string({ required_error: 'User ID is required.' })
  .min(1)
  .max(128)
  .trim();

// ─── Route-Specific Body Schemas ─────────────────────────────────────────────

/** POST /api/auth/request-otp */
export const requestOtpSchema = z.object({
  email: emailSchema,
});

/** POST /api/auth/verify-otp */
export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

/** POST /api/bookings/verify */
export const verifyBookingSchema = z.object({
  code: z
    .string({ required_error: 'Verification code is required.' })
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits.'),
  barberId: z.string().min(1).max(128).optional(),
});

/** POST /api/notify/:userId */
export const notifyUserSchema = z.object({
  message: z
    .string({ required_error: 'Message is required.' })
    .min(1, 'Message cannot be empty.')
    .max(500, 'Message must not exceed 500 characters.'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  title: z.string().max(100).optional(),
});

/** POST /api/workspace/config */
export const workspaceConfigSchema = z.object({
  accessToken: z.string().min(1).max(2048).optional(),
  calendarId:  z.string().max(255).optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled:   z.boolean().optional(),
  contactsEnabled: z.boolean().optional(),
});

// ─── Middleware Factory ───────────────────────────────────────────────────────

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 * On failure → 400 with structured { error, code, details[] }.
 * On success → req.body is replaced with the sanitized/coerced value.
 *
 * Usage:
 *   router.post('/api/auth/request-otp',
 *     validateBody(requestOtpSchema),
 *     otpRequestHandler,
 *   )
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((e) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));

      res.status(400).json({
        error: 'Validation failed.',
        code: 'VALIDATION_ERROR',
        details,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
