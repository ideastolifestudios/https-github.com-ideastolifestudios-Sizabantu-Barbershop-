import { GoogleGenAI } from "@google/genai";

export async function generateBarberBrief(clientContext: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return "⚠️ [Barber AI] Missing API Key. Unable to generate brief.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
You are the internal AI assistant for barbers at Sizabantu Barbershop.
Your job is to read a returning client's history and provide a quick "Prep Brief" for the barber right before the client sits in the chair.

Format the response into exactly two short sections:
1. 📋 Client Vibe & History: (2 bullet points summarizing their preferences/patterns)
2. 💡 Upsell Suggestion: (1 specific, natural service to suggest based on their history, with a 1-sentence script on how to ask)

CLIENT DATA:
${JSON.stringify(clientContext, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || "Brief unavailable.";
  } catch (error: any) {
    console.error("❌ [Barber AI Error]:", error.message);
    return "⚠️ AI engine unavailable for prep brief.";
  }
}
