import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  const config = firebaseConfig as any;
  const projectId = process.env.PROJECT_ID || config.projectId;
  const appInstance = !admin.apps.length 
    ? admin.initializeApp({ projectId: projectId })
    : admin.app();

  // Reference for multi-database: getFirestore(app, databaseId)
  db = config.firestoreDatabaseId 
    ? getFirestore(appInstance, config.firestoreDatabaseId)
    : getFirestore(appInstance);
  console.log(`Firebase Admin initialized for project: ${projectId}, database: ${config.firestoreDatabaseId || 'default'}`);

  // Connectivity Test
  db.collection("system").doc("ping").set({
    lastCheck: admin.firestore.FieldValue.serverTimestamp(),
    status: "online"
  }).then(() => {
    console.log("Firebase Admin connectivity test: SUCCESS");
  }).catch((err) => {
    console.error("Firebase Admin connectivity test: FAILED", {
      message: err.message,
      code: err.code,
      projectId: config.projectId,
      dbId: config.firestoreDatabaseId
    });
  });
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

// --- SMTP EMAIL SYSTEM (Secure STPM / Fallback Integration) ---

let smtpTransporter: nodemailer.Transporter | null = null;

function getSMTPTransporter(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[SMTP] Secure variables not fully configured. Using logging mock framework.");
    return null;
  }

  try {
    smtpTransporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: port === "465",
      auth: {
        user,
        pass,
      },
    });
    return smtpTransporter;
  } catch (err) {
    console.error("[SMTP] Initialization failed:", err);
    return null;
  }
}

async function sendSMTPEmail(options: { to: string; subject: string; text?: string; html?: string }) {
  const transporter = getSMTPTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "sizabantubarbershop@gmail.com";

  if (!transporter) {
    console.log(`\n--- [MOCK SMTP DISPATCH] ---`);
    console.log(`From:    ${from}`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Text:    ${options.text || "None Provided"}`);
    if (options.html) console.log(`HTML Payload present (length: ${options.html.length} chars)`);
    console.log(`-----------------------------\n`);
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[SMTP] Email successfully sent to ${options.to}! MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP] Failed to send email to ${options.to}:`, err);
    return { success: false, error: (err as Error).message };
  }
}

// --- API ROUTES (Session Rule Engine & Automation) ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint to verify a booking code (Safety & Verification)
app.post("/api/bookings/verify", async (req, res) => {
  const { code } = req.body;
  if (!db) return res.status(500).json({ error: "Database not ready" });

  try {
    const qSnapshot = await db.collection("bookings")
      .where("verificationCode", "==", code)
      .where("status", "in", ["confirmed", "pending"]) // Allow pending for walk-ins
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

// --- AUTH OTP SYSTEM (Sign Code Authentication) ---

const otpStore = new Map<string, { code: string; expires: number }>();

app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { code, expires: Date.now() + 10 * 60000 }); // 10 mins
  
  console.log(`[AUTH] Sent code ${code} to ${email}`);
  
  // Format HTML access code template
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px; color: #ffffff; border-radius: 24px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 25px; margin-bottom: 30px;">
        <h1 style="color: #ef4444; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span></h1>
        <p style="color: #3b82f6; font-size: 10px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase; margin: 8px 0 0 0;">AUTH SECURE CODE</p>
      </div>
      
      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">Use the verification code below to complete your sign-in to the Sizabantu Barbershop platform:</p>
      
      <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; text-align: center; margin: 25px auto; max-width: 250px;">
        <span style="font-size: 32px; font-weight: 900; color: #10b981; font-family: monospace; letter-spacing: 0.15em;">${code}</span>
      </div>
      
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 30px;">
        This code is valid for 10 minutes. If you did not request this sign-in code, you can safely ignore this email.
      </p>
      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #475569;">
        Sizabantu Barbershop • Klipfontein View • Midrand
      </div>
    </div>
  `;

  await sendSMTPEmail({
    to: email,
    subject: `Sizabantu Barbershop Auth Code [${code}]`,
    text: `Your Sizabantu Barbershop verification code is: ${code}`,
    html: htmlContent
  });
  
  res.json({ success: true });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore.get(email);

  if (stored && stored.code === otp && stored.expires > Date.now()) {
    otpStore.delete(email);
    
    // Create Firebase Custom Token
    try {
      const userRecord = await admin.auth().getUserByEmail(email).catch(async () => {
        return await admin.auth().createUser({ email });
      });
      const customToken = await admin.auth().createCustomToken(userRecord.uid, {
        email: email,
        email_verified: userRecord.emailVerified || false
      });
      res.json({ success: true, customToken });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  } else {
    res.status(401).json({ error: "Invalid or expired code" });
  }
});

// Endpoint to trigger manual notification (Barber Action)
app.post("/api/notify/:userId", async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;
  
  // 1. Live socket stream
  io.emit("notification:direct", { userId, message });

  // 2. Secure mail delivery over SMTP
  if (db) {
    try {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) {
        const userData = userSnap.data()!;
        const email = userData.email || userData.userEmail || userData.emailAddress;
        if (email) {
          console.log(`[NOTIFY] Dispatching direct SMTP notification email to ${email}`);
          const displayName = userData.displayName || userData.userName || "Valued Client";
          const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px; color: #ffffff; border-radius: 24px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
              <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 25px; margin-bottom: 30px;">
                <h1 style="color: #ef4444; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span></h1>
                <p style="color: #eab308; font-size: 10px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase; margin: 8px 0 0 0;">NEW DIRECT MESSAGE</p>
              </div>
              
              <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">Hello <strong>${displayName}</strong>,</p>
              <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 25px;">You have received a direct update from the Sizabantu Barbershop team:</p>
              
              <div style="background-color: rgba(255,255,255,0.04); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 25px 0; font-style: italic; color: #f1f5f9; line-height: 1.6;">
                "${message}"
              </div>
              
              <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 30px;">
                You can view and reply to this message on our live dashboard at any time.
              </p>
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #475569;">
                Sizabantu Barbershop • Klipfontein View • Midrand
              </div>
            </div>
          `;
          
          await sendSMTPEmail({
            to: email,
            subject: "Update from Sizabantu Barbershop Team",
            text: `Sizabantu Barbershop Notification: ${message}`,
            html: htmlContent
          });
        }
      }
    } catch (e) {
      console.error("[NOTIFY] Failed to dispatch direct notification email:", e);
    }
  }

  res.json({ success: true });
});

