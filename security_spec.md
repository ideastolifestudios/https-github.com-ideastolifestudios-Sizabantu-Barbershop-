# Security Specification - Sizabantu Barbershop

## Data Invariants
1. A booking must have a valid `userId` that exists in the `users` collection.
2. A client can only read and manage their own bookings.
3. Barbers/Admins can read all bookings and update statuses.
4. Loyalty stamps can only be updated by the system/admin, never by the client directly.
5. Verification codes are required for check-in.
6. Bookings have a strict transition: pending -> confirmed -> checked-in -> in-progress -> completed.

## The Dirty Dozen (Threat Matrix)
1. **The Identity Thief**: User A tries to read User B's booking by ID.
2. **The Stamp Forger**: Client tries to increment their own `stamps` field in their profile.
3. **The Ghost Booking**: Client tries to create a booking for a non-existent service or another user.
4. **The Time Traveler**: Client tries to update `updatedAt` with a future timestamp (not server time).
5. **The Role Escalator**: Client tries to set their `role` to 'admin' during profile creation.
6. **The Status Hijacker**: Client tries to set their booking status directly to 'completed' without a barber.
7. **The Position Spoofer**: Client tries to inject themselves at queue position #1.
8. **The PII Scraper**: Authenticated user tries to list all user profiles to get emails.
9. **The Verification Matcher**: Client tries to guess a verification code of another user.
10. **The ID Poisoner**: Client sends a 1MB string as a `bookingId`.
11. **The Double Booking**: Client tries to have 5 active bookings at once (spam).
12. **The Admin Impersonator**: User tries to access `/barbers` or `/admin` configs without auth.

## Test Runner (Logic Verification)
A `firestore.rules.test.ts` would verify that:
- `users/{uid}`: Only {uid} can read/write their own profile (except stamps and role).
- `bookings/{id}`: Only the `userId` in the document can read it.
- `bookings/{id}`: Only admins can mark as `completed`.
- List queries to `bookings` fail without a `where('userId', '==', auth.uid)` filter for non-admins.
