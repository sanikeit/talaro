import crypto from "crypto";

/**
 * Generates an unambiguous 12-character alphanumeric code using uppercase letters
 * and digits (excluding confusing characters like 0, O, 1, I).
 */
export function generate12CharCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export const generateInviteCode = generate12CharCode;
