import { GoogleGenAI } from "@google/genai";

export interface AppointmentData {
  id: string;
  clientName: string;
  serviceName: string;
  price: number;
  timeSlot: string;
  status: string;
  isReturningClient: boolean;
  [key: string]: any;
}

export const adminAiService = {
  generateBusinessReport: async (appointments: AppointmentData[], targetDate: string) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return "⚠️ [Admin AI] Missing API Key. Unable to generate report.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const totalRevenue = appointments.reduce((sum, app) => sum + (app.price || 0), 0);
      const completedCount = appointments.filter(a => a.status === 'completed').length;
      
      const prompt = `
You are the Executive Business AI for Sizabantu Barbershop.
Analyze these daily metrics for ${targetDate} and provide a sharp, executive summary.

Quick Stats Summary:
- Total Appointments: ${appointments.length}
- Completed: ${completedCount}
- Projected Total Revenue: R${totalRevenue}

Format cleanly with:
1. 📈 Performance Overview: (1-2 sentences on overall health)
2. 🔥 Hot Streaks & Bottlenecks: (What's working best vs what needs attention)
3. 🎯 Actionable Growth Suggestion: (1 concrete promotional or operational idea based on this data)

DETAILED APPOINTMENT DATA:
${JSON.stringify(appointments, null, 2)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text?.trim() || "Report unavailable.";
    } catch (error: any) {
      console.error("❌ [Admin AI Error]:", error.message);
      return "⚠️ AI engine temporarily unavailable for business analysis.";
    }
  }
};
