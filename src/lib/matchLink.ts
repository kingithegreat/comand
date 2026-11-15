/** Share-link and reconnect helpers. Origin-agnostic; no Firebase. */

export const ROOM_QUERY_PARAM = 'room';
export const PENDING_ROOM_KEY = 'tc_pending_room';
export const ACTIVE_MATCH_KEY = 'tc_active_match';

export type RoomErrorCode = 'missing' | 'invalid' | 'expired' | 'aborted' | 'full' | 'self' | 'unknown';

export interface ActiveMatchRecord {
  id: string;
  mode?: 'online' | 'online_coop';
}

export function normalizeRoomCode(raw: string | null | undefined): string {
  return (raw || '').trim().toUpperCase();
}

export function isPlausibleRoomCode(code: string): boolean {
  return /^[A-Z0-9]{5,8}$/.test(code);
}

export function roomCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const code = normalizeRoomCode(params.get(ROOM_QUERY_PARAM));
  return code || null;
}

export function shareUrl(origin: string, pathname: string, code: string): string {
  const path = pathname && pathname.length > 0 ? pathname : '/';
  const base = origin.replace(/\/$/, '');
  return `${base}${path}?${ROOM_QUERY_PARAM}=${normalizeRoomCode(code)}`;
}

export function roomErrorMessage(code: RoomErrorCode, room?: string): string {
  const label = room ? ` ${room}` : '';
  switch (code) {
    case 'missing':
    case 'invalid':
      return `Room${label} wasn't found. Check the code and ask your friend to send a fresh invite.`;
    case 'expired':
      return `Room${label} has expired or already finished. Ask your friend to create a new room.`;
    case 'aborted':
      return `This match${label} was cancelled. Create a new room or wait for a new invite.`;
    case 'full':
      return `Room${label} already has two commanders. You can watch as a spectator, or ask them for a new room.`;
    case 'self':
      return `You're already in this room as the host.`;
    default:
      return 'Could not join that room. Check your connection and try again.';
  }
}

export function readSession<T>(key: string, storage?: Pick<Storage, 'getItem'> | null): T | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: unknown, storage?: Pick<Storage, 'setItem' | 'removeItem'> | null): void {
  if (!storage) return;
  try {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value));
  } catch {
    // private mode / quota — ignore
  }
}

export function persistPendingRoom(code: string | null, storage?: Storage | null): void {
  if (!storage) return;
  try {
    if (!code) storage.removeItem(PENDING_ROOM_KEY);
    else storage.setItem(PENDING_ROOM_KEY, normalizeRoomCode(code));
  } catch { /* ignore */ }
}

export function readPendingRoom(storage?: Storage | null, search?: string): string | null {
  const fromUrl = search != null ? roomCodeFromSearch(search) : null;
  if (fromUrl) return fromUrl;
  try {
    const raw = storage?.getItem(PENDING_ROOM_KEY);
    return raw ? normalizeRoomCode(raw) : null;
  } catch {
    return null;
  }
}

export function interpretJoin(opts: {
  exists: boolean;
  hostId?: string;
  guestId?: string;
  status?: string;
  userId?: string;
}): { action: 'host' | 'join' | 'rejoin' | 'spectate' | 'reject'; error?: RoomErrorCode } {
  if (!opts.exists) return { action: 'reject', error: 'missing' };
  if (opts.status === 'aborted') return { action: 'reject', error: 'aborted' };
  if (opts.status && !['waiting', 'deploying', 'play'].includes(opts.status)) {
    return { action: 'reject', error: 'expired' };
  }
  if (opts.userId && opts.hostId === opts.userId) return { action: 'host' };
  if (opts.userId && opts.guestId === opts.userId) return { action: 'rejoin' };
  if (!opts.guestId) return { action: 'join' };
  if (opts.status === 'waiting' || opts.status === 'deploying' || opts.status === 'play') {
    return { action: 'spectate', error: 'full' };
  }
  return { action: 'reject', error: 'expired' };
}
