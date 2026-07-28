import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSizweResponse } from '../../src/lib/ai/aiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS for Vercel edge
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { message, contextData = {} } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Please provide a valid message' });
    }

    // Call our live Gemini 2.5 Flash service
    const reply = await getSizweResponse(message, contextData);

    // Returning both 'reply' and 'response' to safely match whatever the frontend expects
    return res.status(200).json({ success: true, reply, response: reply });
  } catch (error: any) {
    console.error("❌ Vercel AI Endpoint Error:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'AI engine temporarily unavailable. Please try again.' 
    });
  }
}
