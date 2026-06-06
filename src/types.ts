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
}

export interface GridCell {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'crate';
}

export type GridMap = GridCell[][];


