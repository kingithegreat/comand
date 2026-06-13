export interface PlayerProgression {
  elo: number;
  credits: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  unlockedThemes: string[];
  activeTheme: string;
  dailyChallenges: DailyChallenge[];
  dailyChallengeDate: string;
  seasonXP: number;
  seasonLevel: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'win' | 'kill' | 'deploy_class' | 'survive' | 'damage' | 'heal' | 'ability';
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
}

export interface BoardTheme {
  id: string;
  name: string;
  price: number;
  preview: string;
  floor: string;
  wall: string;
  crate: string;
  accent: string;
  unlocked?: boolean;
}

export interface SeasonReward {
  level: number;
  xpRequired: number;
  reward: { type: 'credits' | 'theme' | 'title'; value: string | number };
  claimed: boolean;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'default',
    name: 'Standard Ops',
    price: 0,
    preview: 'Classic dark military grid',
    floor: 'bg-zinc-900/60',
    wall: 'bg-zinc-700',
    crate: 'bg-amber-900/60',
    accent: 'border-zinc-700/40',
  },
  {
    id: 'arctic',
    name: 'Arctic Outpost',
    price: 500,
    preview: 'Frozen tundra with ice walls',
    floor: 'bg-slate-800/60',
    wall: 'bg-cyan-800/80',
    crate: 'bg-slate-600/60',
    accent: 'border-cyan-600/40',
  },
  {
    id: 'volcanic',
    name: 'Volcanic Rift',
    price: 750,
    preview: 'Molten lava and obsidian terrain',
    floor: 'bg-stone-900/60',
    wall: 'bg-red-950/80',
    crate: 'bg-orange-900/60',
    accent: 'border-red-700/40',
  },
  {
    id: 'neon',
    name: 'Neon District',
    price: 1000,
    preview: 'Cyberpunk cityscape grid',
    floor: 'bg-violet-950/60',
    wall: 'bg-fuchsia-900/80',
    crate: 'bg-purple-800/60',
    accent: 'border-fuchsia-500/40',
  },
  {
    id: 'desert',
    name: 'Sandstorm',
    price: 500,
    preview: 'Arid desert with sandstone cover',
    floor: 'bg-yellow-950/60',
    wall: 'bg-amber-800/80',
    crate: 'bg-yellow-800/60',
    accent: 'border-amber-600/40',
  },
  {
    id: 'jungle',
    name: 'Deep Canopy',
    price: 750,
    preview: 'Dense tropical jungle warfare',
    floor: 'bg-emerald-950/60',
    wall: 'bg-green-900/80',
    crate: 'bg-lime-900/60',
    accent: 'border-emerald-600/40',
  },
];

export const SEASON_REWARDS: SeasonReward[] = [
  { level: 1, xpRequired: 0, reward: { type: 'credits', value: 100 }, claimed: false },
  { level: 2, xpRequired: 200, reward: { type: 'credits', value: 150 }, claimed: false },
  { level: 3, xpRequired: 500, reward: { type: 'title', value: 'Recruit' }, claimed: false },
  { level: 4, xpRequired: 900, reward: { type: 'credits', value: 200 }, claimed: false },
  { level: 5, xpRequired: 1400, reward: { type: 'theme', value: 'arctic' }, claimed: false },
  { level: 6, xpRequired: 2000, reward: { type: 'credits', value: 250 }, claimed: false },
  { level: 7, xpRequired: 2700, reward: { type: 'title', value: 'Veteran' }, claimed: false },
  { level: 8, xpRequired: 3500, reward: { type: 'credits', value: 300 }, claimed: false },
  { level: 9, xpRequired: 4500, reward: { type: 'theme', value: 'volcanic' }, claimed: false },
  { level: 10, xpRequired: 5600, reward: { type: 'credits', value: 500 }, claimed: false },
  { level: 11, xpRequired: 6800, reward: { type: 'title', value: 'Commander' }, claimed: false },
  { level: 12, xpRequired: 8200, reward: { type: 'theme', value: 'neon' }, claimed: false },
  { level: 13, xpRequired: 9800, reward: { type: 'credits', value: 750 }, claimed: false },
  { level: 14, xpRequired: 11600, reward: { type: 'title', value: 'Warlord' }, claimed: false },
  { level: 15, xpRequired: 13600, reward: { type: 'credits', value: 1000 }, claimed: false },
];

