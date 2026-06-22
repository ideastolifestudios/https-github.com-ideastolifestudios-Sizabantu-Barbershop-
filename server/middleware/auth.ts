import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

/**
 * Extends Express Request to carry decoded Firebase auth info.
 * Available on all routes protected by requireAuth / requireAdmin.
 */
export interface AuthenticatedRequest extends Request {
  uid?: string;
  userRole?: 'client' | 'barber' | 'admin';
}

/**
 * Middleware: verifies Firebase ID Token in Authorization header.
 * Rejects with 401 if token is absent, malformed, or expired.
 * On success, attaches req.uid and calls next().
 *
 * Usage:
 *   router.post('/api/notify/:userId', requireAuth, requireAdmin, handler)
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required.',
      code: 'MISSING_AUTH_TOKEN',
    });
    return;
  }

  const idToken = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = await getAuth().verifyIdToken(idToken, /* checkRevoked= */ true);
    req.uid = decoded.uid;
    next();
  } catch (err: any) {
    const code =
      err.code === 'auth/id-token-revoked'
        ? 'TOKEN_REVOKED'
        : 'INVALID_AUTH_TOKEN';

    console.error(`[AUTH] Token verification failed — ${code}:`, err.message);

    res.status(401).json({
      error: 'Invalid or expired authentication token.',
      code,
    });
  }
}
