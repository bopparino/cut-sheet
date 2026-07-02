import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Password hashing with Node's built-in scrypt. Kept dependency-free and free
// of any DB import so both db.ts (admin seed) and auth.ts can use it without a
// circular import. Format: "scrypt$<saltHex>$<hashHex>".

const KEYLEN = 64;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length === 0) return false;
  const actual = scryptSync(pw, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
