import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize with your existing service account
const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function syncUser() {
  const uid = '4Tju6Yb59mUvtbidDWep66E4Dpj1'; // The UID from your log
  const userRef = db.collection('users').doc(uid);
  
  console.log(`⏳ Creating Firestore profile for UID: ${uid}...`);
  
  await userRef.set({
    email: 'cbrprints22@gmail.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString(),
    status: 'active'
  });
  
  console.log("✅ Success! Firestore profile created.");
}

syncUser().catch(console.error);