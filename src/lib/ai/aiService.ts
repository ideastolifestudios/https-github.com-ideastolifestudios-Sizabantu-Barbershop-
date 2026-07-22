import { GoogleGenAI } from "@google/genai";
import { SIZWE_SYSTEM_PROMPT } from "./systemPrompt";

export async function getSizweResponse(userMessage: string, contextData: any = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ [AI SERVICE] GEMINI_API_KEY missing. Returning fallback response.");
    return "Eish, my connection to the AI engine is briefly offline, but our team is here to help! Feel free to check our services or book directly on the schedule.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const fullPrompt = `
${SIZWE_SYSTEM_PROMPT}

CURRENT SHOP CONTEXT:
${JSON.stringify(contextData, null, 2)}

USER MESSAGE:
"${userMessage}"
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    return response.text?.trim() || "Sharp! How else can I assist you today at Sizabantu Barbershop?";
  } catch (error: any) {
    console.error("❌ [AI SERVICE ERROR]:", error.message);
    return "Eish, something went wrong on our end. Please feel free to select your cut directly from our booking page!";
  }
}