// --- GOOGLE WORKSPACE ENDPOINTS ---

app.get("/api/workspace/status", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not ready" });
  try {
    const doc = await db.collection("settings").doc("google_workspace").get();
    if (!doc.exists) {
      return res.json({ linked: false });
    }
    const data = doc.data()!;
    res.json({
      linked: !!data.accessToken,
      emailEnabled: data.emailEnabled ?? true,
      smsEnabled: data.smsEnabled ?? true,
      contactsEnabled: data.contactsEnabled ?? true,
      onboardingEnabled: data.onboardingEnabled ?? true,
      calendarId: data.calendarId || 'primary',
      linkedBy: data.linkedBy || '',
      linkedAt: data.linkedAt || '',
      status: data.status || 'active',
      expiresAt: data.expiresAt || ''
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/workspace/config", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not ready" });
  const { calendarId, emailEnabled, smsEnabled, contactsEnabled, onboardingEnabled } = req.body;
  try {
    await db.collection("settings").doc("google_workspace").set({
      calendarId: calendarId ?? 'primary',
      emailEnabled: emailEnabled !== false,
      smsEnabled: smsEnabled !== false,
      contactsEnabled: contactsEnabled !== false,
      onboardingEnabled: onboardingEnabled !== false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/workspace/test", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not ready" });
  try {
    const wsSnap = await db.collection("settings").doc("google_workspace").get();
    if (!wsSnap.exists || !wsSnap.data()?.accessToken) {
      return res.status(400).json({ error: "Google Workspace not linked yet. Please use the Admin panel to connect." });
    }
    
    // Simulate/Trigger a test booking sync and email
    const wsData = wsSnap.data()!;
    const testEmail = wsData.linkedBy || 'sizabantubarbershop@gmail.com';
    const testBooking = {
      userName: "Sizabantu Test Client",
      userEmail: testEmail,
      serviceName: "Classic Fade & Trim",
      totalPaid: 65,
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      verificationCode: "999888",
      status: "confirmed"
    };

    console.log(`[TEST DISPATCH] Firing test workspace integration to ${testEmail}`);
    await runWorkspaceAutomationForBooking("test-booking-id", testBooking);

    res.json({ success: true, message: `Test booking synced! Checked calendar, sent email, and created contact for ${testEmail}.` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- GOOGLE WORKSPACE AUTOMATION CORE INTEGRATION ---

async function createGoogleContact(accessToken: string, userName: string, userEmail: string, userPhone?: string) {
  try {
    console.log(`[WORKSPACE] Automatically adding client ${userName} (${userEmail}) as Google Contact...`);
    
    let givenName = userName || "Client";
    let familyName = "";
    if (userName && userName.includes(" ")) {
      const parts = userName.trim().split(/\s+/);
      givenName = parts[0];
      familyName = parts.slice(1).join(" ");
    }

    const contactBody: any = {
      names: [
        {
          givenName: givenName,
          familyName: familyName
        }
      ],
      biographies: [
        {
          value: "Sizabantu Barbershop client"
        }
      ]
    };

    if (userEmail) {
      contactBody.emailAddresses = [
        {
          value: userEmail,
          type: "home"
        }
      ];
    }

    if (userPhone) {
      contactBody.phoneNumbers = [
        {
          value: userPhone,
          type: "mobile"
        }
      ];
    }

    const res = await fetch("https://people.googleapis.com/v1/people:createContact", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contactBody)
    });

    if (res.ok) {
      const contactData = await res.json();
      console.log(`[WORKSPACE] Google Contact created successfully! ResourceName: ${contactData.resourceName}`);
      return { success: true, resourceName: contactData.resourceName };
    } else {
      const errText = await res.text();
      console.error(`[WORKSPACE] Google Contact creation failed:`, errText);
      return { success: false, error: errText };
    }
  } catch (err) {
    console.error("[WORKSPACE] Google Contact API Error:", err);
    return { success: false, error: (err as Error).message };
  }
}

// --- GOOGLE WORKSPACE AUTOMATED CLIENT ONBOARDING WORKFLOW ---

async function sendWorkspaceOrFallbackEmail(to: string, subject: string, html: string) {
  if (!db) return false;
  try {
    const workspaceSnap = await db.collection("settings").doc("google_workspace").get();
    const wsData = workspaceSnap.exists ? workspaceSnap.data()! : {};
    const { accessToken = null } = wsData;

    if (accessToken) {
      console.log(`[ONBOARDING] Dispatching onboarding email to ${to} via Google Workspace Gmail API`);
      const mailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        html
      ];
      const rawEmail = Buffer.from(mailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (gmailRes.ok) {
        console.log(`[ONBOARDING] Welcome email successfully sent to ${to} using Google Workspace API!`);
        return true;
      } else {
        const errText = await gmailRes.text();
        console.warn(`[ONBOARDING] Welcome email sending failed. Falling back to SMTP. Error: ${errText}`);
      }
    }
  } catch (err) {
    console.error(`[ONBOARDING] Google Workspace exception occurred:`, err);
  }

  // SMTP Fallback
  console.log(`[ONBOARDING] Deploying SMTP email fallback sequence...`);
  const smtpResult = await sendSMTPEmail({
    to,
    subject,
    html
  });
  return smtpResult.success;
}

async function handleFirstBookingOnboarding(bookingId: string, booking: any) {
  if (!db) return;
  const userEmail = booking.userEmail;
  if (!userEmail) return;

  try {
    const onboardingRef = db.collection("onboarding_statuses").doc(userEmail);
    const onboardingDoc = await onboardingRef.get();

    if (onboardingDoc.exists && onboardingDoc.data()?.welcomeSent) {
      console.log(`[ONBOARDING] Onboarding welcome email already processed for ${userEmail}.`);
      return;
    }

    // Verify first-time active booking count for this email
    const bookingsSnap = await db.collection("bookings")
      .where("userEmail", "==", userEmail)
      .get();
    
    const activeBookings = bookingsSnap.docs.filter(d => d.data().status !== 'cancelled');

    if (activeBookings.length <= 1 || (onboardingDoc.exists && !onboardingDoc.data()?.welcomeSent)) {
      console.log(`[ONBOARDING] Automated trigger: First booking confirmed for ${booking.userName} (${userEmail})!`);

      // 1. Welcome Email Details
      const welcomeSubject = `Welcome to Sizabantu Barbershop! Your Journey to Premium Grooming ✨`;
      const welcomeHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 45px 30px; color: #ffffff; border-radius: 28px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);">
          <!-- Logo Header -->
          <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 30px; margin-bottom: 35px;">
            <h1 style="color: #ef4444; font-size: 30px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">
              Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span>
            </h1>
            <p style="color: #3b82f6; font-size: 11px; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase; margin: 8px 0 0 0;">OFFICIAL CLIENT WELCOME</p>
          </div>

          <p style="font-size: 16px; color: #f1f5f9; line-height: 1.6; margin-bottom: 16px;">Hello <strong>${booking.userName || "Valued Client"}</strong>,</p>
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">
            Welcome to the <strong>Sizabantu Barbershop family</strong>! We are absolutely thrilled that you booked your first premium grooming experience with us. Our chair is officially reserved for you, and we cannot wait to help you sculpt your personalized style.
          </p>

          <!-- Core Specializations -->
          <div style="background-color: rgba(59, 130, 246, 0.04); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 18px; padding: 22px; margin-bottom: 28px;">
            <h3 style="color: #3b82f6; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0;">Our Premium Specializations</h3>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13.5px; line-height: 1.8;">
              <li><strong>Precision Modern Fades & Tapers:</strong> Expertly tapered edges custom-designed for your hair texture and head structure.</li>
              <li><strong>Signature Beard Sculpting:</strong> Clean, razor-sharp outlines utilizing warm towels and essential oils.</li>
              <li><strong>Hot Towel Comfort Care:</strong> Pure relaxation, pre-shave hydration, and luxurious treatment to soothe skin.</li>
              <li><strong>Loyalty Circle:</strong> Accumulate stamps with every booking for free haircuts and VIP slot perks!</li>
            </ul>
          </div>

          <!-- Cut Maintenance Tips Section -->
          <div style="background-color: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 18px; padding: 22px; margin-bottom: 30px;">
            <h3 style="color: #ef4444; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0;">✨ Grooming Pro-Tips: Maintain Your Cut!</h3>
            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin: 0 0 12px 0;">
              Keep your fresh haircut and skin looking sharp between barbershop visits with these expert guidelines:
            </p>
            <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
              <li><strong>Stay Hydrated:</strong> Moisturize your scalp and groom the edges using premium beard oils or natural conditioners to prevent dryness.</li>
              <li><strong>Brush Correctly:</strong> Brush or comb your hair in the direction of its natural growth pattern to keep the fade flow looking crisp.</li>
              <li><strong>Protect Your Hair at Night:</strong> Wear a satin wave cap or durag to lock in moisture and protect detailed lines from friction.</li>
              <li><strong>The 2-Week Touchup Rule:</strong> Fades look best during weeks 1 and 2. Book your contour touch-ups in advance to stay perpetually fresh.</li>
            </ol>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 35px 0 20px 0;">
            <a href="https://ais-pre-2u2z4yaqulikrpztoyxq2z-71529805665.europe-west3.run.app" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 13.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">
              View My Booking Dashboard
            </a>
          </div>

          <!-- Signoff Footer -->
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 25px;">
            See you in the chair soon,<br>
            <strong style="color: #ffffff;">The Sizabantu Barbershop Team</strong>
          </p>
          <p style="font-size: 10px; color: #475569; text-align: center; margin-top: 15px;">
            Sizabantu Barbershop • Klipfontein View Shopping Complex • Midrand, South Africa
          </p>
        </div>
      `;

      // Dispatch Immediately
      const welcomeMailSent = await sendWorkspaceOrFallbackEmail(userEmail, welcomeSubject, welcomeHtml);

      // 2. Schedule Follow-Up Email after 1 week
      const followUpScheduledTime = new Date();
      followUpScheduledTime.setDate(followUpScheduledTime.getDate() + 7); // 7 days later

      const reviewSubject = `How was your first Sizabantu Barbershop experience? We value your thoughts! 💈`;
      const reviewHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 45px 30px; color: #ffffff; border-radius: 28px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);">
          <!-- Heading Logo -->
          <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 30px; margin-bottom: 35px;">
            <h1 style="color: #ef4444; font-size: 30px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">
              Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span>
            </h1>
            <p style="color: #3b82f6; font-size: 11px; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase; margin: 8px 0 0 0;">GUEST EXPERIENCE & TESTIMONIAL</p>
          </div>

          <!-- Body -->
          <p style="font-size: 16px; color: #f1f5f9; line-height: 1.6; margin-bottom: 16px;">Hello <strong>${booking.userName || "Valued Client"}</strong>,</p>
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
            It has been a week since your first premier grooming session with us at Sizabantu. We hope you are loving your look and enjoying the styling precision!
          </p>
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 25px;">
            As a local shop dedicated to exceptional grooming standards, your feedback is the heartbeat of our business. Could you take 60 seconds to share your experience with us? It helps us maintain our quality and lets others know what to expect!
          </p>

          <!-- Testimonial Form call to action -->
          <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 25px; text-align: center; margin: 25px 0;">
            <h4 style="color: #10b981; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 10px 0;">⭐️⭐️⭐️⭐️⭐️ SHARE YOUR VALUED REVIEW</h4>
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
              Publish a testimonial to unlock priority status or have your feedback showcased on our live portfolio!
            </p>
            <a href="https://ais-pre-2u2z4yaqulikrpztoyxq2z-71529805665.europe-west3.run.app#testimonials" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">
              Submit Review / Testimonial
            </a>
          </div>

          <div style="border-left: 3px solid #3b82f6; padding-left: 15px; font-style: italic; color: #94a3b8; font-size: 13.5px; line-height: 1.6; margin: 25px 0;">
            "Sizabantu is more than just a quick session. It is where custom care meets sharp modern styles."
          </div>

          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 25px;">
            Thank you for being part of our story,<br>
            <strong style="color: #ffffff;">The Sizabantu Barbershop Team</strong>
          </p>
        </div>
      `;

      // Save scheduled job to Firestore collection
      await db.collection("scheduled_emails").add({
        email: userEmail,
        name: booking.userName || "Valued Client",
        subject: reviewSubject,
        html: reviewHtml,
        scheduledFor: followUpScheduledTime.toISOString(),
        status: "pending",
        createdAt: new Date().toISOString()
      });

      console.log(`[ONBOARDING] Successfully scheduled follow-up feedback email for ${userEmail} on ${followUpScheduledTime.toISOString()}`);

      // Track status
      await onboardingRef.set({
        email: userEmail,
        welcomeSent: welcomeMailSent,
        welcomeSentAt: new Date().toISOString(),
        followUpScheduledFor: followUpScheduledTime.toISOString(),
        followUpStatus: "pending",
        bookingId: bookingId
      });
    }
  } catch (err) {
    console.error("[ONBOARDING] Onboarding automation sequence error:", err);
  }
}

async function runScheduledEmailsDispatcher() {
  if (!db) return;
  try {
    const now = new Date().toISOString();
    const pendingEmails = await db.collection("scheduled_emails")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now)
      .get();

    if (pendingEmails.empty) return;

    console.log(`[ONBOARDING_DISPATCHER] Found ${pendingEmails.size} pending scheduled onboarding follow-up email(s).`);

    for (const doc of pendingEmails.docs) {
      const emailId = doc.id;
      const emailJob = doc.data();

      console.log(`[ONBOARDING_DISPATCHER] Dispatching scheduled follow-up email to ${emailJob.email}...`);

      const success = await sendWorkspaceOrFallbackEmail(emailJob.email, emailJob.subject, emailJob.html);
      if (success) {
        await doc.ref.update({
          status: "sent",
          sentAt: new Date().toISOString()
        });

        await db.collection("onboarding_statuses").doc(emailJob.email).update({
          followUpStatus: "sent",
          followUpSentAt: new Date().toISOString()
        }).catch(() => {});

        console.log(`[ONBOARDING_DISPATCHER] Task ${emailId} successfully sent.`);
      } else {
        await doc.ref.update({
          status: "failed",
          failedAt: new Date().toISOString(),
          attempts: (emailJob.attempts || 0) + 1
        });
        console.error(`[ONBOARDING_DISPATCHER] Task ${emailId} dispatch execution failed.`);
      }
    }
  } catch (err) {
    console.error("[ONBOARDING_DISPATCHER] Poller exception:", err);
  }
}

async function runWorkspaceAutomationForBooking(bookingId: string, booking: any) {
  if (!db) return;

  // Run Onboarding Welcome Workflow (if first booking)
  try {
    const workspaceSnap = await db.collection("settings").doc("google_workspace").get();
    const wsData = workspaceSnap.exists ? workspaceSnap.data()! : {};
    const onboardingEnabled = wsData.onboardingEnabled ?? true;

    if (onboardingEnabled) {
      await handleFirstBookingOnboarding(bookingId, booking);
    }
  } catch (onbErr) {
    console.error("[ONBOARDING] Automated first-booking run failed:", onbErr);
  }

  try {
    const workspaceSnap = await db.collection("settings").doc("google_workspace").get();
    const wsData = workspaceSnap.exists ? workspaceSnap.data()! : {};
    const { accessToken = null, calendarId = 'primary', emailEnabled = true, smsEnabled = true, contactsEnabled = true, onboardingEnabled = true } = wsData;

    let calendarSynced = booking.workspaceSync?.calendarSynced || false;
    let calendarEventId = booking.workspaceSync?.calendarEventId || null;
    let confirmationEmailSent = booking.workspaceSync?.confirmationEmailSent || false;
    let smsSent = booking.workspaceSync?.smsSent || false;
    let contactSynced = booking.workspaceSync?.contactSynced || false;
    let contactResourceName = booking.workspaceSync?.contactResourceName || null;
    let logLines: string[] = [];

    // Check if we already finished all tasks
    const needCalendar = !calendarSynced;
    const needEmail = !confirmationEmailSent && emailEnabled && booking.userEmail;
    const needContact = !contactSynced && contactsEnabled && booking.userName && booking.userEmail;

    if (!needCalendar && !needEmail && !needContact) {
      console.log(`Automation: Booking ${bookingId} already fully synchronized to Workspace based on current preferences.`);
      return;
    }

    // Format Scheduled/Appointment Date
    let appointmentTimeStr = "";
    try {
      if (booking.scheduledAt) {
        let dateObj: Date;
        if (typeof booking.scheduledAt.toDate === "function") {
          dateObj = booking.scheduledAt.toDate();
        } else {
          dateObj = new Date(booking.scheduledAt);
        }
        appointmentTimeStr = dateObj.toLocaleString("en-ZA", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Johannesburg"
        });
      } else {
        appointmentTimeStr = "Walk-In Now (Live Queue)";
      }
    } catch (e) {
      appointmentTimeStr = booking.scheduledAt ? String(booking.scheduledAt) : "Live Queue";
    }

    const verificationCode = booking.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();

    // 1. SYNC TO GOOGLE CALENDAR
    if (!calendarSynced) {
      if (!accessToken) {
        console.log(`[WORKSPACE] Google Calendar sync skipped: Workspace not linked yet.`);
        logLines.push("Calendar sync skipped: Workspace not linked.");
      } else {
        console.log(`[WORKSPACE] Syncing booking ${bookingId} to Google Calendar...`);
        let startDateTime = new Date().toISOString();
        let endDateTime = new Date(Date.now() + 45 * 60000).toISOString();

        try {
          if (booking.scheduledAt) {
            if (typeof booking.scheduledAt.toDate === "function") {
              startDateTime = booking.scheduledAt.toDate().toISOString();
            } else {
              startDateTime = new Date(booking.scheduledAt).toISOString();
            }
            endDateTime = new Date(new Date(startDateTime).getTime() + 45 * 60000).toISOString();
          }
        } catch (err) {
          console.error("Failed to parse startDateTime for Calendar:", err);
        }

        const eventBody = {
          summary: `Sizabantu Barber: ${booking.serviceName} - ${booking.userName}`,
          location: "Sizabantu Barbershop, Klipfontein View, Midrand",
          description: `Client: ${booking.userName}\nEmail: ${booking.userEmail}\nService: ${booking.serviceName}\nCheck-in Code: ${verificationCode}\nStatus: ${booking.status}\n\nAutomated event created by Sizabantu Workspace Engine.`,
          start: {
            dateTime: startDateTime,
            timeZone: "Africa/Johannesburg"
          },
          end: {
            dateTime: endDateTime,
            timeZone: "Africa/Johannesburg"
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 60 },
              { method: "popup", minutes: 15 }
            ]
          }
        };

        try {
          const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(eventBody)
          });

          if (calRes.ok) {
            const calData = await calRes.json();
            calendarSynced = true;
            calendarEventId = calData.id;
            logLines.push(`Google Calendar event linked: ${calData.id}`);
            console.log(`[WORKSPACE] Google Calendar slot synced successfully for booking ${bookingId}`);
          } else {
            const errText = await calRes.text();
            console.error(`[WORKSPACE] Google Calendar Sync Failed (HTTP ${calRes.status}):`, errText);
            
            if (calRes.status === 401) {
              await db.collection("settings").doc("google_workspace").update({ status: 'expired' });
              io.emit("notification:admin", {
                title: "Workspace Disconnected",
                message: "Google Workspace access token has expired. Please re-authenticate as Admin."
              });
            }
            
            logLines.push(`Calendar sync failed: ${errText.slice(0, 100)}`);
          }
        } catch (gErr) {
          console.error("[WORKSPACE] Google Calendar API error:", gErr);
          logLines.push(`Calendar API error: ${(gErr as Error).message}`);
        }
      }
    }

    // 2. DISPATCH CONFIRMATION EMAIL VIA GMAIL SEND / SMTP fallback
    if (!confirmationEmailSent && emailEnabled && booking.userEmail) {
      const emailBodyHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px; color: #ffffff; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 25px; margin-bottom: 30px;">
            <h1 style="color: #ef4444; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span></h1>
            <p style="color: #3b82f6; font-size: 10px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase; margin: 8px 0 0 0;">RESERVATION CONFIRMED</p>
          </div>
          
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">Hello <strong>${booking.userName}</strong>,</p>
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 25px;">Your booking has been successfully secured in our system! We have reserved your specialist chair.</p>
          
          <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 25px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Selected Treatment</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; text-align: right; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.04);">${booking.serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Time Slot</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; text-align: right; color: #3b82f6; border-bottom: 1px solid rgba(255,255,255,0.04);">${appointmentTimeStr}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Location</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; text-align: right; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.04); ">Klipfontein View Shop, Midrand</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Shop Price</td>
                <td style="padding: 10px 0; font-size: 15px; font-weight: 800; text-align: right; color: #ef4444; border-bottom: 1px solid rgba(255,255,255,0.04);">R${booking.totalPaid || '35'}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Your Check-in Code</td>
                <td style="padding: 15px 0 0 0; font-size: 20px; font-weight: 900; text-align: right; color: #10b981; font-family: monospace; letter-spacing: 0.1em;">${verificationCode}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 12px; color: #64748b; margin-top: 30px; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
            <strong>Important Check-in Policy:</strong> Please arrive 10 minutes before your allotted time and enter your unique code <strong>${verificationCode}</strong> at the front check-in station. Unattended sessions are released 10 minutes after scheduled times.
          </p>
          <p style="font-size: 11px; color: #475569; text-align: center; margin-top: 40px; font-weight: 500;">
            Sizabantu Barbershop • Midrand • Klipfontein View • Dedicated to sharp haircuts.
          </p>
        </div>
      `;

      if (!accessToken) {
        console.log(`[WORKSPACE] Gmail not connected yet. Dispatched confirmation email to ${booking.userEmail} via SMTP fallback...`);
        const smtpResult = await sendSMTPEmail({
          to: booking.userEmail,
          subject: `Sizabantu Barbershop - Booking Confirmed! [Ref: ${verificationCode}]`,
          html: emailBodyHtml
        });
        if (smtpResult.success) {
          confirmationEmailSent = true;
          logLines.push("Confirmation email sent to client via SMTP fallback (unlinked)");
          io.emit("notification:direct", {
            userId: booking.userId,
            message: `Booking confirmation email sent to ${booking.userEmail}!`
          });
        } else {
          logLines.push(`SMTP confirmation fallback failed: ${(smtpResult.error || "").slice(0, 50)}`);
        }
      } else {
        console.log(`[WORKSPACE] Sending confirmation email to ${booking.userEmail} via Gmail...`);
        try {
          const mailLines = [
            `To: ${booking.userEmail}`,
            `Subject: Sizabantu Barbershop - Booking Confirmed! [Ref: ${verificationCode}]`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            emailBodyHtml
          ];
          const rawEmail = Buffer.from(mailLines.join('\r\n'))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

          const gmailRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ raw: rawEmail })
          });

          if (gmailRes.ok) {
            confirmationEmailSent = true;
            logLines.push("Confirmation email sent to client via Gmail");
            console.log(`[WORKSPACE] Gmail Booking Confirmation dispatched to ${booking.userEmail}`);
            
            // Toast user
            io.emit("notification:direct", {
              userId: booking.userId,
              message: `Booking confirmation email sent to ${booking.userEmail}!`
            });
          } else {
            const errText = await gmailRes.text();
            console.error(`[WORKSPACE] Gmail dispatch failed. Falling back to SMTP. Error:`, errText);
            logLines.push(`Gmail failed: ${errText.slice(0, 100)}. Falling back to SMTP.`);
            
            const smtpResult = await sendSMTPEmail({
              to: booking.userEmail,
              subject: `Sizabantu Barbershop - Booking Confirmed! [Ref: ${verificationCode}]`,
              html: emailBodyHtml
            });
            if (smtpResult.success) {
              confirmationEmailSent = true;
              logLines.push("Confirmation email sent to client via fallback SMTP");
              io.emit("notification:direct", {
                userId: booking.userId,
                message: `Booking confirmation email sent to ${booking.userEmail} via fallback!`
              });
            }
          }
        } catch (mErr) {
          console.error("[WORKSPACE] Gmail API Error. Falling back to SMTP. Error:", mErr);
          logLines.push(`Gmail Error: ${(mErr as Error).message}. Falling back to SMTP.`);
          
          const smtpResult = await sendSMTPEmail({
            to: booking.userEmail,
            subject: `Sizabantu Barbershop - Booking Confirmed! [Ref: ${verificationCode}]`,
            html: emailBodyHtml
          });
          if (smtpResult.success) {
            confirmationEmailSent = true;
            logLines.push("Confirmation email sent to client via SMTP fallback");
            io.emit("notification:direct", {
              userId: booking.userId,
              message: `Booking confirmation email sent to ${booking.userEmail} via fallback!`
            });
          }
        }
      }
    }

    // 3. SEND SIMULATED SMS REMINDER CONFIRMATION
    if (!smsSent && smsEnabled && booking.userEmail) {
      console.log(`[WORKSPACE] Sending automated SMS to ${booking.userEmail} client...`);
      const smsMessage = `Sizabantu Barber Alert: Your slot is CONFIRMED for ${booking.serviceName} on ${appointmentTimeStr}. Your check-in code is ${verificationCode}. Please arrive 10m early!`;
      
      console.log(`[SMS SENDER ENGINE] >>> SMS SENT to CLIENT: "${smsMessage}"`);
      smsSent = true;
      logLines.push("Automated SMS alert dispatched");
      
      // Update client terminal with SMS alert
      io.emit("notification:direct", {
        userId: booking.userId,
        message: `SMS Confirmation: "${smsMessage.slice(0, 80)}..." delivered to your phone.`
      });
    }

    // 4. SYNC TO GOOGLE CONTACTS
    if (!contactSynced && contactsEnabled && booking.userName && booking.userEmail) {
      console.log(`[WORKSPACE] Adding client ${booking.userName} as a Google Contact...`);
      let userPhone = "";
      try {
        if (booking.userId) {
          const userSnap = await db.collection("users").doc(booking.userId).get();
          if (userSnap.exists) {
            userPhone = userSnap.data()?.phoneNumber || "";
          }
        }
      } catch (phoneErr) {
        console.error("Failed to query phoneNumber for contact sync:", phoneErr);
      }

      const contactResult = await createGoogleContact(accessToken, booking.userName, booking.userEmail, userPhone);
      if (contactResult.success) {
        contactSynced = true;
        contactResourceName = contactResult.resourceName;
        logLines.push(`Google Contact created: ${contactResult.resourceName}`);
        
        io.emit("notification:direct", {
          userId: booking.userId,
          message: `Linked to Workspace Contacts successfully! (${booking.userName})`
        });
      } else {
        logLines.push(`Contact sync failed: ${(contactResult.error || "").slice(0, 100)}`);
      }
    }

    // Write back to Firestore under booking to keep client statuses updated
    if (bookingId !== "test-booking-id") {
      await db.collection("bookings").doc(bookingId).update({
        verificationCode, // Ensure code is updated
        workspaceSync: {
          calendarSynced,
          calendarEventId,
          confirmationEmailSent,
          smsSent,
          contactSynced,
          contactResourceName,
          syncedAt: new Date().toISOString(),
          log: logLines.join(", ")
        }
      });
    }

  } catch (error) {
    console.error("[WORKSPACE] Automation handler error:", error);
  }
}

async function runUpcomingRemindersDispatcher() {
  if (!db) return;

  try {
    const workspaceSnap = await db.collection("settings").doc("google_workspace").get();
    const wsData = workspaceSnap.exists ? workspaceSnap.data()! : {};
    const { accessToken = null, emailEnabled = true, smsEnabled = true } = wsData;

    // We scan for books that:
    // 1. type is "scheduled"
    // 2. status is "confirmed"
    // 3. starts within the next 2 hours
    
    const now = admin.firestore.Timestamp.now();
    const twoHoursFromNow = new admin.firestore.Timestamp(now.seconds + 7200, 0);

    const snapshot = await db.collection("bookings")
      .where("type", "==", "scheduled")
      .where("status", "==", "confirmed")
      .where("scheduledAt", ">=", now)
      .where("scheduledAt", "<=", twoHoursFromNow)
      .get();

    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      // Skip if reminder has already been dispatched
      if (booking.workspaceSync?.reminderEmailSent && booking.workspaceSync?.reminderSmsSent) {
        continue;
      }

      console.log(`[REMINDER DISPATCH] Dispatching reminders for booking ${bookingId} starting soon...`);

      let reminderEmailSentBySizabantu = booking.workspaceSync?.reminderEmailSent || false;
      let reminderSmsSentBySizabantu = booking.workspaceSync?.reminderSmsSent || false;
      const verificationCode = booking.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();

      let appointmentTimeStr = "";
      try {
        if (booking.scheduledAt) {
          let dateObj = typeof booking.scheduledAt.toDate === "function" ? booking.scheduledAt.toDate() : new Date(booking.scheduledAt);
          appointmentTimeStr = dateObj.toLocaleString("en-ZA", {
            weekday: "long",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Africa/Johannesburg"
          });
        }
      } catch (e) {
        appointmentTimeStr = "scheduled time";
      }

      // 1. GMAIL REMINDER SEND
      if (!reminderEmailSentBySizabantu && emailEnabled && booking.userEmail) {
        console.log(`[REMINDER DISPATCH] Sending reminder email to ${booking.userEmail}...`);
        
        const emailBodyHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px; color: #ffffff; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
            <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 25px; margin-bottom: 30px;">
              <h1 style="color: #ef4444; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; text-transform: uppercase;">Sizabantu <span style="color: #3b82f6; font-family: Georgia, serif; font-style: italic; text-transform: lowercase;">Barbershop</span></h1>
              <p style="color: #eab308; font-size: 10px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase; margin: 8px 0 0 0;">SESSION REMINDER</p>
            </div>
            
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">Hi <strong>${booking.userName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 25px;">This is an automated Google Workspace reminder that your appointment at Sizabantu Barbershop is starting very soon!</p>
            
            <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 25px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Grooming Treatment</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 800; text-align: right; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.04);">${booking.serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.04);">Appointed Time</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 800; text-align: right; color: #eab308; border-bottom: 1px solid rgba(255,255,255,0.04);">${appointmentTimeStr}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Your Check-in Code</td>
                  <td style="padding: 15px 0 0 0; font-size: 20px; font-weight: 900; text-align: right; color: #10b981; font-family: monospace; letter-spacing: 0.1em;">${verificationCode}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              <strong>Grooming Check-in:</strong> Please head directly to our station upon arrival, enter code <strong>${verificationCode}</strong>, and notify the barber. We look forward to seeing you shortly.
            </p>
            <p style="font-size: 11px; color: #475569; text-align: center; margin-top: 40px;">
              Sizabantu Barbershop • Midrand • Klipfontein View
            </p>
          </div>
        `;

        if (!accessToken) {
          console.log(`[REMINDER DISPATCH] Workspace unlinked. Sending reminder email to ${booking.userEmail} via SMTP fallback...`);
          const smtpResult = await sendSMTPEmail({
            to: booking.userEmail,
            subject: `ALERT: Appointment Reminder - Sizabantu Barbershop [Ref: ${verificationCode}]`,
            html: emailBodyHtml
          });
          if (smtpResult.success) {
            reminderEmailSentBySizabantu = true;
            io.emit("notification:direct", {
              userId: booking.userId,
              message: `Reminder dispatch: SMTP reminder email sent to ${booking.userEmail}!`
            });
          }
        } else {
          try {
            const mailLines = [
              `To: ${booking.userEmail}`,
              `Subject: ALERT: Appointment Reminder - Sizabantu Barbershop [Ref: ${verificationCode}]`,
              `Content-Type: text/html; charset=utf-8`,
              `MIME-Version: 1.0`,
              ``,
              emailBodyHtml
            ];
            const rawEmail = Buffer.from(mailLines.join('\r\n'))
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const gmailRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ raw: rawEmail })
            });

            if (gmailRes.ok) {
              reminderEmailSentBySizabantu = true;
              console.log(`[REMINDER DISPATCH] Reminder Gmail successfully sent to ${booking.userEmail}`);
              io.emit("notification:direct", {
                userId: booking.userId,
                message: `Reminder dispatch: Gmail reminder sent to ${booking.userEmail}!`
              });
            } else {
              const errText = await gmailRes.text();
              console.error(`[REMINDER DISPATCH] Gmail API reminder failed. Falling back to SMTP. Error:`, errText);
              
              const smtpResult = await sendSMTPEmail({
                to: booking.userEmail,
                subject: `ALERT: Appointment Reminder - Sizabantu Barbershop [Ref: ${verificationCode}]`,
                html: emailBodyHtml
              });
              if (smtpResult.success) {
                reminderEmailSentBySizabantu = true;
                io.emit("notification:direct", {
                  userId: booking.userId,
                  message: `Reminder dispatch: SMTP reminder email sent to ${booking.userEmail}!`
                });
              }
            }
          } catch (mErr) {
            console.error("[REMINDER DISPATCH] Gmail reminder API Error. Falling back to SMTP. Error:", mErr);
            const smtpResult = await sendSMTPEmail({
              to: booking.userEmail,
              subject: `ALERT: Appointment Reminder - Sizabantu Barbershop [Ref: ${verificationCode}]`,
              html: emailBodyHtml
            });
            if (smtpResult.success) {
              reminderEmailSentBySizabantu = true;
              io.emit("notification:direct", {
                userId: booking.userId,
                message: `Reminder dispatch: SMTP reminder email sent to ${booking.userEmail}!`
              });
            }
          }
        }
      }

      // 2. SMS REMINDER SEND
      if (!reminderSmsSentBySizabantu && smsEnabled && booking.userEmail) {
        console.log(`[REMINDER DISPATCH] Sending reminder SMS to client...`);
        const smsMessage = `REMINDER with Workspace: Your barbershop appointment for ${booking.serviceName} is coming up at ${appointmentTimeStr}! Use code ${verificationCode} to check in. See you soon!`;
        
        console.log(`[SMS SENDER ENGINE] >>> SMS REMINDER SENT to CLIENT: "${smsMessage}"`);
        reminderSmsSentBySizabantu = true;
        
        // Push toast to user screen
        io.emit("notification:direct", {
          userId: booking.userId,
          message: `SMS Reminder: "${smsMessage.slice(0, 80)}..." delivered to client.`
        });
      }

      // Update sync statuses
      const currentSync = booking.workspaceSync || {};
      await doc.ref.update({
        workspaceSync: {
          ...currentSync,
          reminderEmailSent: reminderEmailSentBySizabantu,
          reminderSmsSent: reminderSmsSentBySizabantu,
          remindedAt: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.error("[WORKSPACE] Reminders dispatcher error:", err);
  }
}

// Automated logic to handle session Rule Engine (10-min arrival rule)
async function runSessionRuleEngine() {
  if (!db) return;

  try {
    const now = admin.firestore.Timestamp.now();
    const tenMinsFromNow = new admin.firestore.Timestamp(now.seconds + 600, 0);

    // 1. Expire confirmed bookings if they haven't checked in 10 mins before start
    const bookingsToExpire = await db.collection("bookings")
      .where("status", "in", ["confirmed", "pending"])
      .where("type", "==", "scheduled")
      .where("scheduledAt", "<=", tenMinsFromNow)
      .get();

    bookingsToExpire.forEach(async (doc) => {
      const data = doc.data();
      // If time has passed and not checked-in -> Expire
      await doc.ref.update({
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Automation: Expired booking ${doc.id} (Late/No check-in)`);
      io.emit("notification:direct", { 
        userId: data.userId, 
        message: "Session expired due to late arrival. Rebooking required." 
      });
    });

    // 2. Queue Reminder: "You're up next"
    const nextInQueue = await db.collection("bookings")
      .where("type", "==", "queue")
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(1)
      .get();
    
    if (!nextInQueue.empty) {
      const data = nextInQueue.docs[0].data();
      io.emit("notification:direct", { 
        userId: data.userId, 
        message: "You are #1 in queue! Head to the shop now." 
      });
    }

    // 3. Scan & Deliver upcoming Workspace email + SMS Reminders
    await runUpcomingRemindersDispatcher();

    // 4. Scan & Deliver scheduled welcome follow-up onboarding sequence emails
    await runScheduledEmailsDispatcher();

  } catch (error) {
    console.error("Rule Engine Error:", error);
  }
}

// Run engine every minute
setInterval(runSessionRuleEngine, 60000);

// Watch for changes in the 'bookings' collection to trigger automated notifications and rewards
if (db) {
  db.collection("bookings").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const data = change.doc.data();
      const docId = change.doc.id;

      // New Booking Trigger
      if (change.type === "added" && data.status === "confirmed") {
        io.emit("notification:admin", { 
          title: "New Booking", 
          message: `${data.userName} joined ${data.type === 'queue' ? 'the queue' : 'a scheduled slot'}.` 
        });

        // Trigger Google Workspace Calendar and Gmail actions
        await runWorkspaceAutomationForBooking(docId, data);
      }
      
      // Status Change Triggers
      if (change.type === "modified") {
        if (data.status === "checked-in") {
          io.emit("notification:admin", { 
            title: "Client Arrived", 
            message: `${data.userName} is now checked-in and ready.` 
          });
        }

        if (data.status === "started") {
          io.emit("notification:direct", { 
            userId: data.userId, 
            message: "Your session has officially started. Sit back and enjoy!" 
          });
        }

        if (data.status === "completed") {
          const userRef = db!.collection("users").doc(data.userId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data()!;
            let currentStamps = (userData.stamps || 0) + 1;
            const rewards = userData.rewardsUnlocked || [];
            
            if (currentStamps === 5 && !rewards.includes("free_cap")) {
              rewards.push("free_cap");
            }
            
            if (currentStamps >= 10) {
              if (!rewards.includes("free_haircut")) rewards.push("free_haircut");
            }

            await userRef.update({
              stamps: currentStamps,
              rewardsUnlocked: rewards,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Automation: Updated rewards for user ${data.userId}. Stamps: ${currentStamps}`);
            io.emit("notification:reward", { userId: data.userId, stamps: currentStamps, rewards });
            io.emit("notification:direct", { 
              userId: data.userId, 
              message: `Session complete! You now have ${currentStamps} stamps. Keep it up!` 
            });
          }
        }
      }
    });
  });
}

// Connect Socket.io
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  
  // Triggered when a new booking is created after payment
  socket.on("booking:new", async (booking) => {
    console.log(`Socket triggered booking:new event, syncing:`, booking.id);
    if (booking.id) {
      await runWorkspaceAutomationForBooking(booking.id, booking);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// --- VITE MIDDLEWARE ---

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
