import admin from 'firebase-admin';
import crypto from 'crypto';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = async (email: string, code: string) => {
  const db = admin.firestore();
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  await db.collection('otp_sessions').doc(email).set({
    code: hashedCode,
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60000)),
    attempts: 0
  });
};

export const verifyOTP = async (email: string, code: string) => {
  const db = admin.firestore();
  const docRef = db.collection('otp_sessions').doc(email);
  const doc = await docRef.get();

  if (!doc.exists) return { success: false, error: 'No session found' };

  const data = doc.data()!;
  if (data.expiresAt.toDate() < new Date()) return { success: false, error: 'Expired' };

  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  if (data.code === hashedCode) {
    await docRef.delete();
    return { success: true };
  } else {
    await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    return { success: false, error: 'Invalid code' };
  }
};
