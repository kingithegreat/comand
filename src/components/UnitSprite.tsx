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
  User
} from 'lucide-react';

interface UnitSpriteProps {
  className?: string;
  classVal: string;
  team: 'player' | 'enemy';
  facing?: 'up' | 'down' | 'left' | 'right';
  pose?: 'idle' | 'aim' | 'firing';
}

export default function UnitSprite({ 
  className = "w-10 h-10", 
  classVal, 
  team, 
  facing = 'right', 
  pose = 'idle' 
}: UnitSpriteProps) {
  
  const isFlipped = facing === 'left';
  const isFiring = pose === 'firing';

  const getIcon = () => {
    const props = { className: "w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md", strokeWidth: 2 };
    switch (classVal) {
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
      default: return <User {...props} />;
    }
  };

  const bgTheme = team === 'player' 
    ? 'bg-[#13273e]/90 border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)] text-sky-400' 
    : 'bg-[#311721]/90 border-[#f43f5e] shadow-[0_0_12px_rgba(244,63,94,0.4)] text-rose-400';

  return (
    <div 
      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center select-none transition-all duration-300 ${bgTheme} ${isFiring ? 'scale-110 border-white bg-white/10 shadow-[0_0_16px_rgba(255,255,255,0.6)]' : ''}`}
      style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
    >
      {getIcon()}
    </div>
  );
}

