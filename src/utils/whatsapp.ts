// src/utils/whatsapp.ts – WhatsApp URL helpers for wa.me links

/**
 * Normalizes raw phone to digits-only WhatsApp format.
 * For Brazil: 10 or 11 digits without DDI → prefix with 55.
 * Returns null if invalid (empty, too short, or non-numeric).
 */
export function formatWhatsAppPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  if (digits.length >= 12 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/**
 * Builds wa.me URL with optional prefilled text.
 */
export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  if (!message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}
