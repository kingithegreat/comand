# Tactical Command viewport UI pass

## Scope

Presentation only. Combat math, stats, fog visibility, CTF interactions, AI,
multiplayer writes, deployment rules, and turn rules are unchanged.

The old center column scrolled vertically because it stacked a width-sized
square board, duplicate roster grids, full unit diagnostics, a second online
timer, and a combat feed below the header. The board was limited to 80dvh,
not to the actual space remaining after those controls.

The match now uses a safe-area-aware fixed 100dvh cockpit, a shrinking flex
board stage, and size-container units to fit the entire grid to both available
dimensions. Tiles use square aspect ratios rather than padding plus borders.
This also overrides the global touch-only tile minimum that could stretch rows.

- Compact targeting feedback (hit chance/blocked/range/AP), Turn, End Turn,
  online timer/Claim Turn, CTF score, selection HP/AP, abilities,
  undo, overwatch, and threat/view controls remain available.
- Panels opens sector selection, Sensors (full combat log), rankings, online
  chat, Squads/recruitment, Targeting diagnostics, and accessibility settings.
- Recruitment closes the drawer after picking a class, returning to placement.
- Drawers contain their own scroll, trap keyboard focus, close with Escape, and
  return focus to Panels. Board hotkeys do not fire behind a drawer.
- Zoom is an explicit, reversible precision mode. Only the board pans in that
  mode; Fit board returns to the no-scroll overview. Double-tap/click still works.
- Short landscape screens move action controls into a bounded side rail.
- Unit slide and turn-banner timing is tightened; the bouncing ability prompt
  is removed. Reduced-motion preferences suppress cockpit animations.
- Shop/friends remain in the existing main-menu UI, outside the match cockpit.

## Completed checks

- `npm ci`: passed; no lockfile or dependency changes.
- `npm run lint` (TypeScript): passed.
- `npm run build`: passed, including PWA generation.
- `npm exec -- tsx --test src/three/*.test.ts`: all 4 test files passed
  (23 silhouette assertion groups, 11 board-mapping groups, 43 effects checks,
  18 interaction checks).
- AST comparison against the starting commit: 21 core gameplay/AI/fog/CTF/
  multiplayer/turn/formation function initializers are byte-for-byte unchanged.
- `git diff --check`: passed.

These are compile/static/regression checks, NOT browser-layout evidence.
No interactive browser tool was available in this executor. Do not claim the
following acceptance matrix passed before collecting real viewport evidence.

## Required browser acceptance before merge

Run `npm run dev` and open `http://localhost:3000`.

Test at **1280x800 desktop**, **390x844 portrait**, **320x568 portrait**, and
**844x390 landscape**; repeat portrait with safe-area CSS vars set to 44px top
and 24px bottom, and with browser text zoom. Use current Chrome/Android and
Safari/iOS where possible (the fit uses CSS size-container units).

1. Start Versus AI, recruit a class via Recruit / Squads, deploy into the legal
   zone, then start battle. Repeat deployment for both teams in Pass & Play.
2. In Fit mode confirm ALL grid edges/rows are inside the stage, no page scroll,
   no internal board scrollbar, and End Turn stays reachable before/after unit
   selection, both ability buttons, undo, and threat display.
3. Select and move a unit, attack, use an ability, pass a unit from Details,
   undo a move, and end a turn. Confirm feedback/HP/AP remain readable.
4. Open/close every Panels entry. Verify drawer scrolling never scrolls the
   page; Escape/Tab/Shift+Tab and focus return work; typing in chat cannot end
   a turn or activate a unit ability.
5. Zoom, pan to every corner, then Fit board. Verify all cells remain reachable
   in 2D and isometric view. Confirm coarse-pointer touch targets are usable.
6. In a real two-account online match verify timer/Claim Turn, chat, handoff,
   and CTF scores/flag visibility; this requires Aden/a second tester.
7. Enable reduced motion; verify no ongoing bounce/shake/slide/banner motion.
8. Exit to menu and reopen a match. Ensure the menu can still scroll normally.

## Existing warnings / limits

`npm ci` reports 31 dependency findings (3 low, 14 moderate, 13 high, 1 critical).
This UI pass does not run audit fixes or upgrade dependencies. Build warns about
the existing large Three.js chunk and stale Browserslist data. Review dependencies
separately. Tiny viewports necessarily make overview tiles small; use explicit
Zoom for precision. Portrait/landscape visual fit and online friend play still
need human/browser acceptance. No merge or production deployment was performed.
