// ═══════════════════════════════════════════════════════════
// Infobip API Service — SMS & WhatsApp messaging
// ═══════════════════════════════════════════════════════════
// Keys loaded from VITE_INFOBIP_BASE_URL and VITE_INFOBIP_API_KEY
// ═══════════════════════════════════════════════════════════

const API_KEY = import.meta.env.VITE_INFOBIP_API_KEY || "";
const BASE_URL = import.meta.env.VITE_INFOBIP_BASE_URL || "";

interface SendResult {
  success: boolean;
  message: string;
  messageId?: string;
}

export function isInfobipConfigured(): boolean {
  return Boolean(API_KEY) && Boolean(BASE_URL);
}

// ── Send SMS via Infobip ──
export async function sendSMS(to: string, message: string): Promise<SendResult> {
  if (!isInfobipConfigured()) {
    return { success: false, message: "Infobip not configured. Add API keys in Settings." };
  }
  try {
    const response = await fetch(`${BASE_URL}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [{ from: "PartsPro", destinations: [{ to }], text: message }],
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.requestError?.serviceException?.text || `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, message: "SMS sent", messageId: data.messages?.[0]?.messageId };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

// ── Send WhatsApp via Infobip ──
export async function sendWhatsApp(to: string, message: string): Promise<SendResult> {
  if (!isInfobipConfigured()) {
    return { success: false, message: "Infobip not configured. Add API keys in Settings." };
  }
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/1/message/text`, {
      method: "POST",
      headers: {
        Authorization: `App ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "PartsPro", to, content: { text: message } }),
    });
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` };
    }
    return { success: true, message: "WhatsApp sent" };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

// ── Format invoice for SMS ──
export function formatInvoiceSMS(invoice: any): string {
  return `فاتورة Parts Pro #${invoice.id}\nإجمالي: ${invoice.total?.toFixed(2)} ر.س\nشكراً لتعاملكم!`;
}

// ── Format invoice for WhatsApp ──
export function formatInvoiceWhatsApp(invoice: any): string {
  return `*فاتورة Parts Pro*\n#${invoice.id}\nالعميل: ${invoice.customer}\nالإجمالي: *${invoice.total?.toFixed(2)} ر.س*\nالتاريخ: ${invoice.date}`;
}
