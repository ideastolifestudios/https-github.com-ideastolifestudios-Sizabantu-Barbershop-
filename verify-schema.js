import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import 'dotenv/config'; 

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error("❌ Error: GOOGLE_APPLICATION_CREDENTIALS missing from .env");
  process.exit(1);
}

// Comprehensive data structure covering 6.2 and 6.3
const EXPANDED_SEED_DATA = {
  settings: {
    docId: 'shop_config',
    data: { 
      shopName: "Sizabantu Barbershop", 
      openingHours: { monFri: "08:00 - 18:00", sat: "08:00 - 15:00", sun: "Closed" },
      defaultSettings: { currency: "ZAR", allowCancelHours: 2, sendReminders: true }
    }
  },
  barbers: {
    docId: 'barber_johndoe',
    data: { name: "John Doe", role: "Master Barber", specialization: "Fades & Lineups", isAvailable: true, rating: 4.9 }
  },
  services: {
    docId: 'service_classic_cut',
    data: { name: "Classic Haircut", price: 150, durationMinutes: 30, description: "Standard scissor and clipper cut with hot towel finish." }
  },
  users: {
    docId: 'user_client_sample',
    data: { name: "Sipho Modise", email: "sipho@example.com", role: "client", phoneNumber: "+27821234567" }
  },
  availability: {
    docId: 'avail_johndoe_mon',
    data: { barberId: "barber_johndoe", dayOfWeek: "Monday", slots: ["08:00", "08:30", "09:00", "14:00", "14:30"] }
  },
  bookings: {
    docId: 'booking_sample_01',
    data: { barberId: "barber_johndoe", serviceId: "service_classic_cut", clientId: "user_client_sample", date: "2026-07-05", time: "09:00", status: "confirmed" }
  },
  notifications: {
    docId: 'notif_sample',
    data: { userId: "user_client_sample", type: "sms", message: "Your appointment is confirmed for July 5th.", sent: true }
  },
  gallery: {
    docId: 'gallery_cut_01',
    data: { imageUrl: "https://storage.googleapis.com/sample/fade.jpg", title: "Skin Fade", likes: 24 }
  },
  testimonials: {
    docId: 'review_01',
    data: { clientName: "Thabo M.", rating: 5, comment: "Best sharp fade in town! Highly recommend John.", approved: true }
  },
  promotions: {
    docId: 'promo_midweek',
    data: { code: "MIDWEEK20", discountPercentage: 20, active: true, description: "20% off all cuts on Tuesdays and Wednesdays." }
  }
};

try {
  const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  const app = initializeApp({ credential: cert(serviceAccount), projectId: 'sizabantu-barbershop-prod' });
  const db = getFirestore(app);

  async function executePhase6() {
    console.log("===============================================================");
    console.log("🚀 STARTING PHASE 6 COMPLETE FIRESTORE SETUP & VALIDATION");
    console.log("===============================================================\n");

    // --- 6.2 & 6.3 COLLECTIONS SEEDING ---
    console.log("--- 🟩 Steps 6.2 & 6.3: Collections & Rich Seeding ---");
    for (const [colName, config] of Object.entries(EXPANDED_SEED_DATA)) {
      const docRef = db.collection(colName).doc(config.docId);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        await docRef.set({ ...config.data, createdAt: FieldValue.serverTimestamp() });
        console.log(`🌱 Seeded missing collection [${colName}] -> Doc ID: ${config.docId}`);
      } else {
        console.log(`✅ Collection [${colName}] already verified.`);
      }
    }

    // --- 6.4 DATABASE VALIDATION CRITICAL TEST ---
    console.log("\n--- 🟩 Step 6.4: Full CRUD Operations Validation ---");
    const testCol = db.collection('system_crud_test');
    const testDocId = 'lifecycle_test_doc';

    // 1. Write Test
    await testCol.doc(testDocId).set({ status: 'initial', step: 'write_test' });
    console.log("🔹 [WRITE] Success: Temporary document written safely.");

    // 2. Read Test
    const readSnap = await testCol.doc(testDocId).get();
    if (readSnap.exists && readSnap.data().step === 'write_test') {
      console.log("🔹 [READ]  Success: Data fetched accurately matches written source.");
    } else {
      throw new Error("Read verification failed.");
    }

    // 3. Update Test
    await testCol.doc(testDocId).update({ status: 'modified', step: 'update_test' });
    const updateSnap = await testCol.doc(testDocId).get();
    if (updateSnap.exists && updateSnap.data().status === 'modified') {
      console.log("🔹 [UPDATE] Success: Document modification committed accurately.");
    } else {
      throw new Error("Update verification failed.");
    }

    // 4. Delete Test
    await testCol.doc(testDocId).delete();
    const deleteSnap = await testCol.doc(testDocId).get();
    if (!deleteSnap.exists) {
      console.log("🔹 [DELETE] Success: Temporary document successfully destroyed.");
    } else {
      throw new Error("Delete verification failed.");
    }

    console.log("\n===============================================================");
    console.log("🏆 PHASE 6 COMPLETE: 100% Verified, Seeded & CRUD Compliant!");
    console.log("===============================================================");
  }

  executePhase6();
} catch (err) {
  console.error("\n❌ PHASE 6 CRITICAL EXCEPTION:", err.message);
}