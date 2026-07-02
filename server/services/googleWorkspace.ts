// server/services/googleWorkspace.ts
import { google } from 'googleapis';

// Initialize the OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Standard redirect for getting refresh tokens
);

// Set the refresh token (This keeps you logged in forever)
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const people = google.people({ version: 'v1', auth: oauth2Client });

export async function runWorkspaceAutomationForBooking(docId: string, bookingData: any) {
  try {
    console.log(`[Workspace] Starting sync for booking ${docId}...`);

    // 1. Create Google Contact (If email/phone exists)
    if (bookingData.customerEmail || bookingData.phone) {
      await createOrUpdateContact(bookingData);
    }

    // 2. Add to Google Calendar
    if (bookingData.type === 'scheduled') {
      await addToCalendar(bookingData);
    }

    console.log(`[Workspace] Sync complete for ${docId}`);
  } catch (error) {
    console.error("[Workspace Error] Failed to sync:", error);
  }
}

async function createOrUpdateContact(data: any) {
  try {
    await people.people.createContact({
      requestBody: {
        names: [{ givenName: data.userName || "Walk-in", familyName: "Client" }],
        emailAddresses: data.customerEmail ? [{ value: data.customerEmail }] : [],
        phoneNumbers: data.phone ? [{ value: data.phone }] : [],
        organizations: [{ name: "Sizabantu Barbershop Client" }]
      }
    });
    console.log(`[Contacts] Added ${data.userName} to Google Contacts.`);
  } catch (err: any) {
    console.log(`[Contacts] Note: Could not create contact (might already exist).`);
  }
}

async function addToCalendar(data: any) {
  // Convert your booking date/time to ISO string for Google
  const startDateTime = new Date(`${data.date}T${data.time}:00+02:00`); // +02:00 for SAST
  const endDateTime = new Date(startDateTime.getTime() + 45 * 60000); // Assuming 45 min slot

  const event = {
    summary: `${data.service || 'Haircut'} - ${data.userName}`,
    location: 'Sizabantu Barbershop',
    description: `Booking ID: ${data.id}\nPhone: ${data.phone || 'N/A'}\nEmail: ${data.customerEmail || 'N/A'}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Africa/Johannesburg' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'Africa/Johannesburg' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  console.log(`[Calendar] Event added for ${data.userName} on ${data.date}`);
}