import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
// @ts-ignore
import * as Sentry from "@sentry/node";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { createServer } from "http";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "./lib/logger";

import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/bookings";
import workspaceRoutes from "./routes/workspace";
import paymentRoutes from "./routes/payments";
import { runSessionRuleEngine } from "./services/scheduler";

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: admin.firestore.Firestore | null = null;
try {
  const projectId = process.env.PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const appInstance = !admin.apps.length
    ? admin.initializeApp({ projectId: projectId })
    : admin.app();
  db = getFirestore(appInstance);
  logger.info(`Firebase Admin initialized: ${projectId}`);
} catch (error) {
  logger.error({ msg: "Firebase Admin initialization failed", err: error });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [/\.vercel\.app$/, /sizabantubarbershop\.co\.za$/]
    : '*',
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes(io));
app.use("/api/workspace", workspaceRoutes(io));
app.use("/api/payments", paymentRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setInterval(() => {
  const now = new Date();
  const hour = now.getUTCHours() + 2;
  if (hour >= 6 && hour < 22) {
    runSessionRuleEngine(io);
  }
}, 60000);

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
