import admin from 'firebase-admin';
import { logger } from '../lib/logger';
import { Server as SocketIOServer } from 'socket.io';

export async function runSessionRuleEngine(io: SocketIOServer) {
  const db = admin.firestore();
  try {
    const now = admin.firestore.Timestamp.now();
    const tenMinsFromNow = new admin.firestore.Timestamp(now.seconds + 600, 0);

    const bookingsToExpire = await db.collection("bookings")
      .where("status", "in", ["confirmed", "pending"])
      .where("type", "==", "scheduled")
      .where("scheduledAt", "<=", tenMinsFromNow)
      .get();

    for (const doc of bookingsToExpire.docs) {
      const data = doc.data();
      await doc.ref.update({
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info(`Booking expired: ${doc.id}`);
      io.emit("notification:direct", {
        userId: data.userId,
        message: "Session expired due to late arrival. Rebooking required."
      });
    }
  } catch (error) {
    logger.error({ msg: "Rule Engine Error", err: error });
  }
}
