import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.GOOGLE_EMAIL,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

// Optional: Run this to verify credentials when the server starts
export const verifyMailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Nodemailer Transporter is ready to send emails!");
    return true;
  } catch (error) {
    console.error("❌ Nodemailer Transporter Error:", error);
    return false;
  }
};
