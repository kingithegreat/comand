import { GridCell, Unit } from "./types";

// Manhattan Distance (basic) but BFS is better for avoiding obstacles
export const getReachableTiles = (
  unit: Unit,
  map: GridCell[][],
  units: Unit[]
) => {
  const tiles: { x: number; y: number; apCost: number }[] = [];
  if (unit.ap <= 0) return tiles;

  const gridHeight = map.length;
  const gridWidth = map[0]?.length ?? 0;
  const mobility = unit.class.stats.mobility;

  // BFS
  const queue: { x: number; y: number; dist: number }[] = [];
  const visited = new Set<string>();

  queue.push({ x: unit.x, y: unit.y, dist: 0 });
  visited.add(`${unit.x},${unit.y}`);

  while (queue.length > 0) {
    const { x, y, dist } = queue.shift()!;

    if (dist > 0 && dist <= mobility * 2) {
      const isOccupied = units.some((u) => u.x === x && u.y === y && u.hp > 0);
      if (!isOccupied) {
        const apCost = dist <= mobility ? 1 : 2;
        if (apCost <= unit.ap) {
          tiles.push({ x, y, apCost });
        }
      }
    }

    if (dist < mobility * 2) {
      const neighbors = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && ny >= 0 && nx < gridWidth && ny < gridHeight) {
          const key = `${nx},${ny}`;
          // Check if wall
          const tileType = map[ny][nx].type;
          const isBlockedByEnemy = units.some(u => u.x === nx && u.y === ny && u.hp > 0 && u.team !== unit.team);
          if (!visited.has(key) && tileType !== "wall" && tileType !== "crate" && tileType !== "barrel" && !isBlockedByEnemy) {
            visited.add(key);
            queue.push({ x: nx, y: ny, dist: dist + 1 });
          }
        }
      }
    }
  }

  return tiles;
};

export type CoverLevel = 'none' | 'half' | 'full';

export const calculateHitChance = (
  attacker: Unit,
  target: { x: number; y: number },
  map: GridCell[][]
): { chance: number, isCovered: boolean, coverLevel: CoverLevel, damageReduction: number } => {
  let baseAccuracy = attacker.class.stats.accuracy || 85;
  const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);

  const halfRange = Math.max(1, Math.floor(attacker.class.stats.range / 2));
  let distPenalty = 0;
  if (dist > halfRange) {
    distPenalty = (dist - halfRange) * 3;
  }

  let coverLevel: CoverLevel = 'none';
  let coverPenalty = 0;
  let damageReduction = 0;

  const neighbors = [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
  ];

  for (const n of neighbors) {
    const nx = target.x + n.dx;
    const ny = target.y + n.dy;
    if (nx >= 0 && ny >= 0 && nx < (map[0]?.length ?? 0) && ny < map.length) {
      const tileType = map[ny][nx].type;
      const distAttackerToCover = Math.abs(attacker.x - nx) + Math.abs(attacker.y - ny);
      if (distAttackerToCover >= dist) continue;

      if (tileType === 'wall' && coverLevel !== 'full') {
        coverLevel = 'full';
        coverPenalty = 35;
        damageReduction = 0.25;
      } else if ((tileType === 'crate' || tileType === 'barrel') && coverLevel === 'none') {
        coverLevel = 'half';
        coverPenalty = 20;
        damageReduction = 0;
      }
    }
  }

  const isCovered = coverLevel !== 'none';
  let finalChance = baseAccuracy - distPenalty - coverPenalty;

  if (dist <= 2) {
    finalChance = 100;
  } else {
    finalChance = Math.max(30, Math.min(100, finalChance));
  }

  return { chance: finalChance, isCovered, coverLevel, damageReduction };
};

export const getUnitCoverLevel = (
  unit: { x: number; y: number },
  map: GridCell[][]
): CoverLevel => {
  const neighbors = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
  ];
  let best: CoverLevel = 'none';
  for (const n of neighbors) {
    const nx = unit.x + n.dx;
    const ny = unit.y + n.dy;
    if (nx >= 0 && ny >= 0 && nx < map[0]?.length && ny < map.length) {
      const t = map[ny][nx].type;
      if (t === 'wall') return 'full';
      if (t === 'crate' || t === 'barrel') best = 'half';
    }
  }
  return best;
};

