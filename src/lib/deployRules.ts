/** Pure deployment rules for Tactical Command. No React / Firebase. */

export const GRID_SIZE = 15;
export const MIN_SQUAD_SIZE = 1;
export const MAX_SQUAD_SIZE = 8;
export const PLAYER_DEPLOY_MIN_Y = 8; // inclusive; rows 8-14
export const ENEMY_DEPLOY_MAX_Y = 6;  // inclusive; rows 0-6

export type TeamId = 'player' | 'enemy';

export type GameMode = 'local_ai' | 'local_p2p' | 'online' | 'online_coop';

export interface DeployUnit {
  id: string;
  team: TeamId;
  x: number;
  y: number;
  ownerId?: string;
}

export type CellType = 'floor' | 'wall' | 'cover' | string;

export type DeployRejectReason =
  | 'wrong_team'
  | 'out_of_bounds'
  | 'not_floor'
  | 'wrong_zone'
  | 'occupied_enemy'
  | 'squad_full'
  | 'coop_cap'
  | 'no_auth';

export interface DeployDecision {
  ok: boolean;
  action?: 'place' | 'recall';
  reason?: DeployRejectReason;
  message?: string;
  allowedCount?: number;
}

export const DEPLOY_MESSAGES: Record<DeployRejectReason, string> = {
  wrong_team: 'You can only deploy on your own side.',
  out_of_bounds: 'That tile is off the grid.',
  not_floor: 'Units can only stand on open floor tiles.',
  wrong_zone: 'Deploy in your highlighted rows — Blue at the bottom, Purple at the top.',
  occupied_enemy: 'That square is already taken.',
  squad_full: 'Squad is full. Recall a unit (tap it) before placing another.',
  coop_cap: 'Your co-op allotment is full. Recall one of your units to place another.',
  no_auth: 'Sign in is required to deploy in co-op.',
};

export function clampSquadSize(size: number): number {
  if (!Number.isFinite(size)) return 4;
  return Math.min(MAX_SQUAD_SIZE, Math.max(MIN_SQUAD_SIZE, Math.floor(size)));
}

export function inBounds(x: number, y: number, gridSize = GRID_SIZE): boolean {
  return x >= 0 && y >= 0 && x < gridSize && y < gridSize;
}

export function isInDeployZone(team: TeamId, y: number): boolean {
  return team === 'player' ? y >= PLAYER_DEPLOY_MIN_Y : y <= ENEMY_DEPLOY_MAX_Y;
}

export function coopAllotment(squadSize: number, isHost: boolean): number {
  const size = clampSquadSize(squadSize);
  return isHost ? Math.ceil(size / 2) : Math.floor(size / 2);
}

export function teamCount(units: DeployUnit[], team: TeamId): number {
  return units.filter(u => u.team === team).length;
}

export function ownerCount(units: DeployUnit[], ownerId: string): number {
  return units.filter(u => u.ownerId === ownerId).length;
}

export function canStartBattle(opts: {
  gameMode: GameMode;
  squadSize: number;
  playerCount: number;
  enemyCount: number;
}): boolean {
  const size = clampSquadSize(opts.squadSize);
  switch (opts.gameMode) {
    case 'local_ai':
    case 'online_coop':
      return opts.playerCount === size;
    case 'local_p2p':
    case 'online':
      return opts.playerCount === size && opts.enemyCount === size;
    default:
      return false;
  }
}

/** After a blue-team fill in pass-and-play, hand the terminal to purple. */
export function nextLocalP2pTeam(
  units: DeployUnit[],
  currentTeam: TeamId,
  squadSize: number,
  justRecalledTeam?: TeamId,
): TeamId {
  const size = clampSquadSize(squadSize);
  const player = teamCount(units, 'player');
  const enemy = teamCount(units, 'enemy');
  if (justRecalledTeam && teamCount(units, justRecalledTeam) < size) {
    return justRecalledTeam;
  }
  if (currentTeam === 'player' && player >= size && enemy < size) return 'enemy';
  if (currentTeam === 'enemy' && enemy >= size && player < size) return 'player';
  if (player >= size && enemy < size) return 'enemy';
  if (enemy >= size && player < size) return 'player';
  return currentTeam;
}

