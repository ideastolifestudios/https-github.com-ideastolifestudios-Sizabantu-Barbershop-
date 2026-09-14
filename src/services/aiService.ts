import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIResponse {
  success: boolean;
  text?: string;
  error?: string;
  tokensUsed?: number;
}

const getApiKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  }
  return undefined;
};

export const generateShopAIResponse = async (
  message: string,
  liveContext?: any,
  userId?: string
): Promise<AIResponse> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key is not configured.',
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let promptContext = 'You are a helpful AI assistant for the barbershop.\n';
    if (liveContext) {
      promptContext += `Context: ${typeof liveContext === 'string' ? liveContext : JSON.stringify(liveContext)}\n`;
    }
    if (userId) {
      promptContext += `User ID: ${userId}\n`;
    }

    const fullPrompt = `${promptContext}\nUser Query: ${message}`;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      text,
      tokensUsed: result.response.usageMetadata?.totalTokenCount,
    };
  } catch (error: any) {
    console.error('[AI Service Error]:', error);
    return {
      success: false,
      error: error.message || 'AI service temporarily unavailable.',
    };
  }
};

export const aiService = {
  generateShopAIResponse,
  generateResponse: generateShopAIResponse,
};

export default aiService;