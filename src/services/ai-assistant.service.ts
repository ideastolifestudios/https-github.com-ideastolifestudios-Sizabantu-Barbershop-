import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIAssistantConfig,
  ConversationContext,
  ConversationMessage,
  AIResponse,
  AIBookingRequest,
  AILeadCapture,
  AIServiceRecommendation,
  DetectedIntent,
  AIAction,
} from '../types/ai-assistant.types';

export class AIAssistantService {
  private client: GoogleGenerativeAI;
  private conversations: Map<string, ConversationContext>;
  private config: AIAssistantConfig;

  constructor(config: AIAssistantConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.conversations = new Map();
    this.config = config;
  }

  async processMessage(
    sessionId: string,
    userMessage: string,
    customerId?: string,
    phoneNumber?: string
  ): Promise<AIResponse> {
    // Get or create conversation context
    let context = this.conversations.get(sessionId);
    if (!context) {
      context = this.createConversationContext(sessionId, customerId, phoneNumber);
    }

    // Add user message
    context.messages.push({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Generate AI response
    const response = await this.generateResponse(context);

    // Add assistant response
    context.messages.push({
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
    });

    // Update context
    context.lastUpdateTime = new Date();
    this.conversations.set(sessionId, context);

    return response;
  }

  private async generateResponse(context: ConversationContext): Promise<AIResponse> {
    const model = this.client.getGenerativeModel({ model: this.config.model });

    const systemPrompt = this.buildSystemPrompt(context);
    const conversationHistory = context.messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: conversationHistory.slice(0, -1), // Exclude last user message
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      },
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(context.messages[context.messages.length - 1].content);
    const responseText = result.response.text();

    // Parse response for intents and actions
    const detectedIntents = this.detectIntents(responseText, context);
    const actions = this.extractActions(responseText, detectedIntents, context);

    return {
      conversationId: context.sessionId,
      response: responseText,
      detectedIntents,
      actions,
      confidence: this.calculateConfidence(detectedIntents),
      followUpQuestions: this.generateFollowUpQuestions(detectedIntents),
    };
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a professional and friendly AI assistant for Sizabantu Barbershop. 
Your primary responsibilities are:
1. Help customers book appointments
2. Answer frequently asked questions about our services
3. Capture new customer leads
4. Recommend services based on customer preferences and history

Customer Context:
- Customer ID: ${context.customerId || 'Unknown'}
- Phone: ${context.phoneNumber || 'Not provided'}
- Conversation Intent: ${context.intent || 'Not yet determined'}

Guidelines:
- Be helpful, professional, and friendly
- Provide accurate information about services and pricing
- Assist with booking appointments when requested
- Capture lead information when appropriate
- Make service recommendations based on context
- Always confirm before making any commitments
- Escalate to human staff if needed for complex issues

${this.config.systemPrompt}`;
  }

  private detectIntents(response: string, context: ConversationContext): DetectedIntent[] {
    const intents: DetectedIntent[] = [];
    const lowerResponse = response.toLowerCase();

    // Booking intent
    if (
      lowerResponse.includes('book') ||
      lowerResponse.includes('appointment') ||
      lowerResponse.includes('schedule')
    ) {
      intents.push({
        type: 'booking',
        confidence: this.calculateIntentConfidence(response, 'booking'),
        parameters: this.extractBookingParameters(response),
      });
    }

    // FAQ intent
    if (
      lowerResponse.includes('question') ||
      lowerResponse.includes('how') ||
      lowerResponse.includes('what') ||
      lowerResponse.includes('when') ||
      lowerResponse.includes('where') ||
      lowerResponse.includes('price') ||
      lowerResponse.includes('cost')
    ) {
      intents.push({
        type: 'faq',
        confidence: this.calculateIntentConfidence(response, 'faq'),
      });
    }

    // Lead capture intent
    if (
      lowerResponse.includes('interested') ||
      lowerResponse.includes('contact') ||
      lowerResponse.includes('information') ||
      lowerResponse.includes('sign up') ||
      lowerResponse.includes('join')
    ) {
      intents.push({
        type: 'lead_capture',
        confidence: this.calculateIntentConfidence(response, 'lead_capture'),
      });
    }

    // Recommendation intent
    if (
      lowerResponse.includes('recommend') ||
      lowerResponse.includes('suggest') ||
      lowerResponse.includes('best') ||
      lowerResponse.includes('popular')
    ) {
      intents.push({
        type: 'recommendation',
        confidence: this.calculateIntentConfidence(response, 'recommendation'),
      });
    }

    return intents.length > 0
      ? intents.sort((a, b) => b.confidence - a.confidence)
      : [{ type: 'other', confidence: 0.5 }];
  }

  private calculateIntentConfidence(response: string, intent: string): number {
    // Simple keyword-based confidence scoring
    const keywordMap: Record<string, string[]> = {
      booking: ['book', 'appointment', 'schedule', 'time', 'date'],
      faq: ['how', 'what', 'when', 'where', 'why', 'price', 'cost', 'hours'],
      lead_capture: ['interested', 'contact', 'information', 'sign', 'join', 'name', 'phone'],
      recommendation: ['recommend', 'suggest', 'best', 'popular', 'try', 'would like'],
    };

    const keywords = keywordMap[intent] || [];
    let matches = 0;
    const lowerResponse = response.toLowerCase();

    keywords.forEach((keyword) => {
      if (lowerResponse.includes(keyword)) matches++;
    });

    return Math.min(1, (matches / keywords.length) * 0.8 + 0.2);
  }

  private extractBookingParameters(response: string): Record<string, any> {
    // Basic parameter extraction - can be enhanced with NLP
    return {
      hasDatePreference: /date|when|time|day/.test(response.toLowerCase()),
      hasServicePreference: /service|haircut|fade|shape/.test(response.toLowerCase()),
    };
  }

  private extractActions(
    response: string,
    intents: DetectedIntent[],
    context: ConversationContext
  ): AIAction[] {
    const actions: AIAction[] = [];
    const primaryIntent = intents[0];

    if (primaryIntent.type === 'booking' && context.sessionId) {
      actions.push({
        type: 'create_booking',
        data: {
          conversationId: context.sessionId,
          customerId: context.customerId,
          parameters: primaryIntent.parameters,
        },
        requiresConfirmation: true,
      });
    }

    if (primaryIntent.type === 'lead_capture' && context.phoneNumber) {
      actions.push({
        type: 'capture_lead',
        data: {
          conversationId: context.sessionId,
          phoneNumber: context.phoneNumber,
        },
        requiresConfirmation: true,
      });
    }

    if (primaryIntent.type === 'recommendation') {
      actions.push({
        type: 'recommend_service',
        data: {
          conversationId: context.sessionId,
          customerId: context.customerId,
        },
        requiresConfirmation: false,
      });
    }

    if (primaryIntent.confidence < 0.4) {
      actions.push({
        type: 'escalate_to_human',
        data: { reason: 'low_confidence', conversationId: context.sessionId },
        requiresConfirmation: false,
      });
    }

    return actions;
  }

  private calculateConfidence(intents: DetectedIntent[]): number {
    if (intents.length === 0) return 0.5;
    return Math.max(...intents.map((i) => i.confidence));
  }

  private generateFollowUpQuestions(intents: DetectedIntent[]): string[] {
    const questions: Record<string, string[]> = {
      booking: [
        'What date and time would you prefer?',
        'Do you have a preferred barber?',
        'Which service are you interested in?',
      ],
      faq: [
        'Do you have any other questions?',
        'Would you like to know about our membership program?',
      ],
      lead_capture: [
        'Can I get your name and email?',
        'What services interest you most?',
        'When would be a good time to contact you?',
      ],
      recommendation: [
        'Would you like to book an appointment?',
        'Do you have any other preferences?',
      ],
      other: ['How else can I help you?'],
    };

    const intent = intents[0]?.type || 'other';
    return questions[intent] || questions['other'];
  }

  private createConversationContext(
    sessionId: string,
    customerId?: string,
    phoneNumber?: string
  ): ConversationContext {
    return {
      sessionId,
      customerId,
      phoneNumber,
      messages: [],
      startTime: new Date(),
      lastUpdateTime: new Date(),
    };
  }

  getConversation(sessionId: string): ConversationContext | undefined {
    return this.conversations.get(sessionId);
  }

  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  getAllConversations(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }
}
