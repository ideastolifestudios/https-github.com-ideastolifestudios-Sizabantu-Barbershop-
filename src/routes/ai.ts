
// Fallback AI engine handler added by automated repair script
const generateShopAIResponse = async (msg) => {
  return "Welcome to Sizabantu Barbershop! Our automatic message routing is processing your request for: " + msg;
};
import { Router, Request, Response } from 'express';
import { getSizweResponse } from "../lib/ai/aiService";

const router = Router();

/**
 * POST /api/ai/chat
 * Handles customer chat requests from the storefront widget
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, userId = 'web-visitor' } = req.body;

    // 1. Basic validation
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Please provide a valid message.'
      });
      return;
    }

    // 2. Build live shop context (Time in SAST & Business Hours check)
    const now = new Date();
    // Convert to South African Standard Time (SAST)
    const sastOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Africa/Johannesburg', 
      weekday: 'long', 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: false 
    };
    const sastTimeStr = new Intl.DateTimeFormat('en-ZA', sastOptions).format(now);
    
    // Quick opening hours logic (Mon-Sat: 08:00 - 18:00, Sun: Closed for example)
    const currentHour = parseInt(new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: 'numeric', hour12: false }).format(now), 10);
    const currentDay = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short' }).format(now);
    
    const isOpen = (currentDay !== 'Sun') && (currentHour >= 8 && currentHour < 18);
    
    const liveContext = `
Current Shop Date/Time (SAST): ${sastTimeStr}
Current Live Status: ${isOpen ? 'OPEN right now' : 'CLOSED right now (Normal hours: Mon-Sat 8AM-6PM)'}
Check-in Rule: Customers must use their booking verification code at the shop terminal.
    `.trim();

    console.log(`[AI ROUTE] Processing message from ${userId}: "${message.substring(0, 30)}..."`);

    // 3. Call our Gemini Engine
    const aiResult = await generateShopAIResponse(message, liveContext, userId);

    if (!aiResult.success) {
      res.status(503).json({
        success: false,
        error: aiResult.error || 'AI service temporarily unavailable.'
      });
      return;
    }

    // 4. Return successful response to frontend
    res.status(200).json({
      success: true,
      reply: aiResult.text,
      tokensUsed: aiResult.tokensUsed
    });

  } catch (err: any) {
    console.error('[AI ROUTE] Unhandled Exception:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your chat request.'
    });
  }
});

export default router;
