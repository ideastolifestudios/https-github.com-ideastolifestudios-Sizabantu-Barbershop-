import 'dotenv/config'; // 👈 Crucial: Must be at the absolute top to load .env variables first
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error("❌ Error: GOOGLE_APPLICATION_CREDENTIALS missing from .env");
  process.exit(1);
}

try {
  // Read using the path verified by your .env file
  const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  const app = initializeApp({ credential: cert(serviceAccount), projectId: 'sizabantu-barbershop-prod' });
  const db = getFirestore(app);
  const auth = getAuth(app);

  async function promoteToAdmin(targetEmail) {
    console.log(`\n⏳ Attempting promotion workflow for: ${targetEmail}...`);
    
    try {
      const userRecord = await auth.getUserByEmail(targetEmail);
      const uid = userRecord.uid;
      console.log(`🎯 Found Auth User Record. UID: ${uid}`);
      
      await auth.setCustomUserClaims(uid, { role: 'admin' });
      console.log("🔒 Custom token claim ['admin'] successfully attached.");
      
      const userDocRef = db.collection('users').doc(uid);
      await userDocRef.update({ 
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      console.log("📝 Firestore profile document successfully changed to 'admin'.");
      
      console.log(`\n🏆 SUCCESS: ${targetEmail} is officially a system administrator!\n`);
      
    } catch (authError) {
      console.error(`❌ Operations failed for user ${targetEmail}:`, authError.message);
    }
  }

  // ==========================================
  // CONFIGURATION: Set your profile email here
  // ==========================================
  const TARGET_USER_EMAIL = 'cbrprints22@gmail.com'; 
  
  if (TARGET_USER_EMAIL === 'your-email@example.com') {
    console.warn("⚠️  Please open set-admin.js and change 'your-email@example.com' to your actual registered account email.");
  } else {
    promoteToAdmin(TARGET_USER_EMAIL);
  }

} catch (initError) {
  console.error("❌ Failed to initialize execution runtime:", initError.message);
}