/**
 * Validación / normalización de teléfonos (máx. 12 caracteres).
 *
 * Acepta ejemplos:
 * - 1123456789
 * - 11 2345-6789
 * - +54112345678
 */

export const PHONE_MAX_LENGTH = 12;

export function extractPhoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Guarda un formato limpio: solo dígitos, con +54 si vino con código de país. */
export function normalizePhone(value: string): string {
  const raw = String(value || '').trim().slice(0, PHONE_MAX_LENGTH);
  const digits = extractPhoneDigits(raw);
  if (!digits) return '';

  if (raw.includes('+54') || digits.startsWith('54')) {
    return `+${digits.startsWith('54') ? digits : `54${digits}`}`;
  }

  return digits;
}

export function getPhoneValidationError(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) {
    return 'El teléfono es obligatorio';
  }

  if (raw.length > PHONE_MAX_LENGTH) {
    return `El teléfono no puede superar ${PHONE_MAX_LENGTH} caracteres`;
  }

  if (!/^[+\d\s().-]+$/.test(raw)) {
    return 'Usá solo números y separadores (+, espacios, guiones o paréntesis)';
  }

  const digits = extractPhoneDigits(raw);

  if (digits.length < 8) {
    return 'El teléfono es demasiado corto';
  }

  if (digits.length > 12) {
    return 'El teléfono es demasiado largo';
  }

  if (/^(\d)\1+$/.test(digits)) {
    return 'El teléfono no es válido';
  }

  // Con código de país Argentina (54...), dentro del tope de 12 caracteres
  if (digits.startsWith('54')) {
    if (digits.length < 10 || digits.length > 12) {
      return 'Con +54 el número debe tener entre 10 y 12 dígitos';
    }
    return null;
  }

  // Local AR: 8 a 10 dígitos
  if (digits.length < 8 || digits.length > 10) {
    return 'Ingresá un teléfono válido (8 a 10 dígitos)';
  }

  return null;
}

export function isValidPhone(value: string): boolean {
  return getPhoneValidationError(value) === null;
}
