import { useEffect, useState } from 'react';

/**
 * True on touch-first devices (phones/tablets) where hover doesn't exist.
 * Used to swap hover-driven UI for tap-driven UI and "Click" copy for "Tap".
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return coarse;
}
