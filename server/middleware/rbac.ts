import { Response, NextFunction } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware: requires the requesting user to have role === 'admin'.
 * Must be called AFTER requireAuth (needs req.uid).
 *
 * Usage:
 *   router.post('/api/workspace/config', requireAuth, requireAdmin, handler)
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.uid) {
    res.status(401).json({ error: 'Authentication required.', code: 'MISSING_UID' });
    return;
  }

  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.uid).get();

    if (!userDoc.exists) {
      res.status(403).json({ error: 'Forbidden.', code: 'USER_NOT_FOUND' });
      return;
    }

    const role = userDoc.data()?.role as string | undefined;
    req.userRole = role as AuthenticatedRequest['userRole'];

    if (role !== 'admin') {
      res.status(403).json({ error: 'Admin access required.', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    next();
  } catch (err: any) {
    console.error('[RBAC] Role lookup failed:', err.message);
    res.status(500).json({ error: 'Internal server error.', code: 'ROLE_LOOKUP_FAILED' });
  }
}

/**
 * Middleware: requires role === 'barber' OR 'admin'.
 * Must be called AFTER requireAuth.
 */
export async function requireBarberOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.uid) {
    res.status(401).json({ error: 'Authentication required.', code: 'MISSING_UID' });
    return;
  }

  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.uid).get();

    if (!userDoc.exists) {
      res.status(403).json({ error: 'Forbidden.', code: 'USER_NOT_FOUND' });
      return;
    }

    const role = userDoc.data()?.role as string | undefined;
    req.userRole = role as AuthenticatedRequest['userRole'];

    if (!['barber', 'admin'].includes(role ?? '')) {
      res.status(403).json({
        error: 'Barber or admin access required.',
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('[RBAC] Role lookup failed:', err.message);
    res.status(500).json({ error: 'Internal server error.', code: 'ROLE_LOOKUP_FAILED' });
  }
}
