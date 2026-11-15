import { describe, expect, it } from 'vitest';
import {
  interpretJoin,
  isPlausibleRoomCode,
  normalizeRoomCode,
  readPendingRoom,
  persistPendingRoom,
  roomCodeFromSearch,
  roomErrorMessage,
  shareUrl,
} from './matchLink';

describe('room codes', () => {
  it('normalises and accepts 6-char invite codes', () => {
    expect(normalizeRoomCode(' ab12cd ')).toBe('AB12CD');
    expect(isPlausibleRoomCode('A1B2C3')).toBe(true);
    expect(isPlausibleRoomCode('no')).toBe(false);
  });

  it('reads ?room= from a share link and builds one back', () => {
    expect(roomCodeFromSearch('?room=ab12cd&x=1')).toBe('AB12CD');
    expect(shareUrl('https://comand.vercel.app', '/', 'ab12cd')).toBe('https://comand.vercel.app/?room=AB12CD');
  });
});

describe('session fallback (survives Google redirect even if the query is lost)', () => {
  it('prefers the URL, then sessionStorage', () => {
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    } as Storage;
    persistPendingRoom('zz9k2a', storage);
    expect(readPendingRoom(storage, '')).toBe('ZZ9K2A');
    expect(readPendingRoom(storage, '?room=fromurl')).toBe('FROMURL');
  });
});

describe('join interpretation', () => {
  it('rejects missing and aborted rooms, rejoins the same guest, and flags a full room', () => {
    expect(interpretJoin({ exists: false }).error).toBe('missing');
    expect(interpretJoin({ exists: true, status: 'aborted' }).error).toBe('aborted');
    expect(interpretJoin({ exists: true, status: 'play', hostId: 'h', guestId: 'g', userId: 'g' }).action).toBe('rejoin');
    expect(interpretJoin({ exists: true, status: 'play', hostId: 'h', guestId: 'g', userId: 'x' }).action).toBe('spectate');
    expect(roomErrorMessage('missing', 'ABC123')).toMatch(/ABC123/);
  });
});
