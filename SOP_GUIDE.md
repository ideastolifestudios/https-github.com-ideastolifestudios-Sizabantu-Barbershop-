# Sizabantu Barbershop - Production SOP Guide

This guide provides a comprehensive overview of the Sizabantu Barbershop platform, its architecture, and standard operating procedures for administration and maintenance.

## 1. System Architecture

The application is built using a modern, scalable stack:
- **Frontend**: React 19 (TypeScript) + Tailwind CSS + Framer Motion.
- **Backend**: Express (Node.js) + Socket.io for real-time updates.
- **Database & Auth**: Firebase (Firestore, Auth).
- **Integrations**: VodaPay (Payments), Meta WhatsApp Cloud API (Notifications), Google Workspace (Calendar/Contacts).

### Directory Structure
- `src/components/`: Modular UI components (Booking, Admin, Landing).
- `src/hooks/`: Custom React hooks for business logic and state.
- `src/store/`: Zustand stores for global state management.
- `server/routes/`: Discrete API endpoints for Auth, Bookings, Payments, and Workspace.
- `server/services/`: Core backend logic (WhatsApp, Scheduler, Encryption).

## 2. Admin Workflows

### Business Management
Admins can manage the shop's offerings via the **Business** tab in the Admin Dashboard:
- **Service Menu**: Add, edit, or delete services, pricing, and estimated durations.
- **Operating Hours**: Toggle "Open/Closed" status and adjust daily time slots. Changes propagate in real-time to the client landing page.

### Queue & Session Management
- **Live Queue**: Real-time monitoring of clients checked in at the shop.
- **Scheduled**: View and manage future appointments synced with Google Calendar.
- **Check-In Desk**: Manual lookup of users by ID and management of loyalty stamps (10 stamps = Free Haircut).

## 3. Integration Lifecycles

### Payment Lifecycle (VodaPay)
1. User initiates a booking in `BookingSystem.tsx`.
2. Backend `/api/payments/vodapay/initiate` logs the transaction and generates a VodaPay checkout URL.
3. Upon successful payment, VodaPay hits the `/api/payments/vodapay/callback` webhook.
4. The webhook verifies the signature, updates the booking to `confirmed`, and marks it as `paid`.

### WhatsApp Notifications
The platform automatically sends notifications via Meta Cloud API:
- **Booking Created**: Sent immediately upon session request.
- **Reminders**: Automated T-24h and T-2h reminders (handled by `server/services/scheduler.ts`).

### Google Workspace Sync
If linked in the Admin settings:
- New bookings are automatically added as events to the configured Google Calendar.
- Clients are added to the Google Contacts directory for future CRM capabilities.

## 4. Maintenance & Security

### Key Maintenance Tasks
- **Credential Rotation**: Ensure `FIREBASE_API_KEY`, `WHATSAPP_TOKEN`, and `VODAPAY_WEBHOOK_SECRET` are rotated periodically in the production environment variables.
- **Log Monitoring**: Backend logs are structured JSON via Pino. Monitor for `ERROR` level logs in your hosting provider's dashboard (e.g., Vercel/Render).

### Security Measures
- **RBAC**: Admin endpoints are protected by `requireAdmin` middleware.
- **Validation**: All API inputs are strictly validated using Zod schemas.
- **Encryption**: Sensitive tokens (OAuth) are stored encrypted (AES-256) in Firestore.