/** Drop extra units (last in list) when squad size shrinks, keeping the other team intact. */
export function trimTeamToSquadSize<T extends DeployUnit>(
  units: T[],
  team: TeamId,
  squadSize: number,
): { units: T[]; removed: T[] } {
  const size = clampSquadSize(squadSize);
  const kept: T[] = [];
  const removed: T[] = [];
  let count = 0;
  for (const unit of units) {
    if (unit.team !== team) {
      kept.push(unit);
      continue;
    }
    if (count < size) {
      kept.push(unit);
      count += 1;
    } else {
      removed.push(unit);
    }
  }
  return { units: kept, removed };
}

export function trimAllTeamsToSquadSize<T extends DeployUnit>(
  units: T[],
  squadSize: number,
): { units: T[]; removed: T[] } {
  const player = trimTeamToSquadSize(units, 'player', squadSize);
  const enemy = trimTeamToSquadSize(player.units, 'enemy', squadSize);
  return { units: enemy.units, removed: [...player.removed, ...enemy.removed] };
}

export function evaluateDeployClick(opts: {
  x: number;
  y: number;
  team: TeamId;
  selectedClass: boolean;
  units: DeployUnit[];
  cellType?: CellType;
  gameMode: GameMode;
  squadSize: number;
  userId?: string;
  isHost?: boolean;
  myTeam?: TeamId;
  isOnline?: boolean;
  gridSize?: number;
}): DeployDecision {
  const gridSize = opts.gridSize ?? GRID_SIZE;
  if (!inBounds(opts.x, opts.y, gridSize)) {
    return { ok: false, reason: 'out_of_bounds', message: DEPLOY_MESSAGES.out_of_bounds };
  }
  if (opts.isOnline && opts.myTeam && opts.team !== opts.myTeam) {
    return { ok: false, reason: 'wrong_team', message: DEPLOY_MESSAGES.wrong_team };
  }
  if (opts.cellType && opts.cellType !== 'floor') {
    return { ok: false, reason: 'not_floor', message: DEPLOY_MESSAGES.not_floor };
  }
  const existing = opts.units.find(u => u.x === opts.x && u.y === opts.y);
  if (existing) {
    if (existing.team !== opts.team) {
      return { ok: false, reason: 'occupied_enemy', message: DEPLOY_MESSAGES.occupied_enemy };
    }
    if (opts.isOnline && opts.myTeam && existing.team !== opts.myTeam) {
      return { ok: false, reason: 'wrong_team', message: DEPLOY_MESSAGES.wrong_team };
    }
    if (opts.gameMode === 'online_coop' && opts.userId && existing.ownerId && existing.ownerId !== opts.userId) {
      return { ok: false, reason: 'wrong_team', message: 'You can only recall units you placed.' };
    }
    return { ok: true, action: 'recall' };
  }
  if (!isInDeployZone(opts.team, opts.y)) {
    return { ok: false, reason: 'wrong_zone', message: DEPLOY_MESSAGES.wrong_zone };
  }
  if (!opts.selectedClass) {
    return { ok: false, message: 'Pick a class first, then tap a highlighted tile.' };
  }
  const total = teamCount(opts.units, opts.team);
  const size = clampSquadSize(opts.squadSize);
  if (total >= size) {
    return { ok: false, reason: 'squad_full', message: DEPLOY_MESSAGES.squad_full, allowedCount: size };
  }
  if (opts.gameMode === 'online_coop') {
    if (!opts.userId) {
      return { ok: false, reason: 'no_auth', message: DEPLOY_MESSAGES.no_auth };
    }
    const allowed = coopAllotment(size, !!opts.isHost);
    const mine = ownerCount(opts.units.filter(u => u.team === opts.team), opts.userId);
    if (mine >= allowed) {
      return { ok: false, reason: 'coop_cap', message: DEPLOY_MESSAGES.coop_cap, allowedCount: allowed };
    }
  }
  return { ok: true, action: 'place', allowedCount: size };
}
