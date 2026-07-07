import { google } from 'googleapis';

// 1. Initialize the OAuth2 client using your existing Nodemailer credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// 2. Set the refresh token so it stays logged in forever
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// 3. Initialize the Calendar API
export const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// 4. The main function to push a booking to your calendar
export const syncBookingToWorkspace = async (bookingDetails: {
  customerName: string;
  service: string;
  startTime: string; // ISO string e.g., "2026-07-02T10:00:00Z"
  endTime: string;   // ISO string e.g., "2026-07-02T11:00:00Z"
  email: string;
  phone: string;
}) => {
  try {
    const event = {
      summary: `${bookingDetails.customerName} - ${bookingDetails.service}`,
      description: `Phone: ${bookingDetails.phone}\nEmail: ${bookingDetails.email}\nService: ${bookingDetails.service}`,
      start: {
        dateTime: bookingDetails.startTime,
        timeZone: 'Africa/Johannesburg',
      },
      end: {
        dateTime: bookingDetails.endTime,
        timeZone: 'Africa/Johannesburg',
      },
      // Optional: Send a Google Calendar invite directly to the customer
      attendees: (bookingDetails.email ? [{ email: bookingDetails.email }] : []),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: event,
      sendUpdates: 'all', // This triggers the invite email
    });

    console.log('✅ Workspace Calendar sync successful:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('❌ Workspace Calendar sync failed:', error);
    throw error;
  }
};
