import React from 'react';
import {
  Crosshair,
  Zap,
  Target,
  Bomb,
  ShieldAlert,
  Locate,
  Activity,
  Wrench,
  Flame,
  HeartPulse,
  User,
  Wifi,
  ShieldPlus,
  Skull
} from 'lucide-react';

interface UnitHelmetAvatarProps {
  className?: string;
  classNameVal: string;
  team?: 'player' | 'enemy';
}

export default function UnitHelmetAvatar({ className = "w-10 h-10", classNameVal, team }: UnitHelmetAvatarProps) {
  const teamAccent = team === 'player' ? 'text-sky-400' : 'text-fuchsia-400';

  const getIcon = () => {
    const props = { className: "w-3/4 h-3/4 opacity-80", strokeWidth: 1.5 };
    switch (classNameVal) {
      case 'Scout': return <Crosshair {...props} />;
      case 'Assault': return <Zap {...props} />;
      case 'Sniper': return <Target {...props} />;
      case 'Demoman': return <Bomb {...props} />;
      case 'Heavy': return <ShieldAlert {...props} />;
      case 'Shotgunner': return <Locate {...props} />;
      case 'Support': return <Activity {...props} />;
      case 'Technician': return <Wrench {...props} />;
      case 'Flamethrower': return <Flame {...props} />;
      case 'Medic': return <HeartPulse {...props} />;
      case 'Phantom': return <Wifi {...props} />;
      case 'Vanguard': return <ShieldPlus {...props} />;
      case 'Assassin': return <Skull {...props} />;
      default: return <User {...props} />;
    }
  };

  return (
    <div className={`${className} bg-black/40 rounded border border-[#2d3422]/60 overflow-hidden flex items-center justify-center p-0.5 relative z-1 shadow-inner ${teamAccent}`}>
      {getIcon()}
    </div>
  );
}

