/** Turn "(928) 555-1234" into "+19285551234". Returns null if it isn't a US number. */
export function normalizeUsPhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 10 && /^[2-9]/.test(digits)) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1") && /^[2-9]/.test(digits[1])) return `+${digits}`;
  return null;
}

/** "+19285551234" -> "(928) 555-1234" */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
