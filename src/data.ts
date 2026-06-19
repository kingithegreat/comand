import { CharacterClass } from "./types";

export const CLASSES: CharacterClass[] = [
  {
    className: "Sniper",
    archetype: "Long Range",
    description: "Long-range precision marksman clad in a shadow cloak. Excels at picking off high-value targets.",
    stats: { maxHP: 70, damage: 38, range: 10, mobility: 3, accuracy: 88 },
    personality: 'Cautious',
    ability: {
      name: "Piercing Round",
      description: "Fires an armor-piercing shot that ignores cover, dealing 45 damage (1 AP).",
      apCost: 1,
      range: 10,
      type: "offensive"
    }
  },
  {
    className: "Demoman",
    archetype: "Explosives",
    description: "Heavy demolitionist with blast gear and launcher backpack. Deals splash damage in a broad area. Explosives ignore cover.",
    stats: { maxHP: 120, damage: 38, range: 6, mobility: 4, accuracy: 88 },
    personality: 'Aggressive',
    ability: {
      name: "Frag Grenade",
      description: "Throws an explosive bundle dealing 40 damage in a 3x3 splash grid (1 AP).",
      apCost: 1,
      range: 6,
      type: "offensive"
    }
  },
  {
    className: "Assault",
    archetype: "Assault",
    description: "Versatile frontline military trooper with standard combat gear and high tactical adaptability.",
    stats: { maxHP: 100, damage: 30, range: 6, mobility: 5, accuracy: 85 },
    personality: 'Tactical',
    ability: {
      name: "Tactical Flush",
      description: "Fires a suppressing round that inflicts 25 damage and drains 1 AP (1 AP).",
      apCost: 1,
      range: 5,
      type: "offensive"
    }
  },
  {
    className: "Heavy",
    archetype: "Assault",
    description: "Thickly armored squad juggernaut with massive protective plate casing. Passive: Takes reduced damage from Assassin strikes (requires 2 hits to kill).",
    stats: { maxHP: 155, damage: 35, range: 4, mobility: 3, accuracy: 80 },
    personality: 'Aggressive',
    ability: {
      name: "Shield Recharge",
      description: "Activates tactical defensive field: repairs self for 50 HP (1 AP).",
      apCost: 1,
      type: "self"
    }
  },
  {
    className: "Medic",
    archetype: "Support",
    description: "Field support unit equipped with surgical headboards, sub-visor scanner arrays, and nanite heals.",
    stats: { maxHP: 85, damage: 20, range: 5, mobility: 5, accuracy: 85 },
    personality: 'Support',
    ability: {
      name: "First Aid Kit",
      description: "Injects healing nanites: restores 55 HP to an ally within 3 tiles (1 AP).",
      apCost: 1,
      range: 3,
      type: "heal"
    }
  },
  {
    className: "Scout",
    archetype: "Short Range",
    description: "Sleek reconnaissance agent with glowing cyan visors. Excels at high-speed scouting and flanking. Passive: Visor detects Assassins in Smog up to 4 tiles away.",
    stats: { maxHP: 75, damage: 20, range: 5, mobility: 7, accuracy: 90 },
    personality: 'Aggressive',
    ability: {
      name: "Adrenaline Sprint",
      description: "Unleash extreme physical output: heals self for 20 HP and grants +1 AP back (1 AP).",
      apCost: 1,
      type: "self"
    }
  },
  {
    className: "Technician",
    archetype: "Support",
    description: "Equipped with smart goggles and triple horizontal visor arrays. Constructs localized protection covers.",
    stats: { maxHP: 110, damage: 25, range: 6, mobility: 4, accuracy: 85 },
    personality: 'Tactical',
    ability: {
      name: "Deploy Cover",
      description: "Constructs a solid protective cargo shielding crate on an adjacent floor tile (1 AP).",
      apCost: 1,
      range: 1,
      type: "deploy"
    }
  },
  {
    className: "Support",
    archetype: "Support",
    description: "Fires rapid automated suppression bursts to secure key lanes and lock down enemy flanking routes.",
    stats: { maxHP: 125, damage: 25, range: 8, mobility: 4, accuracy: 85 },
    personality: 'Support',
    ability: {
      name: "Disruptor Matrix",
      description: "Emits static fields: damages enemy within 5 range for 20 and drains 1 AP (1 AP).",
      apCost: 1,
      range: 5,
      type: "offensive"
    }
  },
  {
    className: "Shotgunner",
    archetype: "Short Range",
    description: "Fringe close-combat breacher. Deals brutal kinetic damage with close-quarters shotgun fire.",
    stats: { maxHP: 95, damage: 55, range: 3, mobility: 6, accuracy: 95 },
    personality: 'Tactical',
    ability: {
      name: "Reflex Shield",
      description: "Engages reflex screens and reloads shotgun: restores 35 HP (1 AP).",
      apCost: 1,
      type: "self"
    }
  },
  {
    className: "Flamethrower",
    archetype: "Support",
    description: "Equipped with heavy fuel tanks. Releases devastating, high-temperature close-range fire.",
    stats: { maxHP: 135, damage: 70, range: 2, mobility: 5, accuracy: 100 },
    personality: 'Support',
    ability: {
      name: "Inferno Jet",
      description: "Unleashes a rolling torrent of napalm fire at close range, dealing 85 damage (1 AP).",
      apCost: 1,
      range: 2,
      type: "offensive"
    }
  },
  {
    className: "Assassin",
    archetype: "Short Range",
    description: "Ghost operative. Specializes in 1-shot melee takedowns. Passive: Remains invisible in Smog beyond 1 tile range (except to Scouts).",
    stats: { maxHP: 60, damage: 200, range: 1, mobility: 6, accuracy: 100 },
    personality: 'Aggressive',
    ability: {
      name: "Shadow Strike",
      description: "Lethal 1-shot melee stab. Deals 250 damage (reduced against Heavys). (1 AP).",
      apCost: 1,
      range: 1,
      type: "offensive"
    }
  },
];
