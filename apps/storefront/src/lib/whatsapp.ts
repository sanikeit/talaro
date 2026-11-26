/**
 * WhatsApp integration helpers for Talaro marketplace.
 */

/**
 * Normalizes an Indian phone number and builds a wa.me URL.
 * - Strips non-digits
 * - If 11 digits starting with '0', drops leading 0 and prefixes 91
 * - If 10 digits, prefixes 91
 * - If 12 digits starting with 91, keeps as is
 * - Returns null if phone is empty or invalid
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message?: string
): string | null {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return null;
  }

  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned) {
    return null;
  }

  let normalized: string;

  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    normalized = `91${cleaned.slice(1)}`;
  } else if (cleaned.length === 10) {
    normalized = `91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    normalized = cleaned;
  } else if (cleaned.startsWith("91")) {
    normalized = cleaned;
  } else {
    normalized = `91${cleaned}`;
  }

  const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Talaro";
  const defaultMsg = `Hi, I found you on ${platform}. Is this item available?`;
  const text = message !== undefined && message !== null ? message : defaultMsg;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a tailored product enquiry WhatsApp link.
 */
export function buildProductEnquiryLink(
  phone: string | null | undefined,
  productTitle: string,
  sellerName: string,
  productUrl?: string
): string | null {
  const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Talaro";
  let message = `Hi ${sellerName}, I'm interested in ${productTitle} listed on ${platform}. Is it in stock?`;
  if (productUrl) {
    message += ` ${productUrl}`;
  }

  return buildWhatsAppLink(phone, message);
}
