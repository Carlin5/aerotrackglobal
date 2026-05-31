import { customAlphabet } from "nanoid";

// Avoid ambiguous chars (0/O, 1/I/L) for readability when read over phone.
const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const nano6 = customAlphabet(ALPHA, 6);
const nano2 = customAlphabet(ALPHA, 2);

/** Format: AT-XXXXXX-YY (e.g. AT-7K9L2M-A1) */
export function generateTrackingId(): string {
  return `AT-${nano6()}-${nano2()}`;
}

export function generateFlightNumber(): string {
  // Carrier prefix AT (AeroTrack) + 4 digits
  const n = Math.floor(1000 + Math.random() * 8999);
  return `AT${n}`;
}

export function normalizeTrackingId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
