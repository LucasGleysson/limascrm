/**
 * Formats a phone string to (DD) 99999-9999 or (DD) 9999-9999
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2, 13);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9 digits (with the 9 prefix)
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

/**
 * Masks phone input as user types
 */
export function maskPhoneInput(value: string): string {
  return formatPhone(value);
}
