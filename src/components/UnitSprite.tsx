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
  className = "w-12 h-12", 
  classVal, 
  team, 
  facing = 'right', 
  pose = 'idle' 
}: UnitSpriteProps) {
  
  const teamColor = team === 'player' ? 'text-sky-400' : 'text-rose-400';
  const isFlipped = facing === 'left';
  const isFiring = pose === 'firing';

  const getIcon = () => {
    const props = { className: "w-full h-full drop-shadow-md", strokeWidth: 1.5 };
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

  return (
    <div 
      className={`${className} flex items-center justify-center relative select-none transition-transform pointer-events-none ${teamColor} ${isFiring ? 'animate-pulse scale-110' : ''}`}
      style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
    >
      {getIcon()}
    </div>
  );
}
