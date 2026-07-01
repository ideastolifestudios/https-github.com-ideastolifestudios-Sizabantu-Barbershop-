// diagnose-firestore.js
// Run with: node diagnose-firestore.js
// Requires FIREBASE_SERVICE_ACCOUNT_BASE64 to be set (loaded via dotenv from your .env file)

import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!b64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in this environment.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
} catch (e) {
  console.error("❌ Failed to decode/parse FIREBASE_SERVICE_ACCOUNT_BASE64:", e.message);
  process.exit(1);
}

console.log("--- Service Account Identity ---");
console.log("project_id:   ", serviceAccount.project_id);
console.log("client_email: ", serviceAccount.client_email);
console.log("---------------------------------\n");

if (serviceAccount.project_id !== "sizabantu-barbershop-prod") {
  console.warn(
    `⚠️  WARNING: service account project_id is "${serviceAccount.project_id}", ` +
    `but you expected "sizabantu-barbershop-prod". This alone would cause PERMISSION_DENIED ` +
    `or NOT_FOUND if it's still pointing at the old project.`
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

try {
  console.log("Attempting Firestore write to collection 'system', doc 'diagnostic-ping'...\n");
  await db.collection("system").doc("diagnostic-ping").set({
    checkedAt: admin.firestore.FieldValue.serverTimestamp(),
    from: "diagnose-firestore.js",
  });
  console.log("✅ SUCCESS: Firestore write worked. Credentials and IAM are correctly configured.");
} catch (err) {
  console.error("❌ FAILED:", err.message);
  console.error("   code:    ", err.code);
  console.error("   details: ", err.details || "(none)");
  console.log("\n--- What this usually means ---");
  if (err.code === 7 || /PERMISSION_DENIED/i.test(err.message)) {
    console.log(
      `The service account "${serviceAccount.client_email}" does not have the\n` +
      `Firestore IAM role on project "${serviceAccount.project_id}".\n` +
      `Fix: run the gcloud IAM command using this exact email.`
    );
  } else if (err.code === 5 || /NOT_FOUND/i.test(err.message)) {
    console.log(
      `The Firestore database itself may not exist yet on project "${serviceAccount.project_id}".\n` +
      `Fix: run the gcloud firestore databases create command.`
    );
  }
}

process.exit(0);
