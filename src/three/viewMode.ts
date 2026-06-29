/**
 * View-mode type + localStorage helpers for the 3D board spike.
 * Spike scope: introduce the '3d' mode and a persisted toggle WITHOUT
 * disturbing the existing 2D / isometric ('iso') rendering paths.
 * Pure (no React) -> unit-testable.
 */
import { safeGetItem, safeSetItem } from '../lib/storage';

export type ViewMode = '2d' | 'iso' | '3d';

export const VIEW_MODE_KEY = 'tc_view_mode';
const VALID: ViewMode[] = ['2d', 'iso', '3d'];

export function isViewMode(v: unknown): v is ViewMode {
  return typeof v === 'string' && (VALID as string[]).includes(v);
}

/**
 * Read the persisted view mode. Migrates the legacy boolean key `tc_isometric`
 * ('true' -> 'iso') so existing users keep their isometric preference.
 */
export function loadViewMode(): ViewMode {
  try {
    const raw = safeGetItem(VIEW_MODE_KEY);
    if (isViewMode(raw)) return raw;
    const legacyIso = safeGetItem('tc_isometric') === 'true';
    return legacyIso ? 'iso' : '2d';
  } catch {
    return '2d';
  }
}

export function saveViewMode(mode: ViewMode): ViewMode {
  try { safeSetItem(VIEW_MODE_KEY, mode); } catch { /* non-fatal */ }
  return mode;
}

/** Cycle order for a single toggle button: 2d -> iso -> 3d -> 2d. */
export function nextViewMode(mode: ViewMode): ViewMode {
  const i = VALID.indexOf(mode);
  return VALID[(i + 1) % VALID.length];
}
