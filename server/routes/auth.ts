import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimiter';
import { storeOTP, verifyOTP, generateOTP } from '../services/otp';
import { logger } from '../lib/logger';
import admin from 'firebase-admin';

const router = Router();

const OTPRequestSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const OTPVerifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

router.post("/request-otp", otpRequestLimiter, validate(OTPRequestSchema), async (req, res) => {
  const { email } = req.body;
  const code = generateOTP();
  await storeOTP(email, code);
  logger.info(`[AUTH] Sent code ${code} to ${email}`);
  res.json({ success: true });
});

router.post("/verify-otp", otpVerifyLimiter, validate(OTPVerifySchema), async (req, res) => {
  const { email, otp } = req.body;
  const result = await verifyOTP(email, otp);
  if (result.success) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email).catch(async () => {
        return await admin.auth().createUser({ email });
      });
      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      res.json({ success: true, customToken });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  } else {
    res.status(401).json({ error: result.error || "Invalid code" });
  }
});

export default router;
