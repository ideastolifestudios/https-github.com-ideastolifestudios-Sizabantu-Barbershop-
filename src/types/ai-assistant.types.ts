// AI Assistant Types (Gemini API)
export interface AIAssistantConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface ConversationContext {
  sessionId: string;
  customerId?: string;
  phoneNumber?: string;
  messages: ConversationMessage[];
  intent?: 'booking' | 'faq' | 'lead_capture' | 'recommendation' | 'support';
  startTime: Date;
  lastUpdateTime: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AIBookingRequest {
  conversationId: string;
  customerId?: string;
  preferredDate?: Date;
  preferredTime?: string;
  preferredBarber?: string;
  serviceId?: string;
  notes?: string;
  confidence: number;
}

export interface AILeadCapture {
  conversationId: string;
  name: string;
  phone: string;
  email?: string;
  serviceInterest?: string;
  notes?: string;
  confidence: number;
  captureTime: Date;
}

export interface AIServiceRecommendation {
  conversationId: string;
  customerId?: string;
  previousServices?: string[];
  recommendedServices: ServiceRecommendation[];
  reasoning: string;
  confidence: number;
}

export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  score: number;
  reason: string;
}

export interface AIResponse {
  conversationId: string;
  response: string;
  detectedIntents: DetectedIntent[];
  actions: AIAction[];
  confidence: number;
  followUpQuestions?: string[];
}

export interface DetectedIntent {
  type: 'booking' | 'faq' | 'lead_capture' | 'recommendation' | 'support' | 'other';
  confidence: number;
  parameters?: Record<string, any>;
}

export interface AIAction {
  type: 'create_booking' | 'capture_lead' | 'recommend_service' | 'escalate_to_human';
  data: any;
  requiresConfirmation: boolean;
}

export interface AIAssistantAnalytics {
  totalConversations: number;
  successfulBookings: number;
  leadsGenerated: number;
  averageConversationLength: number;
  userSatisfactionScore: number;
  commonIntents: Record<string, number>;
  failureRate: number;
  handoffToHumanRate: number;
  period: DateRange;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface FAQDatabase {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  helpfulCount: number;
}
