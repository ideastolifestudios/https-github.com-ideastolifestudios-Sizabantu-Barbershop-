import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import admin from 'firebase-admin';
import crypto from 'crypto';

const router = Router();

function verifyVodaPaySignature(headers: any, payload: any): boolean {
  const signature = headers['x-vodapay-signature'];
  const secret = process.env.VODAPAY_WEBHOOK_SECRET;
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');
  return signature === expected;
}

router.post('/vodapay/initiate', authenticate, validate(z.object({
  body: z.object({
    bookingId: z.string(),
    amount: z.number().positive(),
    userEmail: z.string().email(),
  }),
})), async (req, res) => {
  const db = admin.firestore();
  const { bookingId, amount, userEmail } = req.body;

  try {
    const paymentRef = await db.collection('payments').add({
      bookingId,
      amount,
      userEmail,
      status: 'initiated',
      gateway: 'vodapay',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const mockVodaPayUrl = `https://payment.vodapay.vodacom.co.za/pay?orderId=${paymentRef.id}`;

    res.json({
      success: true,
      paymentId: paymentRef.id,
      checkoutUrl: mockVodaPayUrl,
    });
  } catch (error) {
    console.error('VodaPay initialization failed:', error);
    res.status(500).json({ error: 'Failed to initialize VodaPay payment' });
  }
});

router.post('/vodapay/callback', async (req, res) => {
  const db = admin.firestore();
  const payload = req.body;

  if (process.env.NODE_ENV === 'production' && !verifyVodaPaySignature(req.headers, payload)) {
    return res.status(401).send('Invalid signature');
  }

  try {
    const { outOrderNo, status } = payload;
    if (!outOrderNo) return res.status(400).send('Missing order number');

    const paymentSnap = await db.collection('payments').doc(outOrderNo).get();
    if (!paymentSnap.exists) return res.status(404).send('Payment record not found');

    const paymentData = paymentSnap.data()!;
    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED';
    const newStatus = isSuccess ? 'completed' : 'failed';

    await paymentSnap.ref.update({
      status: newStatus,
      rawCallback: payload,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (isSuccess) {
      await db.collection('bookings').doc(paymentData.bookingId).update({
        status: 'confirmed',
        paymentStatus: 'paid',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('VodaPay callback processing failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
