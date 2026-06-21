import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import admin from 'firebase-admin';
import { logger } from '../lib/logger';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

const NotifySchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
  body: z.object({
    message: z.string().max(500),
  }),
});

export default (io: SocketIOServer) => {
  router.post("/verify", async (req, res) => {
    const { code } = req.body;
    const db = admin.firestore();
    try {
      const qSnapshot = await db.collection("bookings")
        .where("verificationCode", "==", code)
        .where("status", "in", ["confirmed", "pending"])
        .limit(1)
        .get();

      if (qSnapshot.empty) return res.status(404).json({ error: "Invalid or inactive code" });

      const bookingDoc = qSnapshot.docs[0];
      await bookingDoc.ref.update({
        status: "checked-in",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, booking: { id: bookingDoc.id, ...bookingDoc.data() } });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/notify/:userId", authenticate, requireAdmin, validate(NotifySchema), async (req, res) => {
    const { userId } = req.params;
    const { message } = req.body;
    const db = admin.firestore();

    io.emit("notification:direct", { userId, message });

    try {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) {
        const userData = userSnap.data()!;
        const email = userData.email || userData.userEmail || userData.emailAddress;
        if (email) {
          logger.info(`Notification sent to ${email}`);
        }
      }
    } catch (e) {
      logger.error({ msg: "Failed to dispatch direct notification email", err: e });
    }

    res.json({ success: true });
  });

  return router;
};
