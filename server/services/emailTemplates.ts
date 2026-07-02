export const getBookingConfirmationTemplate = (customerName: string, date: string, time: string, serviceName: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #1a1a1a; margin: 0;">Sizabantu Barbershop</h1>
        <p style="color: #666; font-size: 16px;">Your appointment is locked in!</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
      <p>Sharp choice, <strong>${customerName}</strong>,</p>
      <p>We've successfully confirmed your booking. Here are your details:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p>Need to reschedule or cancel? You can manage your appointment directly through our online portal.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
        © 2026 Sizabantu Barbershop. All rights reserved.
      </p>
    </div>
  `;
};
