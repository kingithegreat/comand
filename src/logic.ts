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
