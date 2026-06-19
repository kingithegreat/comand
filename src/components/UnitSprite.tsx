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
    const props = { className: "w-5 h-5 sm:w-6 sm:h-6 drop-shadow-lg", strokeWidth: 2.2 };
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
      case 'Phantom': return <Wifi {...props} />;
      case 'Vanguard': return <ShieldPlus {...props} />;
      case 'Assassin': return <Skull {...props} />;
      default: return <User {...props} />;
    }
  };

  const playerTheme = {
    outer: 'bg-gradient-to-br from-sky-950/90 via-[#0c1929]/95 to-sky-950/90',
    border: 'border-sky-400/70',
    shadow: 'shadow-[0_0_14px_rgba(56,189,248,0.35),inset_0_1px_1px_rgba(56,189,248,0.15)]',
    iconColor: 'text-sky-300',
    ring: 'ring-sky-500/20',
  };

  const enemyTheme = {
    outer: 'bg-gradient-to-br from-purple-950/90 via-[#1a0a2e]/95 to-fuchsia-950/90',
    border: 'border-fuchsia-400/70',
    shadow: 'shadow-[0_0_14px_rgba(192,38,211,0.35),inset_0_1px_1px_rgba(192,38,211,0.15)]',
    iconColor: 'text-fuchsia-300',
    ring: 'ring-fuchsia-500/20',
  };

  const theme = team === 'player' ? playerTheme : enemyTheme;

  const firingClasses = isFiring
    ? 'scale-115 border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,200,50,0.3)]'
    : '';

  return (
    <div
      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center select-none transition-all duration-200 ring-1 ${theme.outer} ${theme.border} ${theme.shadow} ${theme.iconColor} ${theme.ring} ${firingClasses}`}
      style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
    >
      {getIcon()}
    </div>
  );
}
