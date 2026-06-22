import { normalizePhone, whatsappConfigured } from '../config';

type WhatsAppResult = { ok: boolean; error?: string; messageId?: string; stub?: boolean };

export async function sendWhatsAppText(toPhone: string, body: string): Promise<WhatsAppResult> {
  const phone = normalizePhone(toPhone);
  if (phone.length !== 10) {
    return { ok: false, error: 'Invalid phone number' };
  }

  if (!whatsappConfigured()) {
    console.info('[WhatsApp:stub]', phone, body);
    return { ok: true, stub: true };
  }

  const token = process.env.WHATSAPP_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `91${phone}`,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const payload = (await response.json()) as { messages?: { id: string }[]; error?: { message: string } };
  if (!response.ok) {
    return { ok: false, error: payload.error?.message ?? response.statusText };
  }

  return { ok: true, messageId: payload.messages?.[0]?.id };
}

export async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  bodyParams: string[],
): Promise<WhatsAppResult> {
  const phone = normalizePhone(toPhone);
  if (phone.length !== 10) {
    return { ok: false, error: 'Invalid phone number' };
  }

  if (!whatsappConfigured()) {
    console.info('[WhatsApp:template:stub]', phone, templateName, bodyParams);
    return { ok: true, stub: true };
  }

  const token = process.env.WHATSAPP_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const language = process.env.WHATSAPP_TEMPLATE_LANG ?? 'en';

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `91${phone}`,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: bodyParams.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    }),
  });

  const payload = (await response.json()) as { messages?: { id: string }[]; error?: { message: string } };
  if (!response.ok) {
    const fallback = await sendWhatsAppText(phone, bodyParams.join(' · '));
    if (fallback.ok) return fallback;
    return { ok: false, error: payload.error?.message ?? response.statusText };
  }

  return { ok: true, messageId: payload.messages?.[0]?.id };
}

export async function sendOrderWhatsApp(toPhone: string, message: string, statusLabel: string): Promise<WhatsAppResult> {
  const template = process.env.WHATSAPP_ORDER_TEMPLATE ?? 'order_status_update';
  const templateResult = await sendWhatsAppTemplate(toPhone, template, [statusLabel, message]);
  if (templateResult.ok) return templateResult;
  return sendWhatsAppText(toPhone, message);
}