const CHALLENGE_POOL: Omit<DailyChallenge, 'id' | 'progress' | 'completed'>[] = [
  { title: 'First Blood', description: 'Win 1 match', type: 'win', target: 1, reward: 100 },
  { title: 'Double Down', description: 'Win 2 matches', type: 'win', target: 2, reward: 200 },
  { title: 'Marksman', description: 'Eliminate 5 enemy units', type: 'kill', target: 5, reward: 150 },
  { title: 'Massacre', description: 'Eliminate 10 enemy units', type: 'kill', target: 10, reward: 250 },
  { title: 'Squad Builder', description: 'Deploy 3 units in a match', type: 'deploy_class', target: 3, reward: 75 },
  { title: 'Full Roster', description: 'Deploy 4 units in a match', type: 'deploy_class', target: 4, reward: 100 },
  { title: 'Medic!', description: 'Heal 100 total HP', type: 'heal', target: 100, reward: 150 },
  { title: 'Iron Will', description: 'Win with all units alive', type: 'survive', target: 1, reward: 300 },
  { title: 'Destructive Force', description: 'Deal 200 total damage', type: 'damage', target: 200, reward: 150 },
  { title: 'Ability Master', description: 'Use 5 abilities', type: 'ability', target: 5, reward: 125 },
  { title: 'Scorched Earth', description: 'Deal 500 total damage', type: 'damage', target: 500, reward: 300 },
  { title: 'Field Surgeon', description: 'Heal 300 total HP', type: 'heal', target: 300, reward: 250 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function getDailyChallenges(dateString: string): Omit<DailyChallenge, 'progress' | 'completed'>[] {
  const seed = dateString.split('-').reduce((acc, n) => acc * 31 + parseInt(n), 0);
  const rng = seededRandom(seed);

  const shuffled = [...CHALLENGE_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map((c, i) => ({
    ...c,
    id: `${dateString}-${i}`,
  }));
}

export function calculateEloChange(playerElo: number, opponentElo: number, won: boolean): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actual = won ? 1 : 0;
  return Math.round(K * (actual - expected));
}

export function getEloRank(elo: number): { name: string; color: string; minElo: number } {
  if (elo >= 2000) return { name: 'Legend', color: 'text-amber-400', minElo: 2000 };
  if (elo >= 1800) return { name: 'Diamond', color: 'text-cyan-300', minElo: 1800 };
  if (elo >= 1600) return { name: 'Platinum', color: 'text-sky-400', minElo: 1600 };
  if (elo >= 1400) return { name: 'Gold', color: 'text-yellow-400', minElo: 1400 };
  if (elo >= 1200) return { name: 'Silver', color: 'text-zinc-300', minElo: 1200 };
  if (elo >= 1000) return { name: 'Bronze', color: 'text-orange-400', minElo: 1000 };
  return { name: 'Recruit', color: 'text-zinc-500', minElo: 0 };
}

export function getMatchRewards(won: boolean, survivalRate: number, turn: number): { credits: number; seasonXP: number } {
  let credits = won ? 50 : 15;
  let seasonXP = won ? 100 : 30;

  if (survivalRate >= 1) { credits += 20; seasonXP += 30; }
  else if (survivalRate >= 0.5) { credits += 10; seasonXP += 15; }

  if (won && turn <= 8) { credits += 15; seasonXP += 25; }

  return { credits, seasonXP };
}

export function getDefaultProgression(): PlayerProgression {
  return {
    elo: 1000,
    credits: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    unlockedThemes: ['default'],
    activeTheme: 'default',
    dailyChallenges: [],
    dailyChallengeDate: '',
    seasonXP: 0,
    seasonLevel: 1,
  };
}
