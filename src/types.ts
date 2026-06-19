export interface CharacterStats {
  maxHP: number;
  damage: number;
  range: number;
  mobility: number; // Replaces movementAPCost for range-based logic
  accuracy: number; // Base hit chance percentage
}

export type Archetype = 'Short Range' | 'Long Range' | 'Support' | 'Explosives' | 'Assault';

export type Personality = 'Aggressive' | 'Cautious' | 'Tactical' | 'Support';

export interface CharacterAbility {
  name: string;
  description: string;
  apCost: number;
  range?: number;
  type: 'heal' | 'buff' | 'offensive' | 'deploy' | 'self';
}

export interface CharacterClass {
  className: string;
  archetype: Archetype;
  stats: CharacterStats;
  description: string;
  personality?: Personality;
  ability?: CharacterAbility;
  secondAbility?: { name: string; description: string };
}

export interface StatusEffect {
  type: 'burning' | 'poisoned' | 'stunned';
  duration: number;
}

export interface Unit {
  id: string;
  class: CharacterClass;
  x: number;
  y: number;
  hp: number;
  ap: number;
  team: 'player' | 'enemy';
  facing?: 'up' | 'down' | 'left' | 'right';
  pose?: 'idle' | 'aim' | 'firing';
  name?: string;
  ownerId?: string;
  kills?: number;
  damageDealt?: number;
  damageTaken?: number;
  healingDone?: number;
  abilitiesUsed?: number;
  apPenalty?: number;
  statusEffects?: StatusEffect[];
  fortified?: boolean;
  invisible?: boolean;
  invisibleTurns?: number;
  markedForDeath?: boolean;
  abilityDisabled?: number;
}

export interface GridCell {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'crate' | 'fire' | 'poison' | 'barrel';
}

export type GridMap = GridCell[][];

export interface TurnSnapshot {
  turn: number;
  activeTeam: 'player' | 'enemy';
  units: Unit[];
  logs: any[];
}



