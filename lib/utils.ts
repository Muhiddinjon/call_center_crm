import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as +998 XX XXX XX XX
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }

  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }

  return phone;
}

export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // Remove leading zeros
  digits = digits.replace(/^0+/, '');

  // Handle different formats:
  // 9 digits: 901234567 -> +998901234567
  // 12 digits: 998901234567 -> +998901234567
  // 11 digits with 8: 89012345678 -> +79012345678 (Kazakhstan)

  // Convert 8 prefix to 7 (for Kazakhstan numbers)
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '7' + digits.slice(1);
  }

  // Add 998 prefix for Uzbekistan numbers (9 digits starting with 9, 7, 5, 3)
  if (digits.length === 9 && /^[9753]/.test(digits)) {
    digits = '998' + digits;
  }

  return '+' + digits;
}

// Search-friendly phone normalization - returns multiple possible formats
export function getPhoneSearchVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');

  const variants = new Set<string>();
  variants.add(normalized);
  variants.add(digits);

  // Add without country code
  if (digits.startsWith('998') && digits.length === 12) {
    variants.add(digits.slice(3)); // 9 digit
    variants.add('+998' + digits.slice(3));
  }

  // Add with different prefixes
  if (digits.length === 9) {
    variants.add('998' + digits);
    variants.add('+998' + digits);
  }

  return Array.from(variants);
}

// Get current time in Tashkent timezone
export function getTashkentTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

// Convert timestamp to Tashkent timezone string
export function toTashkentISO(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).replace(' ', 'T');
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  });
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tashkent',
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
