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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  const projectId = process.env.PROJECT_ID || firebaseConfig.projectId;
  const appInstance = !admin.apps.length 
    ? admin.initializeApp({ projectId: projectId })
    : admin.app();

  // Reference for multi-database: getFirestore(app, databaseId)
  db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
  console.log(`Firebase Admin initialized for project: ${projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);

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
      projectId: firebaseConfig.projectId,
      dbId: firebaseConfig.firestoreDatabaseId
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
  // In production: sendMail({ to: email, subject: "Your Access Code", text: `Your code is ${code}` });
  
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
        email_verified: true
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
  io.emit("notification:direct", { userId, message });
  res.json({ success: true });
});

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

// --- GOOGLE WORKSPACE AUTOMATION SKELETON ---

async function syncToGoogleCalendar(booking: any) {
  console.log(`Automation: Syncing booking ${booking.id} to Google Calendar...`);
  // In production, you would use:
  // const calendar = google.calendar({ version: 'v3', auth });
  // await calendar.events.insert({ ... });
  
  // Simulation log for the user
  const eventDetails = {
    summary: `Barber Session: ${booking.serviceName} (${booking.userName})`,
    location: `Sizabantu Barbershop, Klipfontein View`,
    description: `Code: ${booking.verificationCode}\nEmail: ${booking.userEmail}`,
    start: { dateTime: booking.scheduledAt },
    end: { dateTime: new Date(new Date(booking.scheduledAt).getTime() + 45 * 60000).toISOString() }
  };
  
  console.log("Calendar Event Generated:", eventDetails);
}

// Connect Socket.io
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  
  // Triggered when a new booking is created after payment
  socket.on("booking:new", async (booking) => {
    await syncToGoogleCalendar(booking);
    
    // Trigger SMS Reminder Skeleton
    console.log(`Automation: Triggering SMS reminder to ${booking.userEmail} via Twilio`);
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
