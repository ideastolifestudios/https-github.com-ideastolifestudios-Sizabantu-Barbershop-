import fetch from 'node-fetch';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v17.0';

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: any[];
}

export const sendWhatsAppTemplate = async (
  to: string,
  templateName: string,
  components: TemplateComponent[] = [],
  languageCode: string = 'en_US'
) => {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[WHATSAPP] Meta Cloud API credentials not configured. Skipping send.');
    return { success: false, error: 'Config missing' };
  }

  const formattedTo = to.replace(/\+/g, '').replace(/\s/g, '');
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: formattedTo,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: components,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;

    if (response.ok) {
      console.log(`[WHATSAPP] Template ${templateName} sent to ${formattedTo}. Message ID: ${data.messages?.[0]?.id}`);
      return { success: true, messageId: data.messages?.[0]?.id };
    } else {
      console.error('[WHATSAPP] API Error:', data);
      return { success: false, error: data.error?.message || 'API error' };
    }
  } catch (error) {
    console.error('[WHATSAPP] Network Error:', error);
    return { success: false, error: (error as Error).message };
  }
};
