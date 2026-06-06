import { GridCell, Unit } from "./types";

// Manhattan Distance (basic) but BFS is better for avoiding obstacles
export const getReachableTiles = (
  unit: Unit,
  map: GridCell[][],
  units: Unit[]
) => {
  const tiles: { x: number; y: number; apCost: number }[] = [];
  if (unit.ap <= 0) return tiles;

  const gridSize = map.length;
  const mobility = unit.class.stats.mobility;

  // BFS
  const queue: { x: number; y: number; dist: number }[] = [];
  const visited = new Set<string>();

  queue.push({ x: unit.x, y: unit.y, dist: 0 });
  visited.add(`${unit.x},${unit.y}`);

  while (queue.length > 0) {
    const { x, y, dist } = queue.shift()!;

    if (dist > 0 && dist <= mobility * 2) {
      const isOccupied = units.some((u) => u.x === x && u.y === y);
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

        if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize) {
          const key = `${nx},${ny}`;
          // Check if wall
          if (!visited.has(key) && map[ny][nx].type !== "wall" && map[ny][nx].type !== "crate") {
            // Also need to allow passing through friends, but here it's simplified.
            visited.add(key);
            queue.push({ x: nx, y: ny, dist: dist + 1 });
          }
        }
      }
    }
  }

  return tiles;
};

export const calculateHitChance = (
  attacker: Unit,
  target: { x: number; y: number },
  map: GridCell[][]
): { chance: number, isCovered: boolean } => {
  let baseAccuracy = attacker.class.stats.accuracy || 85;
  const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  
  // Distance penalty: -3% per tile beyond half range for better gameplay feel
  const halfRange = Math.max(1, Math.floor(attacker.class.stats.range / 2));
  let distPenalty = 0;
  if (dist > halfRange) {
    distPenalty = (dist - halfRange) * 3;
  }

  // Cover penalty: check if there's a crate adjacent to the target that is between attacker and target
  let isCovered = false;
  let coverPenalty = 0;
  
  const neighbors = [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
  ];

  for (const n of neighbors) {
    const nx = target.x + n.dx;
    const ny = target.y + n.dy;
    if (nx >= 0 && ny >= 0 && nx < map[0].length && ny < map.length) {
      if (map[ny][nx].type === 'crate') {
        // Is this crate between attacker and target?
        const distAttackerToCrate = Math.abs(attacker.x - nx) + Math.abs(attacker.y - ny);
        if (distAttackerToCrate < dist) {
          isCovered = true;
          coverPenalty = 20; // Reduced from 25 to 20 for a fairer low cover experience
          break;
        }
      }
    }
  }

  let finalChance = baseAccuracy - distPenalty - coverPenalty;
  
  // Minimum hit chance of 30% ensures interesting underdog mechanics rather than extreme 0% misses
  finalChance = Math.max(30, Math.min(100, finalChance));

  return { chance: finalChance, isCovered };
};

export const checkLineOfSight = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  map: GridCell[][]
): boolean => {
  let dx = Math.abs(x2 - x1);
  let dy = -Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;

  let cx = x1;
  let cy = y1;

  while (true) {
    if (cx === x2 && cy === y2) break;
    
    // Ignore origin
    if (cx !== x1 || cy !== y1) {
       if (map[cy][cx].type === "wall") { // Hard cover blocks LOS completely here
          return false;
       }
    }

    let e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      cx += sx;
    }
    if (e2 <= dx) {
      err += dx;
      cy += sy;
    }
  }

  return true;
};
