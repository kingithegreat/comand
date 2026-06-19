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
    },
    secondAbility: {
      name: "Dead Eye",
      description: "Mark a target for guaranteed hit on next attack. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Cluster Bomb",
      description: "Launch 3 smaller explosives dealing 25 damage each in separate 1-tile radius areas within range 6. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Flashbang",
      description: "Stun all enemies within 2 tiles of target location for 1 turn, reducing their accuracy by 30%. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Fortify",
      description: "Become immobile for 1 turn but gain 50% damage reduction and taunt nearby enemies. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Revive Stim",
      description: "Revive a fallen ally at the Medic's position with 40% HP. Costs 2 AP."
    }
  },
  {
    className: "Scout",
    archetype: "Short Range",
    description: "Sleek reconnaissance agent with glowing cyan visors. Excels at high-speed scouting and flanking. Passive: Visor detects Assassins in Smog up to 4 tiles away.",
    stats: { maxHP: 75, damage: 25, range: 5, mobility: 7, accuracy: 90 },
    personality: 'Aggressive',
    ability: {
      name: "Adrenaline Sprint",
      description: "Unleash extreme physical output: heals self for 20 HP and grants +1 AP back (1 AP).",
      apCost: 1,
      type: "self"
    },
    secondAbility: {
      name: "Smoke Bomb",
      description: "Deploy smoke in a 2-tile radius, blocking line of sight through the area for 2 turns. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Turret Deploy",
      description: "Place an automated turret on an adjacent tile that deals 15 damage to the nearest enemy each turn. Costs 1 AP."
    }
  },
  {
    className: "Support",
    archetype: "Support",
    description: "Fires rapid automated suppression bursts to secure key lanes and lock down enemy flanking routes.",
    stats: { maxHP: 120, damage: 25, range: 6, mobility: 4, accuracy: 85 },
    personality: 'Support',
    ability: {
      name: "Disruptor Matrix",
      description: "Emits static fields: damages enemy within 5 range for 20 and drains 1 AP (1 AP).",
      apCost: 1,
      range: 5,
      type: "offensive"
    },
    secondAbility: {
      name: "Rally Cry",
      description: "All friendly units within 4 tiles gain +1 AP this turn. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Breaching Round",
      description: "Destroy all crates and barrels in a 2-tile radius of target, dealing 40 damage to enemies caught in the blast. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Napalm Strike",
      description: "Set a 3x3 area on fire, converting floor tiles to fire tiles for 3 turns. Costs 1 AP."
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
    },
    secondAbility: {
      name: "Vanish",
      description: "Become invisible for 2 turns. While invisible, next attack deals double damage. Costs 1 AP."
    }
  },
  {
    className: "Phantom",
    archetype: "Support",
    description: "EMP warfare specialist with holographic decoy systems. Disrupts enemy electronics and drains action points at range.",
    stats: { maxHP: 90, damage: 22, range: 7, mobility: 5, accuracy: 88 },
    personality: 'Tactical',
    ability: {
      name: "EMP Pulse",
      description: "Emits a localized electromagnetic blast: deals 15 damage and drains 1 AP from all enemies within 3 tiles (1 AP).",
      apCost: 1,
      range: 3,
      type: "offensive"
    },
    secondAbility: {
      name: "System Hack",
      description: "Disable target enemy's ability for 2 turns and reveal their position through smog. Costs 1 AP."
    }
  },
  {
    className: "Vanguard",
    archetype: "Assault",
    description: "Heavily armored frontline breacher with a kinetic shield. Pushes through enemy lines and absorbs punishment.",
    stats: { maxHP: 140, damage: 32, range: 4, mobility: 4, accuracy: 82 },
    personality: 'Aggressive',
    ability: {
      name: "Kinetic Charge",
      description: "Charges forward dealing 45 damage and pushing the target back 1 tile (1 AP).",
      apCost: 1,
      range: 3,
      type: "offensive"
    },
    secondAbility: {
      name: "Earthquake Slam",
      description: "Deal 30 damage and stun all enemies within 2 tiles for 1 turn. Costs 1 AP."
    }
  },
];
