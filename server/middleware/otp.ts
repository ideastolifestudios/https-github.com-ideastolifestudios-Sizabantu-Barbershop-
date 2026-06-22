/**
 * OTP Service — Upstash Redis backed
 *
 * Design:
 *  - OTPs are cryptographically random 6-digit codes
 *  - Stored as SHA-256 hashes (never plaintext) in Redis
 *  - Rate limited: 1 request per 60 seconds per email
 *  - Max 3 verification attempts before 10-minute lockout
 *  - TTL: 10 minutes to expiry
 *  - Single-use: deleted immediately on successful verification
 */
import { createHash, randomInt } from 'crypto';
import { Redis } from '@upstash/redis';

// ─── Redis Client ─────────────────────────────────────────────────────────────
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_TTL_SECONDS      = 600;  // 10 minutes
const RATE_LIMIT_SECONDS   = 60;   // 1 request per minute per email
const MAX_ATTEMPTS         = 3;    // Attempts before lockout
const LOCKOUT_SECONDS      = 600;  // 10-minute lockout

// ─── Key Namespacing ──────────────────────────────────────────────────────────
const k = {
  code:     (e: string) => `otp:code:${e}`,
  rate:     (e: string) => `otp:rate:${e}`,
  attempts: (e: string) => `otp:attempts:${e}`,
  locked:   (e: string) => `otp:locked:${e}`,
};

const normalize = (email: string) => email.toLowerCase().trim();

function hashOtp(code: string): string {
  return createHash('sha256').update(`${code}:sizabantu-salt`).digest('hex');
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type OtpGenerateResult =
  | { success: true;  code: string; expiresInSeconds: number }
  | { success: false; reason: 'RATE_LIMITED' | 'ACCOUNT_LOCKED'; retryAfterSeconds: number };

export type OtpVerifyResult =
  | { valid: true }
  | { valid: false; reason: 'INVALID_OR_EXPIRED' | 'MAX_ATTEMPTS_EXCEEDED' | 'ACCOUNT_LOCKED';
      attemptsRemaining?: number; retryAfterSeconds?: number };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and store a new OTP for the given email.
 * Returns the plaintext code — send it via email ONLY; never log it.
 */
export async function generateOtp(email: string): Promise<OtpGenerateResult> {
  const e = normalize(email);

  // 1. Lockout check
  const lockTtl = await redis.ttl(k.locked(e));
  if (lockTtl > 0) {
    return { success: false, reason: 'ACCOUNT_LOCKED', retryAfterSeconds: lockTtl };
  }

  // 2. Rate limit check (1 per minute)
  const rateTtl = await redis.ttl(k.rate(e));
  if (rateTtl > 0) {
    return { success: false, reason: 'RATE_LIMITED', retryAfterSeconds: rateTtl };
  }

  // 3. Generate cryptographically random 6-digit code
  const code = String(randomInt(100000, 999999));

  // 4. Store hashed OTP + rate key; reset attempt counter
  await Promise.all([
    redis.set(k.code(e),     hashOtp(code), { ex: OTP_TTL_SECONDS    }),
    redis.set(k.rate(e),     '1',           { ex: RATE_LIMIT_SECONDS  }),
    redis.del(k.attempts(e)),
  ]);

  return { success: true, code, expiresInSeconds: OTP_TTL_SECONDS };
}

/**
 * Verify a submitted OTP code.
 * Deletes the OTP from Redis on success (single-use enforcement).
 * Locks the account after MAX_ATTEMPTS failures.
 */
export async function verifyOtp(email: string, submitted: string): Promise<OtpVerifyResult> {
  const e = normalize(email);

  // 1. Lockout check
  const lockTtl = await redis.ttl(k.locked(e));
  if (lockTtl > 0) {
    return { valid: false, reason: 'ACCOUNT_LOCKED', retryAfterSeconds: lockTtl };
  }

  // 2. Retrieve stored hash
  const storedHash = await redis.get<string>(k.code(e));
  if (!storedHash) {
    return { valid: false, reason: 'INVALID_OR_EXPIRED' };
  }

  // 3. Compare hashes (constant-time-ish via digest comparison)
  const submittedHash = hashOtp(submitted.trim());
  if (submittedHash !== storedHash) {
    const attempts = await redis.incr(k.attempts(e));
    await redis.expire(k.attempts(e), OTP_TTL_SECONDS);

    if (attempts >= MAX_ATTEMPTS) {
      // Lock account; clear code and attempts
      await Promise.all([
        redis.set(k.locked(e),   '1', { ex: LOCKOUT_SECONDS }),
        redis.del(k.code(e)),
        redis.del(k.attempts(e)),
      ]);
      return { valid: false, reason: 'MAX_ATTEMPTS_EXCEEDED', retryAfterSeconds: LOCKOUT_SECONDS };
    }

    return { valid: false, reason: 'INVALID_OR_EXPIRED', attemptsRemaining: MAX_ATTEMPTS - attempts };
  }

  // 4. SUCCESS — single-use cleanup
  await Promise.all([
    redis.del(k.code(e)),
    redis.del(k.attempts(e)),
    redis.del(k.rate(e)),
  ]);

  return { valid: true };
}

/** Admin/test utility — clears all OTP state for an email. */
export async function clearOtp(email: string): Promise<void> {
  const e = normalize(email);
  await Promise.all([k.code(e), k.rate(e), k.attempts(e), k.locked(e)].map((key) => redis.del(key)));
}
