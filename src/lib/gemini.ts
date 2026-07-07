import { GoogleGenAI } from '@google/genai';

// Safely import Firebase without crashing Node terminal tests
let db: any = null;
try {
  const fb = require('../firebase-config');
  db = fb.db || null;
} catch (e) {
  // Ignore import errors when running standalone script tests
}

// Initialize the SDK using the environment variable
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// 🛡️ MASTER SYSTEM PROMPT: The core identity & rules for Sizabantu Barbershop
export const SIZABANTU_SYSTEM_PROMPT = `
You are 'Sizwe', the friendly, professional AI Assistant and Shop Manager for Sizabantu Barbershop.
Location: Lethabong / Midrand area, Gauteng, South Africa.
Tone: Warm, welcoming, respectful, and energetic. Use occasional friendly South African touches (like "Sharp sharp", "Howzit", "Eish", or "We've got you sorted"), but keep it polished and professional.

CRITICAL RULES:
1. Never invent or guess pricing not explicitly provided to you. If unsure about a custom price, advise the client to speak with a barber in the shop.
2. Appointments are managed via automated check-in codes. Remind clients to keep their verification code handy when arriving.
3. Keep answers concise, clear, and structured for easy reading on mobile phones.
4. Never promise a booking slot is confirmed until the system confirms it.
`;

export interface AIResponseResult {
  success: boolean;
  text?: string;
  error?: string;
  tokensUsed?: number;
}

/**
 * Core wrapper to generate AI responses with automatic Firestore logging and error handling.
 */
export async function generateShopAIResponse(
  userMessage: string,
  contextData?: string,
  userId: string = 'anonymous'
): Promise<AIResponseResult> {
  if (!ai) {
    console.error('[AI ENGINE] Error: GEMINI_API_KEY is not set in environment variables.');
    return { success: false, error: 'AI service is temporarily unavailable (Missing Key).' };
  }

  try {
    // Combine the master prompt, any extra context (like live calendar slots), and the user's message
    const fullPrompt = `${SIZABANTU_SYSTEM_PROMPT}\n\nADDITIONAL CONTEXT:\n${contextData || 'None'}\n\nUSER MESSAGE:\n${userMessage}`;

    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const responseText = response.text || "I'm sorry, I couldn't generate a response at the moment. Please try again!";
    const durationMs = Date.now() - startTime;
    
    // Estimate token usage (or use metadata if available in response)
    const estimatedTokens = response.usageMetadata?.totalTokenCount || Math.round((fullPrompt.length + responseText.length) / 4);

    // 📊 Log usage to Firestore asynchronously (won't block the user response)
    try {
      if (db) {
        await db.collection('ai_logs').add({
          timestamp: new Date().toISOString(),
          userId,
          userMessage,
          responseText,
          tokensUsed: estimatedTokens,
          durationMs,
          model: 'gemini-2.5-flash',
          status: 'success'
        });
        console.log(`[AI ENGINE] Response generated & logged successfully (${estimatedTokens} tokens, ${durationMs}ms)`);
      }
    } catch (logErr) {
      // Silently continue if Firestore logging fails in test environments
    }

    return {
      success: true,
      text: responseText,
      tokensUsed: estimatedTokens
    };

  } catch (error: any) {
    console.error('[AI ENGINE] Gemini API Exception:', error);

    try {
      if (db) {
        await db.collection('ai_logs').add({
          timestamp: new Date().toISOString(),
          userId,
          userMessage,
          error: error.message || 'Unknown API Error',
          status: 'error'
        });
      }
    } catch (e) {
      // Ignore fallback logging errors
    }

    return {
      success: false,
      error: 'I am currently experiencing high demand. Please give me a moment and try again!'
    };
  }
}
