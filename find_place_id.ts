import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function findPlaceId() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Find the Google Place ID for 'Sizabantu Barbershop' located at '644 Nancy Ndamase St, Klipfontein View, Midrand, 1685, South Africa'.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log(response.text);
}

findPlaceId();
