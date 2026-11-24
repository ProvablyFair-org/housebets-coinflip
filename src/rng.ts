// HouseBets coin flip — the draw stream and the flips (E01): HMAC-SHA256(key = serverSeed as UTF-8, message =
// "clientSeed:nonce:block"), each 32-byte block holds 8 big-endian u32 draws; flip i reads draw i (block floor(i/8));
// side = floor(u / 2^32 × 2), 0 = H, 1 = T. No call, target, mode or coin count enters the message (COINFLIP-17).
import { createHash, createHmac } from 'node:crypto';
import { DRAWS_PER_BLOCK, TWO32 } from './spec.ts';

export function hmacBlock(serverSeed: string, clientSeed: string, nonce: number, block: number): Buffer {
  return createHmac('sha256', Buffer.from(serverSeed, 'utf8')).update(`${clientSeed}:${nonce}:${block}`).digest();
}

/** The first k draws u of a bet. */
export function draws(serverSeed: string, clientSeed: string, nonce: number, k: number): number[] {
  const out: number[] = [];
  for (let b = 0; out.length < k; b++) {
    const h = hmacBlock(serverSeed, clientSeed, nonce, b);
    for (let j = 0; j < DRAWS_PER_BLOCK && out.length < k; j++) out.push(h.readUInt32BE(4 * j));
  }
  return out;
}

/** The declared side rule, as E01 writes it: 0 = H, 1 = T. */
export const sideOf = (u: number): number => Math.floor((u / TWO32) * 2);
export const SIDES = 'HT';

/** The first k flips of a bet, as an H / T string. */
export const flips = (serverSeed: string, clientSeed: string, nonce: number, k: number): string =>
  draws(serverSeed, clientSeed, nonce, k).map((u) => SIDES[sideOf(u)]).join('');

export const sha256Hex = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
