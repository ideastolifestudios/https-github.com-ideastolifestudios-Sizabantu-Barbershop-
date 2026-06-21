import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import admin from 'firebase-admin';
import { decrypt } from '../services/encryption';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

const WorkspaceConfigSchema = z.object({
  body: z.object({
    calendarId: z.string().optional(),
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    contactsEnabled: z.boolean().optional(),
    onboardingEnabled: z.boolean().optional(),
  }),
});

export default (io: SocketIOServer) => {
  router.get("/status", async (req, res) => {
    const db = admin.firestore();
    try {
      const doc = await db.collection("settings").doc("google_workspace").get();
      if (!doc.exists) return res.json({ linked: false });
      const data = doc.data()!;
      const accessToken = data.accessToken ? decrypt(data.accessToken) : null;
      res.json({
        linked: !!accessToken,
        ...data,
        accessToken: undefined
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/config", authenticate, requireAdmin, validate(WorkspaceConfigSchema), async (req, res) => {
    const db = admin.firestore();
    try {
      await db.collection("settings").doc("google_workspace").set({
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
};
