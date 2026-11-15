import { describe, expect, it } from 'vitest';
import {
  canStartBattle,
  clampSquadSize,
  coopAllotment,
  evaluateDeployClick,
  isInDeployZone,
  nextLocalP2pTeam,
  trimAllTeamsToSquadSize,
  type DeployUnit,
} from './deployRules';

const u = (partial: Partial<DeployUnit> & { id: string; team: 'player' | 'enemy' }): DeployUnit => ({
  x: 0, y: 8, ...partial,
});

describe('clampSquadSize', () => {
  it('clamps to 1–8 and defaults non-numbers to 4', () => {
    expect(clampSquadSize(0)).toBe(1);
    expect(clampSquadSize(9)).toBe(8);
    expect(clampSquadSize(4.7)).toBe(4);
    expect(clampSquadSize(Number.NaN)).toBe(4);
  });
});

describe('zones', () => {
  it('lets blue place on rows 8-14 and purple on 0-6', () => {
    expect(isInDeployZone('player', 8)).toBe(true);
    expect(isInDeployZone('player', 7)).toBe(false);
    expect(isInDeployZone('enemy', 6)).toBe(true);
    expect(isInDeployZone('enemy', 7)).toBe(false);
  });
});

describe('evaluateDeployClick', () => {
  const base = {
    x: 3, y: 12, team: 'player' as const, selectedClass: true, units: [] as DeployUnit[],
    cellType: 'floor', gameMode: 'local_ai' as const, squadSize: 4,
  };

  it('places on an empty floor tile in zone', () => {
    expect(evaluateDeployClick(base).action).toBe('place');
  });

  it('rejects walls and the midfield', () => {
    expect(evaluateDeployClick({ ...base, cellType: 'wall' }).reason).toBe('not_floor');
    expect(evaluateDeployClick({ ...base, y: 7 }).reason).toBe('wrong_zone');
  });

  it('recalls a friendly unit on the same tile', () => {
    const units = [u({ id: 'a', team: 'player', x: 3, y: 12 })];
    expect(evaluateDeployClick({ ...base, units }).action).toBe('recall');
  });

  it('blocks a fifth unit when the cap is 4', () => {
    const units = [0, 1, 2, 3].map(i => u({ id: String(i), team: 'player', x: i, y: 12 }));
    const d = evaluateDeployClick({ ...base, x: 4, units });
    expect(d.ok).toBe(false);
    expect(d.reason).toBe('squad_full');
  });

  it('allows placing again after a recall drops the count', () => {
    const afterRecall = [0, 1, 2].map(i => u({ id: String(i), team: 'player', x: i, y: 12 }));
    expect(evaluateDeployClick({ ...base, x: 4, units: afterRecall }).action).toBe('place');
  });

  it('enforces coop allotment (host 2 of 3, guest 1 of 3)', () => {
    expect(coopAllotment(3, true)).toBe(2);
    expect(coopAllotment(3, false)).toBe(1);
    const hostUnits = [
      u({ id: 'h1', team: 'player', x: 0, y: 12, ownerId: 'host' }),
      u({ id: 'h2', team: 'player', x: 1, y: 12, ownerId: 'host' }),
    ];
    const d = evaluateDeployClick({
      ...base, x: 2, units: hostUnits, gameMode: 'online_coop', squadSize: 3,
      userId: 'host', isHost: true, myTeam: 'player', isOnline: true,
    });
    expect(d.reason).toBe('coop_cap');
  });

  it('stops online players from deploying on the other team', () => {
    const d = evaluateDeployClick({
      ...base, team: 'enemy', y: 2, isOnline: true, myTeam: 'player', gameMode: 'online',
    });
    expect(d.reason).toBe('wrong_team');
  });
});

describe('trim and start', () => {
  it('trims overflow when squad size shrinks from 4 to 2', () => {
    const units = [0, 1, 2, 3].map(i => u({ id: 'p' + i, team: 'player', x: i, y: 12 }))
      .concat([0, 1].map(i => u({ id: 'e' + i, team: 'enemy', x: i, y: 1 })));
    const { units: next, removed } = trimAllTeamsToSquadSize(units, 2);
    expect(next.filter(x => x.team === 'player')).toHaveLength(2);
    expect(next.filter(x => x.team === 'enemy')).toHaveLength(2);
    expect(removed.map(r => r.id)).toEqual(['p2', 'p3']);
  });

  it('canStartBattle requires both sides in p2p/online and only blue in AI/coop', () => {
    expect(canStartBattle({ gameMode: 'local_ai', squadSize: 4, playerCount: 4, enemyCount: 0 })).toBe(true);
    expect(canStartBattle({ gameMode: 'local_p2p', squadSize: 4, playerCount: 4, enemyCount: 3 })).toBe(false);
    expect(canStartBattle({ gameMode: 'local_p2p', squadSize: 2, playerCount: 2, enemyCount: 2 })).toBe(true);
    expect(canStartBattle({ gameMode: 'online', squadSize: 4, playerCount: 4, enemyCount: 4 })).toBe(true);
    expect(canStartBattle({ gameMode: 'online_coop', squadSize: 4, playerCount: 4, enemyCount: 0 })).toBe(true);
  });
});

describe('pass-and-play team handoff', () => {
  it('hands over to purple once blue is full, and back to blue if a blue unit is recalled', () => {
    const fullBlue = [0, 1].map(i => u({ id: 'p' + i, team: 'player', x: i, y: 12 }));
    expect(nextLocalP2pTeam(fullBlue, 'player', 2)).toBe('enemy');
    const afterRecall = [fullBlue[0]];
    expect(nextLocalP2pTeam(afterRecall, 'enemy', 2, 'player')).toBe('player');
  });
});
