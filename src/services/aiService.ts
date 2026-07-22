import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// --- Configuration & API Key Management ---
const getApiKey = (): string => {
  const key = 
    (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY : undefined) ||
    (typeof process !== "undefined" && process.env ? process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY : undefined);

  if (!key) {
    console.warn("⚠️ [aiService] Missing Gemini API Key in environment variables.");
    return "";
  }
  return key;
};

// --- Types & Interfaces ---
export interface AIRequestOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  fallbackResponse?: string;
}

export interface AIResponse {
  success: boolean;
  text: string;
  latencyMs: number;
  error?: string;
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private defaultModel: string = "gemini-2.5-flash";

  constructor() {
    this.init();
  }

  private init() {
    const apiKey = getApiKey();
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Core AI Usage Logger
   */
  private logUsage(action: string, latencyMs: number, success: boolean, promptLength: number, error?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: "Gemini",
      action,
      latencyMs,
      success,
      promptChars: promptLength,
      ...(error && { error })
    };
    // In production, send this to your telemetry/database
    console.log(`🤖 [AI Usage Log]`, JSON.stringify(logEntry));
  }

  /**
   * Prompt Validation & Safety Check
   */
  private validatePrompt(prompt: string): { valid: boolean; reason?: string } {
    if (!prompt || prompt.trim().length === 0) {
      return { valid: false, reason: "Prompt cannot be empty." };
    }
    if (prompt.length > 30000) { // Safety guardrail against excessive token burn
      return { valid: false, reason: "Prompt exceeds safety character limits." };
    }
    return { valid: true };
  }

  /**
   * Primary Text Generation Endpoint with Fallback Recovery
   */
  public async ask(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now();
    const fallback = options.fallbackResponse || "I'm currently unable to process your request. Please try again in a moment.";

    // 1. Validate Prompt
    const validation = this.validatePrompt(options.prompt);
    if (!validation.valid) {
      this.logUsage("ask_validation_failed", 0, false, options.prompt?.length || 0, validation.reason);
      return { success: false, text: fallback, latencyMs: 0, error: validation.reason };
    }

    // 2. Verify SDK Initialization
    if (!this.genAI) {
      this.init();
      if (!this.genAI) {
        const err = "AI Service not initialized (Missing API Key).";
        this.logUsage("ask_init_failed", 0, false, options.prompt.length, err);
        return { success: false, text: fallback, latencyMs: 0, error: err };
      }
    }

    try {
      // 3. Configure Model
      const modelConfig: any = {
        model: this.defaultModel,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
        }
      };

      if (options.systemInstruction) {
        modelConfig.systemInstruction = options.systemInstruction;
      }

      const model: GenerativeModel = this.genAI.getGenerativeModel(modelConfig);

      // 4. Execute API Call
      const result = await model.generateContent(options.prompt);
      const responseText = result.response.text();
      const latencyMs = Date.now() - startTime;

      // 5. Log Success & Return
      this.logUsage("ask_success", latencyMs, true, options.prompt.length);
      return {
        success: true,
        text: responseText,
        latencyMs
      };

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error?.message || "Unknown Gemini API Error";
      
      // Error Recovery & Abuse Protection Logging
      this.logUsage("ask_error", latencyMs, false, options.prompt.length, errorMessage);
      console.error("❌ [aiService Error]:", error);

      return {
        success: false,
        text: fallback,
        latencyMs,
        error: errorMessage
      };
    }
  }
}

// Export a singleton instance for consistent usage across the app
export const aiService = new AIService();
export default aiService;
