import { randomBytes } from "node:crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRedeemCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export function generateRedeemCode(length = 12): string {
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[buf[i]! % CHARSET.length]!;
  }
  return out;
}
