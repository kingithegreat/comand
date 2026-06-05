import React from 'react';

interface UnitSpriteProps {
  className?: string;
  classVal: string; // e.g. 'Scout', 'Sniper', etc.
  team: 'player' | 'enemy';
  facing?: 'up' | 'down' | 'left' | 'right';
  pose?: 'idle' | 'aim' | 'firing';
}

export default function UnitSprite({ 
  className = "w-12 h-12", 
  classVal, 
  team, 
  facing = 'right', 
  pose = 'idle' 
}: UnitSpriteProps) {
  
  const teamColor = team === 'player' ? '#38bdf8' : '#f43f5e'; // Blue / Red lights
  const suitColor = team === 'player' ? '#1e293b' : '#311012'; // Base dark suit
  const plateColor = team === 'player' ? '#475569' : '#5c1d24'; // Armor plates
  const accentLight = team === 'player' ? '#00e1ff' : '#ff003c'; // Neon strip accent

  // Facing 'left' is just 'right' flipped
  const isFlipped = facing === 'left';
  const displayFacing = facing === 'left' ? 'right' : facing;

  const renderSVG = () => {
    // We will generate different SVG shapes depending on the character class, facing direction, and action pose.
    const isFiring = pose === 'firing';

    // Helper for muzzle flash and firing particles based on class weapon
    const getFiringEffect = (muzzleX: number, muzzleY: number, bulletColor: string) => {
      if (!isFiring) return null;
      return (
        <g className="animate-pulse">
          {/* Muzzle flare core */}
          <circle cx={muzzleX} cy={muzzleY} r="8" fill="#ffffff" opacity="0.9" />
          <polygon 
            points={`${muzzleX},${muzzleY-4} ${muzzleX+14},${muzzleY} ${muzzleX},${muzzleY+4} ${muzzleX-4},${muzzleY}`} 
            fill={bulletColor} 
          />
          <circle cx={muzzleX + 4} cy={muzzleY} r="5" fill={bulletColor} />
          
          {/* Sparks */}
          <line x1={muzzleX} y1={muzzleY} x2={muzzleX + 22} y2={muzzleY} stroke="#ffffff" strokeWidth="2.5" />
          <circle cx={muzzleX + 16} cy={muzzleY - 3} r="1.5" fill={bulletColor} />
          <circle cx={muzzleX + 24} cy={muzzleY + 2} r="1" fill="#ffffff" />
          <circle cx={muzzleX + 10} cy={muzzleY + 4} r="1.5" fill={bulletColor} />
        </g>
      );
    };

    switch (classVal) {
      case 'Scout': {
        const visor = "#06b6d4";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Back / Gear */}
              <rect x="18" y="26" width="6" height="18" rx="2" fill="#1b2118" stroke="#2d3527" />
              <circle cx="21" cy="22" r="2.5" fill={accentLight} />
              
              {/* Scout Lean Body Suit */}
              <path d="M22 28 C22 28, 38 28, 38 42 L34 56 L24 56 Z" fill={suitColor} />
              {/* Combat chest rig */}
              <path d="M24 30 L36 30 L34 44 L26 44 Z" fill={plateColor} stroke="#334155" strokeWidth="1" />
              <rect x="27" y="32" width="6" height="3" fill={accentLight} opacity="0.8" />
              
              {/* Slender legs */}
              <rect x="23" y="52" width="4" height="8" rx="1" fill="#0f172a" />
              <rect x="31" y="52" width="4" height="8" rx="1" fill="#0f172a" />
              
              {/* Gun and Arms */}
              <path d="M30 36 L44 36 L42 40 L30 40 Z" fill="#1e293b" /> {/* pulse SMG */}
              <circle cx="44" cy="38" r="1.5" fill="#10b981" /> {/* laser optic */}
              <path d="M26 34 Q34 34, 40 38" stroke={plateColor} strokeWidth="3" strokeLinecap="round" />
              
              {/* Scout Helmet */}
              <path d="M24 24 C24 14, 40 14, 40 24 C40 28, 38 31, 35 32 L27 32 Z" fill="#2c3527" stroke="#3c4936" strokeWidth="1.5" />
              <rect x="30" y="20" width="10" height="4" rx="1.5" fill={visor} className="animate-pulse" />
              
              {/* Spark effects */}
              {getFiringEffect(46, 38, "#00ffff")}
            </svg>
          );
        } else if (displayFacing === 'up') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Full Back view of Scout */}
              <rect x="25" y="52" width="5" height="8" rx="1" fill="#0f172a" />
              <rect x="34" y="52" width="5" height="8" rx="1" fill="#0f172a" />
              
              <path d="M22 28 C22 28, 42 28, 42 45 L38 54 L26 54 Z" fill={suitColor} />
              
              {/* Large tactical recon backpack */}
              <rect x="24" y="30" width="16" height="15" rx="3" fill="#20271b" stroke="#334155" strokeWidth="1.5" />
              <circle cx="28" cy="34" r="2" fill={accentLight} />
              <circle cx="36" cy="34" r="2" fill={accentLight} />
              
              {/* Back of Scout Helmet */}
              <path d="M24 24 C24 14, 40 14, 40 24 L38 31 L26 31 Z" fill="#2c3527" stroke="#3c4936" strokeWidth="1.5" />
              {/* Comms wire */}
              <path d="M38 24 L42 28" stroke="#111" strokeWidth="1.5" />
              <circle cx="42" cy="28" r="1" fill={teamColor} />
            </svg>
          );
        } else { // DOWN
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Front facing Scout */}
              <rect x="24" y="52" width="5" height="8" rx="1" fill="#0f172a" />
              <rect x="35" y="52" width="5" height="8" rx="1" fill="#0f172a" />
              
              <path d="M20 28 C20 28, 44 28, 44 45 L38 54 L26 54 Z" fill={suitColor} />
              {/* Combat harness */}
              <rect x="25" y="32" width="14" height="14" rx="2" fill={plateColor} stroke="#22d3ee" strokeWidth="1" />
              
              <circle cx="28" cy="36" r="1.5" fill={teamColor} />
              <circle cx="36" cy="36" r="1.5" fill={teamColor} />
              
              {/* Weapon strapped to chest */}
              <rect x="28" y="42" width="18" height="4" rx="1" fill="#1b2118" />
              
              {/* Scout Helmet Front */}
              <path d="M22 24 C22 13, 42 13, 42 24 C42 29, 40 31, 38 32 L26 32 C24 31, 22 29, 22 24 Z" fill="#2c3527" stroke="#3c4936" strokeWidth="1.5" />
              <rect x="25" y="20" width="14" height="5" rx="1.5" fill={visor} />
              <rect x="27" y="21" width="10" height="1.5" fill="#fff" opacity="0.7" />
            </svg>
          );
        }
      }

      case 'Assault': {
        const visor = "#ea5a0c";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="16" y="25" width="8" height="20" rx="2" fill="#1a1e16" stroke="#2d3422" />
              
              {/* Torso & legs */}
              <path d="M20 28 C20 28, 39 28, 39 44 L35 56 L23 56 Z" fill={suitColor} />
              <path d="M22 30 L37 30 L35 46 L23 46 Z" fill={plateColor} stroke="#64748b" strokeWidth="1.5" />
              
              <rect x="22" y="54" width="5" height="7" rx="1" fill="#0f172a" />
              <rect x="30" y="54" width="5" height="7" rx="1" fill="#0f172a" />
              
              {/* Gun and arms */}
              <path d="M28 35 L45 35 L43 41 L28 41 Z" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <rect x="32" y="32" width="6" height="3" fill={teamColor} opacity="0.8" />
              <path d="M24 32 Q34 32, 42 36" stroke={plateColor} strokeWidth="3.5" strokeLinecap="round" />
              
              {/* Helmet */}
              <path d="M22 24 C22 13, 40 13, 40 24 L37 31 L25 31 Z" fill="#323c2c" stroke="#44523c" strokeWidth="1.5" />
              <path d="M27 22 L37 22 L35 27 L25 27 Z" fill={visor} />
              <circle cx="24" cy="50" r="2.5" fill={teamColor} />
              
              {getFiringEffect(47, 37, "#fbbf24")}
            </svg>
          );
        } else if (displayFacing === 'up') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="23" y="53" width="6" height="8" rx="1" fill="#0f172a" />
              <rect x="35" y="53" width="6" height="8" rx="1" fill="#0f172a" />
              
              <path d="M20 28 C20 28, 44 28, 44 46 L38 54 L26 54 Z" fill={suitColor} />
              {/* Heavy pack with yellow warning cross */}
              <rect x="22" y="30" width="20" height="16" rx="2" fill="#2d3422" stroke="#44523c" strokeWidth="2" />
              <path d="M28 38 L36 38 M32 34 L32 42" stroke={teamColor} strokeWidth="2" strokeLinecap="round" />
              
              {/* Back of Helmet */}
              <path d="M22 24 C22 13, 42 13, 42 24 L38 31 L26 31 Z" fill="#323c2c" stroke="#44523c" strokeWidth="1.5" />
            </svg>
          );
        } else { // DOWN
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="22" y="53" width="6" height="8" rx="1" fill="#0f172a" />
              <rect x="36" y="53" width="6" height="8" rx="1" fill="#0f172a" />
              
              <path d="M18 28 C18 28, 46 28, 46 46 L40 54 L24 54 Z" fill={suitColor} />
              <path d="M22 30 L42 30 L38 46 L26 46 Z" fill={plateColor} stroke="#64748b" strokeWidth="1.5" />
              
              {/* Laser marker */}
              <circle cx="32" cy="38" r="2.5" fill={teamColor} className="animate-ping" />
              
              {/* Front visor helmet */}
              <path d="M20 24 C20 13, 44 13, 44 24 Q41 31, 38 32 L26 32 Z" fill="#323c2c" stroke="#44523c" strokeWidth="1.5" />
              <path d="M24 22 Q32 17, 40 22 L37 27 L27 27 Z" fill={visor} />
            </svg>
          );
        }
      }

      case 'Sniper': {
        const visor = "#22c55e";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Draped Sniper Camo Cape/Hood */}
              <path d="M14 26 C14 16, 32 16, 44 28 L40 56 L16 56 Z" fill="#1e293b" opacity="0.9" />
              
              {/* Slim recon suit */}
              <path d="M22 30 C22 30, 38 30, 36 44 L32 54 L24 54 Z" fill={suitColor} />
              
              {/* Ultra-long bar sniper rail */}
              <line x1="28" y1="36" x2="52" y2="36" stroke="#475569" strokeWidth="3" />
              <line x1="28" y1="35" x2="52" y2="35" stroke="#38bdf8" strokeWidth="1" className="animate-pulse" /> {/* Laser path */}
              <rect x="28" y="32" width="6" height="4" fill="#0284c7" />
              
              {/* Hood wrap */}
              <path d="M18 20 C18 10, 38 10, 42 22 C42 26, 38 30, 32 30 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <circle cx="34" cy="22" r="3.5" fill="#3b82f6" /> {/* scope optic */}
              <line x1="34" y1="22" x2="15" y2="22" stroke="#ff0000" strokeWidth="0.8" strokeDasharray="2,2" />
              
              {getFiringEffect(53, 35, "#38bdf8")}
            </svg>
          );
        } else if (displayFacing === 'up') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cape and cowl back */}
              <path d="M16 22 C16 12, 48 12, 48 22 L46 54 L18 54 Z" fill="#0f172a" />
              <rect x="24" y="26" width="16" height="24" fill="#1e293b" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* Backpack antennae */}
              <line x1="28" y1="26" x2="24" y2="12" stroke="#38bdf8" strokeWidth="1.5" />
            </svg>
          );
        } else { // DOWN
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hooded front cloak */}
              <path d="M14 26 C14 14, 50 14, 50 26 L46 54 L18 54 Z" fill="#0f172a" />
              
              {/* Recon body gear */}
              <path d="M26 32 L38 32 L36 48 L28 48 Z" fill={plateColor} stroke="#22d3ee" strokeWidth="1" />
              
              {/* Deep shadow face & scope optic */}
              <path d="M22 26 C22 14, 42 14, 42 26 Z" fill="#020617" />
              <circle cx="34" cy="24" r="4" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" />
              <line x1="34" y1="24" x2="20" y2="24" stroke="#ef4444" strokeWidth="1" strokeDasharray="1,1" />
            </svg>
          );
        }
      }

      case 'Demoman': {
        const visor = "#f59e0b";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="14" y="24" width="8" height="20" rx="2" fill="#2d2918" />
              
              <path d="M20 28 C20 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              
              {/* Bulky padded bomb vest */}
              <path d="M21 30 L36 30 L33 46 L23 46 Z" fill="#423d24" stroke="#5d552e" strokeWidth="1.5" />
              <line x1="22" y1="36" x2="35" y2="36" stroke="#ea580c" strokeWidth="2.5" />
              
              {/* Grenade launcher */}
              <rect x="28" y="34" width="14" height="6" fill="#1b2118" rx="1" />
              <circle cx="34" cy="37" r="4.5" fill="#451a03" /> {/* drum */}
              
              {/* Demoman helmet */}
              <path d="M22 24 C22 13, 38 13, 38 24 L36 31 L24 31 Z" fill="#423d24" stroke="#5d552e" strokeWidth="1.5" />
              <rect x="25" y="20" width="11" height="4" fill={visor} />
              <circle cx="28" cy="17" r="1.5" fill="#facc15" />
              
              {getFiringEffect(44, 37, "#f97316")}
            </svg>
          );
        } else if (displayFacing === 'up') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Backpack containing orange canister missiles */}
              <path d="M20 28 C20 28, 44 28, 44 46 L38 54 L26 54 Z" fill={suitColor} />
              <rect x="22" y="30" width="20" height="18" rx="2" fill="#2d2918" stroke="#5d552e" strokeWidth="2" />
              
              <rect x="25" y="24" width="4" height="6" fill="#f97316" rx="1" />
              <rect x="35" y="24" width="4" height="6" fill="#f97316" rx="1" />
              
              <path d="M22 24 C22 13, 42 13, 42 24 L38 31 L26 31 Z" fill="#423d24" stroke="#5d552e" strokeWidth="1.5" />
            </svg>
          );
        } else { // DOWN
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 28 C18 28, 46 28, 46 46 L40 54 L24 54 Z" fill={suitColor} />
              
              <path d="M21 30 L43 30 L39 46 L25 46 Z" fill="#423d24" stroke="#5d552e" strokeWidth="1.5" />
              {/* Diagonal sash with dynamic shells */}
              <line x1="24" y1="32" x2="40" y2="44" stroke="#ea580c" strokeWidth="3" />
              
              <path d="M20 24 C20 13, 44 13, 44 24 L42 31 L22 31 Z" fill="#423d24" stroke="#5d552e" strokeWidth="1.5" />
              <rect x="24" y="20" width="16" height="5" fill={visor} />
            </svg>
          );
        }
      }

      case 'Heavy': {
        const visor = "#b45309";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Giant massive fuel reactors back */}
              <rect x="10" y="22" width="12" height="24" rx="3" fill="#1b2118" stroke="#ef4444" strokeWidth="1.5" />
              <circle cx="16" cy="28" r="2.5" fill="#ef4444" className="animate-pulse" />

              {/* Massive torso suits */}
              <path d="M18 26 C18 26, 42 26, 42 46 L36 57 L22 57 Z" fill={suitColor} />
              <path d="M20 28 L40 28 L37 48 L21 48 Z" fill="#2a3028" stroke="#ef4444" strokeWidth="2.5" />
              
              {/* Exoskeletal legs */}
              <rect x="22" y="55" width="6" height="7" rx="1.5" fill="#475569" />
              <rect x="31" y="55" width="6" height="7" rx="1.5" fill="#475569" />
              
              {/* Giant Minigun */}
              <path d="M26 38 L48 38 L48 44 L26 44 Z" fill="#0f172a" />
              <line x1="48" y1="40" x2="52" y2="40" stroke="#facc15" strokeWidth="1.5" />
              <line x1="48" y1="42" x2="52" y2="42" stroke="#facc15" strokeWidth="1.5" />
              <path d="M20 34 Q34 34, 46 38" stroke="#334155" strokeWidth="5.5" />
              
              {/* Massive Heavy iron helmet with brow stripe */}
              <rect x="20" y="16" width="22" height="20" rx="3.5" fill="#2a3028" stroke="#3d443a" strokeWidth="1.5" />
              <rect x="20" y="16" width="22" height="4" fill="#ef4444" />
              <rect x="23" y="24" width="16" height="5" fill={visor} />
              
              {getFiringEffect(53, 41, "#ff7700")}
            </svg>
          );
        } else if (displayFacing === 'up') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="54" width="8" height="8" rx="2" fill="#0f172a" />
              <rect x="36" y="54" width="8" height="8" rx="2" fill="#0f172a" />
              
              <path d="M15 26 C15 26, 49 26, 49 46 L42 55 L22 55 Z" fill={suitColor} />
              
              {/* Giant exhaust vent system on back */}
              <rect x="18" y="28" width="28" height="20" rx="3" fill="#1e241c" stroke="#3d443a" strokeWidth="3" />
              <rect x="22" y="32" width="6" height="12" fill="#ef4444" rx="1" />
              <rect x="36" y="32" width="6" height="12" fill="#ef4444" rx="1" />
              
              {/* Heavy Helmet back */}
              <rect x="20" y="16" width="24" height="20" rx="3.5" fill="#2a3028" stroke="#3d443a" strokeWidth="1.5" />
            </svg>
          );
        } else { // DOWN
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="18" y="54" width="8" height="8" rx="2" fill="#0f172a" />
              <rect x="38" y="54" width="8" height="8" rx="2" fill="#0f172a" />
              
              <path d="M12 26 C12 26, 52 26, 52 46 L44 55 L20 55 Z" fill={suitColor} />
              <path d="M16 28 L48 28 L44 48 L20 48 Z" fill="#2a3028" stroke="#3d443a" strokeWidth="3" />
              
              {/* Heavy gold warning decals */}
              <line x1="20" y1="32" x2="44" y2="32" stroke="#ea580c" strokeWidth="4" />
              
              {/* Heavy Front Visor */}
              <rect x="18" y="16" width="28" height="22" rx="4" fill="#2a3028" stroke="#3d443a" strokeWidth="2" />
              <rect x="22" y="24" width="20" height="6" fill={visor} />
            </svg>
          );
        }
      }

      case 'Shotgunner': {
        const visor = "#ea580c";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="16" y="26" width="7" height="18" rx="1.5" fill="#504831" />
              
              <path d="M22 28 C22 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              <path d="M22 30 L37 30 L34 46 L24 46 Z" fill="#3d3725" stroke="#f59e0b" strokeWidth="1" />
              
              {/* Pump-action Shotgun */}
              <rect x="30" y="36" width="16" height="4" fill="#1e293b" />
              <rect x="34" y="38" width="6" height="3" fill="#ca8a04" /> {/* wood pump handle */}
              <circle cx="45" cy="38" r="1" fill="#fff" />
              <path d="M25 32 Q34 32, 42 36" stroke={plateColor} strokeWidth="3.5" />
              
              {/* Helmet with angled crest */}
              <path d="M22 24 C22 14, 40 14, 40 24 L37 31 L24 31 Z" fill="#3d3725" stroke="#504831" strokeWidth="1.5" />
              <polygon points="27,24 36,24 34,28 25,28" fill={visor} />
              
              {getFiringEffect(47, 38, "#ca8a04")}
            </svg>
          );
        } else {
          // Fallback simple directions for Pose Variants (Shotgunner is Right-facing Pose Variant, reuse standard look)
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M15 32 C15 16, 49 16, 49 32 L46 50 L18 50 Z" fill="#3d3725" stroke="#504831" strokeWidth="2.5" />
              <path d="M14 26 L49 26 L41 31 L21 31 Z" fill="#695c3b" />
              <rect x="23" y="34" width="18" height="5" rx="1" fill="#ca8a04" />
              <polygon points="19,34 30,34 27,39 19,39" fill="#ea580c" />
              <polygon points="34,34 45,34 45,39 37,39" fill="#ea580c" />
            </svg>
          );
        }
      }

      case 'Support': {
        const visor = "#059669";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Long active comms antennae */}
              <line x1="18" y1="28" x2="12" y2="12" stroke="#10b981" strokeWidth="2" />
              <circle cx="12" cy="12" r="2" fill="#34d399" />
              
              <path d="M22 28 C22 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              <path d="M22 30 L37 30 L34 46 L24 46 Z" fill="#203525" stroke="#10b981" strokeWidth="1" />
              
              {/* Energy emitter emitter */}
              <line x1="30" y1="36" x2="44" y2="36" stroke="#475569" strokeWidth="3" />
              <circle cx="44" cy="36" r="3" fill="#10b981" />
              
              {/* Helmet */}
              <path d="M22 24 C22 14, 40 14, 40 24 L37 31 L24 31 Z" fill="#203525" stroke="#2d4a34" strokeWidth="1.5" />
              <rect x="26" y="22" width="10" height="4" rx="1.5" fill={visor} />
              
              {getFiringEffect(46, 36, "#10b981")}
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#10b981" strokeWidth="1.5" />
              <path d="M16 32 C16 16, 48 16, 48 32 Q44 48, 41 52 L23 52 Z" fill="#203525" stroke="#2d4a34" strokeWidth="2" />
              <line x1="45" y1="28" x2="55" y2="10" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="55" cy="10" r="2.5" fill="#34d399" />
              <rect x="22" y="28" width="20" height="8" rx="1.5" fill="#059669" />
            </svg>
          );
        }
      }

      case 'Technician': {
        const visor = "#059669";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Robotic helper arm visible */}
              <path d="M16 28 L14 16 L20 12 L24 16" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="16" r="2" fill="#10b981" />
              
              <path d="M22 28 C22 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              <path d="M22 30 L37 30 L34 46 L24 46 Z" fill="#2d3c30" stroke="#22c55e" strokeWidth="1" />
              
              {/* Mechanical pulse sub-tool */}
              <rect x="28" y="34" width="14" height="4" fill="#334155" />
              <line x1="42" y1="36" x2="46" y2="36" stroke="#22c55e" strokeWidth="2" />
              
              {/* Triple lens mechanical helmet */}
              <path d="M22 24 C22 14, 40 14, 40 24 L37 31 L24 31 Z" fill="#2d3c30" stroke="#445747" strokeWidth="1.5" />
              <circle cx="28" cy="24" r="3" fill={visor} />
              <circle cx="34" cy="24" r="3" fill={visor} />
              
              {getFiringEffect(46, 36, "#22c55e")}
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#10b981" strokeWidth="1.5" />
              <path d="M16 32 C16 16, 48 16, 48 32 Q44 48, 41 51 L23 51 Z" fill="#2d3c30" stroke="#445747" strokeWidth="2" />
              <circle cx="24" cy="32" r="4.5" fill="#059669" />
              <circle cx="40" cy="32" r="4.5" fill="#059669" />
              <circle cx="32" cy="24" r="3" fill="#059669" />
            </svg>
          );
        }
      }

      case 'Flamethrower': {
        const visor = "#ea580c";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Back Red Gas Tank */}
              <rect x="12" y="24" width="8" height="22" rx="2" fill="#b91c1c" stroke="#dc2626" strokeWidth="1.5" />
              <circle cx="16" cy="30" r="1.5" fill="#ff7800" />
              
              <path d="M22 28 C22 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              <path d="M22 30 L37 30 L34 46 L24 46 Z" fill="#323c2c" stroke="#ea580c" strokeWidth="1" />
              
              {/* Long burner rifle line */}
              <line x1="30" y1="36" x2="48" y2="36" stroke="#475569" strokeWidth="3" />
              <line x1="30" y1="38" x2="42" y2="38" stroke="#ef4444" strokeWidth="1" /> {/* burner hose */}
              <circle cx="48" cy="36" r="2" fill="#ea580c" />
              
              {/* Big gas mask respirator */}
              <path d="M22 24 C22 14, 40 14, 40 24 L37 31 L24 31 Z" fill="#323c2c" stroke="#44523c" strokeWidth="1.5" />
              <rect x="30" y="21" width="6" height="10" rx="1" fill={visor} />
              <rect x="25" y="38" width="10" height="6" rx="2" fill="#1b2118" stroke="#f97316" />
              
              {/* Giant blazing fire burst particle overlay */}
              {isFiring && (
                <g className="animate-pulse">
                  <path d="M49 36 L62 30 L56 36 L64 40 L53 38 Z" fill="#f97316" />
                  <circle cx="56" cy="35" r="5" fill="#facc15" />
                  <circle cx="59" cy="37" r="3" fill="#ffffff" />
                  <path d="M49 35 Q58 20, 62 30" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                </g>
              )}
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#f97316" strokeWidth="1.5" />
              <path d="M16 30 C16 15, 48 15, 48 30 Q44 48, 40 50 L24 50 Z" fill="#323c2c" stroke="#44523c" strokeWidth="2" />
              <rect x="29" y="23" width="6" height="15" rx="1" fill="#ea580c" />
              <rect x="22" y="40" width="20" height="12" rx="3" fill="#1b2118" stroke="#f97316" />
            </svg>
          );
        }
      }

      case 'Medic': {
        const visor = "#ca8a04";
        if (displayFacing === 'right') {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="16" y="25" width="6" height="18" rx="2" fill="#f43f5e" />
              
              <path d="M22 28 C22 28, 38 28, 38 45 L34 56 L24 56 Z" fill={suitColor} />
              {/* White surgical plate */}
              <path d="M22 30 L37 30 L34 46 L24 46 Z" fill="#dae3ce" stroke="#8b9180" strokeWidth="1.5" />
              
              {/* Syringe dispenser Ray gun */}
              <rect x="28" y="36" width="14" height="4" fill="#3b82f6" rx="1" />
              <line x1="42" y1="38" x2="45" y2="38" stroke="#f43f5e" strokeWidth="1.5" /> {/* hypodermic needle */}
              
              {/* Medic Clean Helmet with red cross */}
              <path d="M22 24 C22 14, 40 14, 40 24 L37 31 L24 31 Z" fill="#dae3ce" stroke="#8b9180" strokeWidth="1.5" />
              <path d="M31 16 L31 22 M28 19 L34 19" stroke="#f43f5e" strokeWidth="2.5" />
              <rect x="27" y="23" width="10" height="4" fill={visor} />
              
              {getFiringEffect(45, 38, "#10b981")}
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#facc15" strokeWidth="1.5" />
              <path d="M15 32 C15 16, 49 16, 49 32 Q45 50, 42 52 L22 52 Z" fill="#dae3ce" stroke="#8b9180" strokeWidth="2.5" />
              <path d="M32 15 L32 25 M27 20 L37 20" stroke="#f43f5e" strokeWidth="3" />
              <rect x="21" y="32" width="22" height="9" rx="1.5" fill="#ca8a04" />
            </svg>
          );
        }
      }

      default: {
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeWidth="1.5" />
            <path d="M20 28 C20 28, 44 28, 44 46 L38 54 L26 54 Z" fill={suitColor} />
            <rect x="22" y="20" width="20" height="15" rx="3.5" fill="#525d48" stroke="#dae3ce" />
            <line x1="24" y1="26" x2="40" y2="26" stroke="#fbbf24" strokeWidth="2" />
          </svg>
        );
      }
    }
  };

  return (
    <div 
      className={`${className} flex items-center justify-center p-0.5 relative select-none transition-transform pointer-events-none`}
      style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
    >
      {renderSVG()}
    </div>
  );
}
