import { aiService } from "./aiService";

export interface ConsultationProfile {
  faceShape?: string;      // e.g., Oval, Round, Square, Long
  hairTexture?: string;    // e.g., Straight, Wavy, Curly, Coily/Kinky
  maintenanceLevel?: string; // e.g., Low (wash and go), Medium, High (daily styling)
  currentLength?: string;  // e.g., Short, Medium, Long
}

class RecommendationService {
  /**
   * Generates a tailored hairstyle and grooming service recommendation
   */
  public async getHairstyleRecommendation(profile: ConsultationProfile): Promise<string> {
    const prompt = `
      Analyze the following client grooming profile and provide 2 distinct, highly matching hairstyle recommendations along with the exact shop service they should book.
      
      Client Profile:
      - Face Shape: ${profile.faceShape || "Not specified (provide general flattering options)"}
      - Hair Texture: ${profile.hairTexture || "Not specified"}
      - Desired Maintenance Level: ${profile.maintenanceLevel || "Medium"}
      - Current Hair Length: ${profile.currentLength || "Short"}
      
      Formatting Rules:
      - Return your response in clean, brief Markdown paragraphs.
      - Use **bolding** for the names of the hairstyles.
      - Explicitly state the "Recommended Shop Service" (e.g., Classic Fade, Premium Scissor Cut, Beard Trim & Line-up) for each.
      - Keep the tone confident, fashionable, and professional like a master barber.
    `;

    const systemInstruction = `
      You are an elite Master Barber and Grooming Consultant at Sizabantu Barbershop. 
      Your goal is to analyze facial geometry and hair types to recommend styles that enhance the client's features while matching their lifestyle overhead.
      Be concise, authoritative on style trends, and always tie your suggestions back to standard barbershop service offerings.
    `;

    const response = await aiService.ask({
      prompt,
      systemInstruction,
      temperature: 0.6,
      maxOutputTokens: 600,
      fallbackResponse: "I'm having trouble analyzing your profile right now. I recommend booking our 'Consultation & Haircut' service so a master barber can evaluate your hair profile in person!"
    });

    return response.text;
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
