/**
 * Helper to normalize and clean phone numbers for WhatsApp API
 * Supports international formats (+243, 081..., etc.)
 */
export const cleanPhoneNumberForWhatsApp = (rawPhone?: string | null): string => {
  if (!rawPhone) return '243810000001';
  // Supprime tout ce qui n'est pas un chiffre
  let digits = rawPhone.replace(/[^0-9]/g, '');

  // Si commence par 0, remplace par l'indicatif RDC 243 par défaut
  if (digits.startsWith('0') && digits.length >= 9) {
    digits = '243' + digits.substring(1);
  } else if (!digits.startsWith('243') && digits.length === 9) {
    digits = '243' + digits;
  }

  // Fallback si vide ou trop court
  if (!digits || digits.length < 8) {
    return '243810000001';
  }

  return digits;
};

/**
 * Normalizes phone numbers for standard RFC 3966 `tel:` links.
 * Strips all spaces, dashes, dots, and ensures leading `+` so mobile dialers execute immediately.
 */
export const cleanPhoneNumberForTel = (rawPhone?: string | null): string => {
  if (!rawPhone) return '+243810000001';
  let digits = rawPhone.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) {
    if (digits.startsWith('0')) {
      digits = '+243' + digits.substring(1);
    } else if (digits.startsWith('243')) {
      digits = '+' + digits;
    } else {
      digits = '+' + digits;
    }
  }
  return digits || '+243810000001';
};

/**
 * Triggers native phone dialer across mobile browsers, desktop FaceTime/Phone, and iframes
 */
export const triggerPhoneCall = (rawPhone?: string | null): void => {
  if (typeof window === 'undefined') return;
  const cleanPhone = cleanPhoneNumberForTel(rawPhone);
  try {
    window.location.href = `tel:${cleanPhone}`;
  } catch {
    const link = document.createElement('a');
    link.href = `tel:${cleanPhone}`;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 150);
  }
};

/**
 * Checks if current runtime is a mobile or tablet device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Builds direct native WhatsApp URL (whatsapp:// protocol).
 * Opens the WhatsApp application directly on the device.
 * Never passes through wa.me or api.whatsapp.com.
 */
export const buildWhatsAppUrl = (phone?: string | null, text?: string): string => {
  const encodedText = text ? encodeURIComponent(text) : '';
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  return `whatsapp://send?phone=${cleanPhone}${encodedText ? `&text=${encodedText}` : ''}`;
};

/**
 * Deep link directly to native WhatsApp app scheme
 */
export const getDirectNativeWhatsAppUrl = (phone?: string | null, text?: string): string => {
  const encodedText = text ? encodeURIComponent(text) : '';
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  return `whatsapp://send?phone=${cleanPhone}${encodedText ? `&text=${encodedText}` : ''}`;
};

/**
 * Robustly opens WhatsApp chat directly via native app scheme (whatsapp://)
 */
export const openWhatsApp = (phone?: string | null, text?: string): void => {
  if (typeof window === 'undefined') return;

  const encodedText = text ? encodeURIComponent(text) : '';
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const directScheme = `whatsapp://send?phone=${cleanPhone}${encodedText ? `&text=${encodedText}` : ''}`;

  try {
    const a = document.createElement('a');
    a.href = directScheme;
    a.target = '_top';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch {}
    }, 200);
  } catch {
    window.location.href = directScheme;
  }
};

/**
 * Helper to copy phone number to clipboard with fallback
 */
export const copyPhoneNumber = async (phone: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(phone);
      return true;
    } catch {}
  }
  try {
    const input = document.createElement('textarea');
    input.value = phone;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
};
