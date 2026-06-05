import React from 'react';

interface UnitHelmetAvatarProps {
  className?: string;
  classNameVal: string; // class name e.g. 'Scout', 'Sniper', or 'Medic'
  team?: 'player' | 'enemy';
}

export default function UnitHelmetAvatar({ className = "w-10 h-10", classNameVal, team }: UnitHelmetAvatarProps) {
  // Determine standard colors
  const baseGray = "#394132"; // military olive deep grey
  const maskDark = "#121510"; // visor background
  const teamAccent = team === 'player' ? '#38bdf8' : '#f43f5e'; // blue or red team beacon DOT

  // Render class-specific high-fidelity SVG graphics for each helmet from the reference
  const renderSVG = () => {
    switch (classNameVal) {
      case 'Scout':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background cyber grid lines */}
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Scout Helmet Casing */}
            <path d="M16 32 C16 16, 48 16, 48 32 C48 38, 46 48, 44 52 L20 52 C18 48, 16 38, 16 32 Z" fill="#2c3527" stroke="#3c4936" strokeWidth="2" />
            <path d="M18 28 C18 20, 46 20, 46 28 L44 32 L20 32 Z" fill="#44523c" />
            
            {/* Cyan glowing visor */}
            <rect x="22" y="28" width="20" height="8" rx="2" fill="#06b6d4" stroke="#22d3ee" strokeWidth="1" className="animate-pulse shadow-[0_0_12px_#06b6d4]" />
            <rect x="24" y="30" width="16" height="2" fill="#e0f7fa" /> {/* core shine */}
            
            {/* Earpieces */}
            <rect x="12" y="32" width="4" height="12" rx="1" fill="#1b2118" />
            <rect x="48" y="32" width="4" height="12" rx="1" fill="#1b2118" />
            
            {/* Small tactical scope sensor in top corner */}
            <circle cx="21" cy="20" r="2" fill="#00ffff" />
            
            {/* Team Dot */}
            <circle cx="32" cy="50" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Assault':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Assault Helmet Casing */}
            <path d="M15 32 C15 15, 49 15, 49 32 C49 42, 45 52, 41 54 L23 54 C19 52, 15 42, 15 32 Z" fill="#323c2c" stroke="#44523c" strokeWidth="2" />
            {/* Helmet brow plate */}
            <path d="M15 28 L49 28 L45 32 L19 32 Z" fill="#52634a" />
            
            {/* Orange glowing visor */}
            <path d="M22 32 C22 30, 42 30, 42 32 L40 40 L24 40 Z" fill="#eb5a0c" stroke="#f97316" strokeWidth="1" />
            <rect x="25" y="34" width="14" height="3" fill="#ffedd5" opacity="0.9" />
            
            {/* Jaw Protector */}
            <path d="M26 48 L38 48 L36 54 L28 54 Z" fill="#1b2118" />
            
            {/* Side mounts */}
            <rect x="11" y="28" width="4" height="10" fill="#1b2118" />
            <rect x="49" y="28" width="4" height="10" fill="#1b2118" />
            
            <circle cx="32" cy="50" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Sniper':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
            
            {/* Sniper tactical helmet hidden under deep blue-grey cowl hood */}
            <path d="M12 48 C12 28, 18 12, 32 12 C46 12, 52 28, 52 48" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
            <path d="M14 50 C14 30, 18 14, 32 14 C46 14, 50 30, 50 50" fill="none" stroke="#2c3e50" strokeWidth="4" />
            
            {/* Deep shadow face cavity */}
            <path d="M18 42 C18 26, 46 26, 46 42 L42 54 L22 54 Z" fill="#090d12" />
            
            {/* Blue glowing Sniper optic scope */}
            <circle cx="26" cy="34" r="5" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="26" cy="34" r="2" fill="#93c5fd" />
            {/* Laser pointer beacon */}
            <line x1="26" y1="34" x2="10" y2="34" stroke="#ff0000" strokeWidth="1" strokeDasharray="2,2" className="animate-pulse" />
            
            {/* Shadow fold wrap of hood */}
            <path d="M12 48 C20 44, 44 44, 52 48 L48 56 C38 52, 26 52, 16 56 Z" fill="#1a252f" />
            
            <circle cx="32" cy="50" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Demoman':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Heavy-Duty Demoman Helm with rivets & overhead reinforcing band */}
            <path d="M14 34 C14 16, 50 16, 50 34 C50 44, 46 52, 42 54 L22 54 C18 52, 14 44, 14 34 Z" fill="#423d24" stroke="#5d552e" strokeWidth="2" />
            {/* Center steel band */}
            <rect x="29" y="15" width="6" height="20" fill="#2d2918" />
            
            {/* Heavy orange visor */}
            <rect x="20" y="32" width="24" height="9" fill="#d97706" stroke="#f59e0b" strokeWidth="1" />
            <rect x="22" y="34" width="20" height="2" fill="#fffbeb" />
            
            {/* Steel rivets on band */}
            <circle cx="32" cy="18" r="1.5" fill="#facc15" />
            <circle cx="32" cy="26" r="1.5" fill="#facc15" />
            
            {/* Heavy armor ear shields */}
            <rect x="10" y="30" width="4" height="14" fill="#2d2918" rx="1" />
            <rect x="50" y="30" width="4" height="14" fill="#2d2918" rx="1" />
            
            <circle cx="32" cy="49" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Heavy':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#ef4444" strokeWidth="1" />
            
            {/* Ultra-massive thick Heavy iron-gray helmet with yellow warning block stripes */}
            <rect x="14" y="20" width="36" height="34" rx="6" fill="#2a3028" stroke="#3d443a" strokeWidth="2.5" />
            <rect x="14" y="20" width="36" height="6" fill="#b45309" /> {/* Thick steel forehead crown */}
            
            {/* Wide amber fortress visor */}
            <rect x="18" y="28" width="28" height="10" fill="#b45309" stroke="#ea580c" strokeWidth="1.5" />
            <line x1="20" y1="31" x2="44" y2="31" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
            <line x1="20" y1="35" x2="44" y2="35" stroke="#ea580c" strokeWidth="1" />
            
            {/* Bulky side ventilation filters */}
            <rect x="8" y="32" width="6" height="16" rx="2" fill="#161b14" />
            <rect x="50" y="32" width="6" height="16" rx="2" fill="#161b14" />
            <line x1="9" y1="36" x2="13" y2="36" stroke="#44523c" strokeWidth="1" />
            <line x1="9" y1="42" x2="13" y2="42" stroke="#44523c" strokeWidth="1" />
            <line x1="51" y1="36" x2="55" y2="36" stroke="#44523c" strokeWidth="1" />
            <line x1="51" y1="42" x2="55" y2="42" stroke="#44523c" strokeWidth="1" />
            
            <circle cx="32" cy="48" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Shotgunner':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Shotgunner brown-tinted forest plate helmet */}
            <path d="M15 32 C15 16, 49 16, 49 32 L46 50 L18 50 Z" fill="#3d3725" stroke="#504831" strokeWidth="2" />
            {/* Angled defensive heavy brow plate */}
            <path d="M14 26 L49 26 L41 31 L21 31 Z" fill="#695c3b" />
            
            {/* Angular split duel-visors in orange */}
            <polygon points="19,34 30,34 27,39 19,39" fill="#ea580c" stroke="#f97316" strokeWidth="0.5" />
            <polygon points="34,34 45,34 45,39 37,39" fill="#ea580c" stroke="#f97316" strokeWidth="0.5" />
            
            {/* Riveted mouth exhaust plate */}
            <path d="M26 44 L38 44 L35 50 L29 50 Z" fill="#161a10" />
            <circle cx="32" cy="47" r="1" fill="#ea580c" />
            
            <circle cx="32" cy="48" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Support':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#10b981" strokeWidth="1" />
            
            {/* Support deep green helmet */}
            <path d="M16 32 C16 16, 48 16, 48 32 C48 40, 44 48, 41 52 L23 52 C20 48, 16 40, 16 32 Z" fill="#203525" stroke="#2d4a34" strokeWidth="2" />
            
            {/* Comms receiver antenna on right side */}
            <line x1="45" y1="28" x2="55" y2="10" stroke="#10b981" strokeWidth="2.5" />
            <circle cx="55" cy="10" r="2.5" fill="#34d399" />
            
            {/* Green glowing horizontal visor */}
            <rect x="22" y="28" width="20" height="8" rx="1.5" fill="#059669" stroke="#10b981" strokeWidth="1" />
            <line x1="24" y1="31" x2="40" y2="31" stroke="#a7f3d0" strokeWidth="1.5" />
            
            {/* Comms earmuff module on left side */}
            <rect x="11" y="26" width="5" height="14" rx="1.5" fill="#111c14" />
            
            <circle cx="32" cy="46" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Technician':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Technical triple visor layout */}
            <path d="M16 32 C16 16, 48 16, 48 32 Q44 48, 41 51 Q32 50, 23 51 Q20 48, 16 32 Z" fill="#2d3c30" stroke="#445747" strokeWidth="2" />
            
            {/* Triple multi-spectral green visor sensors */}
            <circle cx="24" cy="32" r="4.5" fill="#059669" stroke="#34d399" strokeWidth="1.5" />
            <circle cx="24" cy="32" r="1.5" fill="#fff" />
            
            <circle cx="40" cy="32" r="4.5" fill="#059669" stroke="#34d399" strokeWidth="1.5" />
            <circle cx="40" cy="32" r="1.5" fill="#fff" />
            
            <circle cx="32" cy="24" r="3" fill="#059669" stroke="#34d399" strokeWidth="1" />
            <circle cx="32" cy="24" r="1" fill="#fff" />
            
            {/* Small wiring/circuits drawing */}
            <path d="M18 20 L24 20 L27 23" stroke="#22c55e" strokeWidth="1" opacity="0.6" />
            <path d="M46 20 L40 20 L37 23" stroke="#22c55e" strokeWidth="1" opacity="0.6" />
            
            <circle cx="32" cy="44" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Flamethrower':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#f97316" strokeWidth="1" />
            
            {/* Heavy containment helmet with prominent mouth gas respirator */}
            <path d="M16 30 C16 15, 48 15, 48 30 C48 40, 44 48, 40 50 L24 50 C20 48, 16 40, 16 30 Z" fill="#323c2c" stroke="#44523c" strokeWidth="2" />
            
            {/* Glowing vertical slit Orange visor */}
            <rect x="29" y="23" width="6" height="15" rx="1" fill="#ea580c" stroke="#ff7a00" strokeWidth="1" />
            <line x1="32" y1="25" x2="32" y2="36" stroke="#fff" strokeWidth="1.5" />
            
            {/* Heavy respirator container at bottom mouth of the unit */}
            <rect x="22" y="40" width="20" height="12" rx="3" fill="#1b2118" stroke="#f97316" strokeWidth="1" />
            {/* Scrubber vents bars */}
            <line x1="26" y1="44" x2="38" y2="44" stroke="#44523c" strokeWidth="1.5" />
            <line x1="26" y1="48" x2="38" y2="48" stroke="#44523c" strokeWidth="1.5" />
            
            <circle cx="32" cy="53" r="2.5" fill={teamAccent} />
          </svg>
        );

      case 'Medic':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#facc15" strokeWidth="1" />
            
            {/* Medic high-visibility white/gray clean helmet */}
            <path d="M15 32 C15 16, 49 16, 49 32 C49 42, 45 50, 42 52 L22 52 C19 50, 15 42, 15 32 Z" fill="#dae3ce" stroke="#8b9180" strokeWidth="2.5" />
            <path d="M17 30 C17 21, 47 21, 47 30 Z" fill="#f4fbf0" />
            
            {/* Bright, glowing medical hospital cross on forehead */}
            <path d="M32 15 L32 25 M27 20 L37 20" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
            
            {/* Soft gold scanning visor */}
            <rect x="21" y="32" width="22" height="9" rx="1.5" fill="#ca8a04" stroke="#facc15" strokeWidth="1.5" />
            <line x1="23" y1="35" x2="41" y2="35" stroke="#fef08a" strokeWidth="1.5" />
            
            {/* Injection port nodes */}
            <circle cx="20" cy="46" r="1.5" fill="#f43f5e" />
            <circle cx="44" cy="46" r="1.5" fill="#f43f5e" />
            
            <circle cx="32" cy="46" r="2.5" fill={teamAccent} />
          </svg>
        );

      default:
        // Fallback default combat core helmet
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="rgba(14,22,10,0.6)" stroke="#fff" strokeWidth="1" />
            <path d="M16 32 C16 16, 48 16, 48 32 L44 50 L20 50 Z" fill="#3f4537" stroke="#dae3ce" strokeWidth="1.5" />
            <rect x="22" y="30" width="20" height="8" fill="#5c6552" />
            <circle cx="32" cy="44" r="2.5" fill={teamAccent} />
          </svg>
        );
    }
  };

  return (
    <div className={`${className} bg-black/40 rounded border border-[#2d3422]/60 overflow-hidden flex items-center justify-center p-0.5 relative z-1 shadow-inner`}>
      {renderSVG()}
    </div>
  );
}
