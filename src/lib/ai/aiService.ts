import { GoogleGenerativeAI } from "@google/generative-ai";
import { SIZWE_SYSTEM_PROMPT } from "./systemPrompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function getSizweResponse(userMessage: string, contextData: any) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const fullPrompt = `
    ${SIZWE_SYSTEM_PROMPT}
    
    CURRENT SHOP CONTEXT:
    ${JSON.stringify(contextData)}
    
    USER MESSAGE:
    "${userMessage}"
  `;

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}
