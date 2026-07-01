import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create the transporter using standard SMTP (e.g., Gmail, SendGrid, Hostinger)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Sizabantu Barbershop" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[Email Service] Success: Message sent to ${to} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
};