export const countWallsPenetrated = (
  x1: number, y1: number, x2: number, y2: number, map: GridCell[][]
): number => {
  let dx = Math.abs(x2 - x1);
  let dy = -Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let count = 0;
  let cx = x1, cy = y1;
  while (true) {
    if (cx === x2 && cy === y2) break;
    if (cx !== x1 || cy !== y1) {
      if (cy < 0 || cy >= map.length || cx < 0 || cx >= (map[0]?.length ?? 0)) return count;
      if (map[cy][cx].type === 'wall') count++;
    }
    let e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
  return count;
};

export const checkLineOfSight = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  map: GridCell[][],
  wallPenetration: number = 0
): boolean => {
  let dx = Math.abs(x2 - x1);
  let dy = -Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let wallsPenetrated = 0;

  let cx = x1;
  let cy = y1;

  while (true) {
    if (cx === x2 && cy === y2) break;

    if (cx !== x1 || cy !== y1) {
       if (cy < 0 || cy >= map.length || cx < 0 || cx >= (map[0]?.length ?? 0)) {
          return false;
       }
       const tileType = map[cy][cx].type;
       if (tileType === "wall") {
          wallsPenetrated++;
          if (wallsPenetrated > wallPenetration) return false;
       }
       if (cx !== x2 || cy !== y2) {
         if (tileType === "crate" || tileType === "barrel") {
            return false;
         }
       }
    }

    let e2 = 2 * err;
    const stepX = e2 >= dy;
    const stepY = e2 <= dx;
    if (stepX && stepY) {
      const t1 = map[cy]?.[cx + sx]?.type;
      const t2 = map[cy + sy]?.[cx]?.type;
      const isBlocking = (t: string | undefined) => t === 'wall' || t === 'crate' || t === 'barrel';
      if (isBlocking(t1) && isBlocking(t2)) {
        const wallCount = (t1 === 'wall' ? 1 : 0) + (t2 === 'wall' ? 1 : 0);
        if (wallsPenetrated + wallCount > wallPenetration) return false;
        wallsPenetrated += wallCount;
      }
    }
    if (stepX) {
      err += dy;
      cx += sx;
    }
    if (stepY) {
      err += dx;
      cy += sy;
    }
  }

  return true;
};

export const getCharacterLevelInfo = (xp: number = 0) => {
  const levels = [
    { level: 1, reqXp: 0 },
    { level: 2, reqXp: 100 },
    { level: 3, reqXp: 250 },
    { level: 4, reqXp: 500 },
    { level: 5, reqXp: 900 },
  ];
  
  let currentLevel = 1;
  let nextLevelXp = 100;
  let prevLevelXp = 0;
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].reqXp) {
      currentLevel = levels[i].level;
      prevLevelXp = levels[i].reqXp;
      nextLevelXp = i < levels.length - 1 ? levels[i+1].reqXp : levels[i].reqXp;
      break;
    }
  }
  
  const isMaxLevel = currentLevel === 5;
  const xpInCurrentLevel = xp - prevLevelXp;
  const xpNeededForNextLevel = nextLevelXp - prevLevelXp;
  // If isMaxLevel, percentage is 100
  const percentage = isMaxLevel ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
  
  return {
    level: currentLevel,
    xp,
    nextLevelXp,
    prevLevelXp,
    percentage,
    isMaxLevel,
    maxUpgrades: currentLevel - 1
  };
};

export const getBoostedStats = (baseStats: { maxHP: number; damage: number; range: number; mobility: number; accuracy: number }, boosts: string[] = []) => {
  const stats = { ...baseStats };
  if (boosts.includes('HP_BOOST')) stats.maxHP += 15;
  if (boosts.includes('DMG_BOOST')) stats.damage += 4;
  if (boosts.includes('RANGE_BOOST')) stats.range += 1;
  if (boosts.includes('ACC_BOOST')) stats.accuracy += 10;
  return stats;
};

