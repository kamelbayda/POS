/**
 * Password hashing for local user accounts (PBKDF2-SHA256 via WebCrypto).
 * Stored format: "pbkdf2$<iterations>$<salt b64>$<hash b64>".
 * Older installs stored plaintext; verifyPassword still accepts those so they can
 * be upgraded to a hash on the next successful login (see needsRehash).
 */
const ITERATIONS = 150_000;
const PREFIX = 'pbkdf2$';

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export const isHashed = (stored: string | undefined | null) => !!stored && stored.startsWith(PREFIX);

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(input: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored || !input) return false;
  if (!isHashed(stored)) return input === stored; // legacy plaintext
  const [, iter, saltB64, hashB64] = stored.split('$');
  const expected = fromB64(hashB64);
  const actual = await derive(input, fromB64(saltB64), Number(iter));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export const needsRehash = (stored: string | undefined | null) => !!stored && !isHashed(stored);
