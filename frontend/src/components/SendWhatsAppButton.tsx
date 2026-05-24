// SendWhatsAppButton — Infobip-backed invoice notification.
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { apiPost } from "../services/apiClient";
import { isInfobipConfigured } from "../services/infobip";

interface Props {
  phone: string;
  message: string;
  label?: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export default function SendWhatsAppButton({ phone, message, label = "إرسال واتساب", onSuccess, onError }: Props) {
  const [sending, setSending] = useState(false);
  const configured = isInfobipConfigured();

  async function handleSend() {
    if (!phone) {
      onError?.("رقم الهاتف فارغ");
      return;
    }
    setSending(true);
    try {
      await apiPost("/api/send-whatsapp", { to: phone, message });
      onSuccess?.();
    } catch (e: any) {
      onError?.(e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending || !configured}
      title={configured ? "إرسال عبر Infobip" : "أضف مفاتيح Infobip في الإعدادات لتفعيل"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
      dir="rtl"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {sending ? "جارٍ الإرسال…" : label}
    </button>
  );
}
