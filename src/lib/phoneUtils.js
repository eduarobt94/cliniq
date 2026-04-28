/**
 * Strips visual formatting characters from a phone string.
 * Keeps leading + and all digits; removes spaces, dashes, dots, parentheses.
 */
export function normalizePhone(raw = '') {
  const stripped = raw.replace(/[\s\-().]/g, '');
  return stripped;
}

/**
 * Returns true if the string looks like a valid E.164 phone number.
 * E.164: starts with +, followed by 7–15 digits, no other characters.
 *
 * Examples that pass:  "+59899123456", "+1234567890"
 * Examples that fail:  "098123456", "+598 99 123 456", "+1"
 */
export function isValidE164(phone = '') {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Returns true if the raw input, after normalization, is a valid E.164 number.
 * Accepts numbers typed with spaces / dashes as long as the stripped form is valid.
 */
export function isValidPhone(raw = '') {
  return isValidE164(normalizePhone(raw));
}
