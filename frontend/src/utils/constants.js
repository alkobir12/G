// Workshop Configuration
export const WORKSHOP_NAME = "ورشتي";
export const WHATSAPP_NUMBER = "966501001220"; // رقم واتساب الورشة
export const WORKSHOP_ADDRESS = "المملكة العربية السعودية";

// WhatsApp Message Templates
export const getWhatsAppLink = (phone, message) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
};

export const generateTrackingMessage = (plateNumber, trackingLink) => {
  return `مرحباً من ${WORKSHOP_NAME}! 🚗\n\nمركبتك ${plateNumber} تم استقبالها بنجاح.\n\nيمكنك تتبع حالة مركبتك من خلال الرابط:\n${window.location.origin}/track/${trackingLink}\n\nشكراً لثقتكم`;
};

export const generateStatusUpdateMessage = (plateNumber, status) => {
  const statusMessages = {
    diagnosis: 'تم البدء في تشخيص المركبة',
    quotation: 'تم تجهيز عرض السعر',
    repair: 'جاري العمل على إصلاح المركبة',
    ready: 'مركبتك جاهزة للتسليم! 🎉'
  };
  
  return `${WORKSHOP_NAME}\n\nمركبتك ${plateNumber}:\n${statusMessages[status]}\n\nللمزيد من التفاصيل، تفضل بزيارة رابط التتبع الخاص بك.`;
};

export const STATUS_LABELS = {
  diagnosis: 'تشخيص',
  quotation: 'تعميد',
  repair: 'إصلاح',
  ready: 'جاهز'
};

export const STATUS_COLORS = {
  diagnosis: '#3b82f6',
  quotation: '#f59e0b', 
  repair: '#ef4444',
  ready: '#10b981'
};
