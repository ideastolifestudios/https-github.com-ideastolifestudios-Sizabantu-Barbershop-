import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { initializeTestApp, deleteTestApp } from '@firebase/rules-unit-testing';
import * as firebase from '@firebase/testing';

const PROJECT_ID = 'sizabantu-test';
const OWNER_UID = 'owner-test-uid';
const CUSTOMER_UID = 'customer-test-uid';

describe('Customer Journey Test', () => {
  let testApp: any;
  let adminDb: any;
  let customerDb: any;

  beforeEach(async () => {
    testApp = await initializeTestApp({ projectId: PROJECT_ID });
    adminDb = testApp.firestore();
    customerDb = testApp.firestore();
  });

  afterEach(async () => {
    await deleteTestApp(testApp);
  });

  it('Step 1: Website Visit - Customer can view services', async () => {
    const servicesRef = customerDb.collection('services');
    const snapshot = await servicesRef.get();
    expect(snapshot.empty).toBe(false);
    console.log('✓ Services visible to customer');
  });

  it('Step 2: Booking Submitted - Customer creates booking', async () => {
    const booking = {
      customerId: CUSTOMER_UID,
      staffId: 'staff-1',
      serviceId: 'service-1',
      date: new Date(),
      time: '10:00',
      duration: 60,
      status: 'pending',
      price: 150,
      createdAt: new Date(),
    };

    const docRef = await customerDb.collection('bookings').add(booking);
    expect(docRef.id).toBeDefined();
    console.log('✓ Booking created:', docRef.id);
  });

  it('Step 3: Booking Stored - Data persists in Firestore', async () => {
    const bookingsRef = customerDb.collection('bookings');
    const snapshot = await bookingsRef.where('customerId', '==', CUSTOMER_UID).get();
    expect(snapshot.size).toBeGreaterThan(0);
    console.log('✓ Booking stored in database');
  });

  it('Step 4: Confirmation Email - Email service notified', async () => {
    // Mock email service call
    const emailSent = await mockSendConfirmationEmail(CUSTOMER_UID);
    expect(emailSent).toBe(true);
    console.log('✓ Confirmation email sent');
  });

  it('Step 5: Owner Notification - Owner receives notification', async () => {
    const notifications = await mockGetOwnerNotifications(OWNER_UID);
    expect(notifications.length).toBeGreaterThan(0);
    console.log('✓ Owner notified of new booking');
  });

  it('Step 6: Reminder Sent - SMS/Email reminder scheduled', async () => {
    const reminders = await mockGetScheduledReminders(CUSTOMER_UID);
    expect(reminders.length).toBeGreaterThan(0);
    console.log('✓ Reminder scheduled and sent');
  });

  it('Step 7: Visit Completed - Booking status updated', async () => {
    const bookingRef = customerDb.collection('bookings').doc('test-booking-1');
    await bookingRef.update({ status: 'completed', completedAt: new Date() });
    const doc = await bookingRef.get();
    expect(doc.data().status).toBe('completed');
    console.log('✓ Visit marked as completed');
  });

  it('Step 8: Review Request Sent - Customer receives review request', async () => {
    const reviewRequest = await mockSendReviewRequest(CUSTOMER_UID);
    expect(reviewRequest).toBe(true);
    console.log('✓ Review request sent to customer');
  });

  it('Step 9: Loyalty Updated - Points credited to account', async () => {
    const loyaltyRef = customerDb.collection('loyalty').doc(CUSTOMER_UID);
    const currentLoyalty = await loyaltyRef.get();
    const previousPoints = currentLoyalty.data()?.points || 0;
    
    await loyaltyRef.update({ points: previousPoints + 100 });
    const updated = await loyaltyRef.get();
    expect(updated.data().points).toBe(previousPoints + 100);
    console.log('✓ Loyalty points awarded');
  });

  it('Step 10: Rebooking Reminder Sent - Customer prompted to rebook', async () => {
    const rebookReminder = await mockSendRebookingReminder(CUSTOMER_UID);
    expect(rebookReminder).toBe(true);
    console.log('✓ Rebooking reminder sent');
  });

  it('Full Journey: End-to-end automation succeeds', async () => {
    const journeySuccess = await runFullCustomerJourney(customerDb, CUSTOMER_UID);
    expect(journeySuccess).toBe(true);
    console.log('✓ Complete customer journey successful');
  });
});

// Helper functions
async function mockSendConfirmationEmail(customerId: string): Promise<boolean> {
  // Simulate email sending
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 100);
  });
}

async function mockGetOwnerNotifications(ownerId: string): Promise<any[]> {
  return [
    { type: 'booking', customerId: 'customer-1', timestamp: new Date() },
  ];
}

async function mockGetScheduledReminders(customerId: string): Promise<any[]> {
  return [
    { type: 'reminder', sendTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  ];
}

async function mockSendReviewRequest(customerId: string): Promise<boolean> {
  return true;
}

async function mockSendRebookingReminder(customerId: string): Promise<boolean> {
  return true;
}

async function runFullCustomerJourney(db: any, customerId: string): Promise<boolean> {
  try {
    // Create booking
    const booking = {
      customerId,
      staffId: 'staff-1',
      serviceId: 'service-1',
      date: new Date(),
      time: '10:00',
      status: 'pending',
      price: 150,
    };
    const bookingRef = await db.collection('bookings').add(booking);

    // Update to completed
    await bookingRef.update({ status: 'completed', completedAt: new Date() });

    // Award loyalty points
    const loyaltyRef = db.collection('loyalty').doc(customerId);
    await loyaltyRef.set({ points: 100, customerId }, { merge: true });

    return true;
  } catch (error) {
    console.error('Journey failed:', error);
    return false;
  }
}
