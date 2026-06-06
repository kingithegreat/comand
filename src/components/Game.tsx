import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Target, Activity, Move, PlusCircle, RotateCcw, ChevronRight, Crosshair, Users, Zap, Flame, Rocket, Car, Truck, Radar } from 'lucide-react';
import TurnCounter from './TurnCounter';
import { CLASSES } from '../data';
import { CharacterClass, Unit, GridCell } from '../types';
import { generateMap } from '../mapUtils';
import { getReachableTiles, checkLineOfSight } from '../logic';
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import CombatLog, { LogMessage } from './CombatLog';
import RosterStatus from './RosterStatus';
import SelectedUnitConsole from './SelectedUnitConsole';
import UnitHelmetAvatar from './UnitHelmetAvatar';
import UnitSprite from './UnitSprite';

const GRID_SIZE = 15;

const getFacingDirection = (
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number, 
  currentFacing?: 'up' | 'down' | 'left' | 'right'
): 'up' | 'down' | 'left' | 'right' => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else if (Math.abs(dy) > 0) {
    return dy > 0 ? 'down' : 'up';
  }
  return currentFacing || 'right';
};

const ARCHETYPE_COLORS = {
  'Short Range': 'text-[#fbbf24] border-[#fbbf24]/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]',
  'Long Range': 'text-[#38bdf8] border-[#38bdf8]/50 shadow-[0_0_10px_rgba(56,189,248,0.3)]',
  'Support': 'text-[#4ade80] border-[#4ade80]/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]',
  'Explosives': 'text-[#f97316] border-[#f97316]/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
  'Assault': 'text-[#e2e8f0] border-[#e2e8f0]/50 shadow-[0_0_10px_rgba(226,232,240,0.3)]',
};

const ARCHETYPE_BG_COLORS = {
  'Short Range': 'bg-[#fbbf24]/20',
  'Long Range': 'bg-[#38bdf8]/20',
  'Support': 'bg-[#4ade80]/20',
  'Explosives': 'bg-[#f97316]/20',
  'Assault': 'bg-[#e2e8f0]/20',
};

const getArchetypeIcon = (archetype: string, className = "w-5 h-5 mb-0.5 opacity-80") => {
  switch (archetype) {
    case 'Short Range': return <Target className={className} />;
    case 'Long Range': return <Crosshair className={className} />;
    case 'Support': return <Radar className={className} />;
    case 'Explosives': return <Rocket className={className} />;
    case 'Assault': return <Truck className={className} />;
    default: return <Users className={className} />;
  }
};

export default function Game({ 
  gameMode, 
  onBack,
  onlineMatch,
  userId
}: { 
  gameMode: 'local_ai' | 'local_p2p' | 'online',
  onBack: () => void,
  onlineMatch?: any,
  userId?: string
}) {
  const [mapEnvironment, setMapEnvironment] = useState<GridCell[][]>([]);
  const [mode, setMode] = useState<'deploy' | 'play'>('deploy');
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(CLASSES[0]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [teamSelection, setTeamSelection] = useState<'player' | 'enemy'>('player');
  const [turn, setTurn] = useState(1);
  const [activeTeam, setActiveTeam] = useState<'player' | 'enemy'>('player');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const [isAbilityActive, setIsAbilityActive] = useState(false);

  useEffect(() => {
    setIsAbilityActive(false);
  }, [selectedUnitId, turn, activeTeam]);
  const [damageTexts, setDamageTexts] = useState<{id: string, x: number, y: number, amount: number}[]>([]);
  const [shake, setShake] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  // Coin Flip & P2P Handoff states
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSpinning, setCoinSpinning] = useState(true);
  const [coinWinner, setCoinWinner] = useState<'player' | 'enemy' | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffTarget, setHandoffTarget] = useState<'player' | 'enemy'>('player');
  const [pendingTurnData, setPendingTurnData] = useState<{ units: Unit[], turn: number, activeTeam: 'player' | 'enemy' } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [logs, setLogs] = useState<LogMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      text: "TACTICAL SEC-NET ACTIVATED. FIELD TELEMETRY FEED SYNCHRONIZED.",
      type: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);

  const addLog = useCallback((text: string, type: 'info' | 'combat' | 'death' | 'ability' | 'system') => {
    setLogs(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    ].slice(-150));
  }, []);

  const getCoord = (cx: number, cy: number) => {
    return `${String.fromCharCode(65 + cx)}${(cy + 1).toString().padStart(2, '0')}`;
  };

  const handlePassUnit = () => {
    if (!selectedUnitId) return;
    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit) return;
    const newUnits = units.map(u => 
      u.id === selectedUnitId ? { ...u, ap: 0 } : u
    );
    addLog(`[PASS] ${unit.team === 'player' ? 'Blue' : 'Red'} ${unit.class.className} completed standby cycle.`, 'system');
    setSelectedUnitId(null);
    if (isOnline) {
      updateOnlineState(newUnits, turn, activeTeam);
    } else {
      setUnits(newUnits);
    }
  };

  const isOnline = gameMode === 'online' && onlineMatch;
  const isHost = isOnline ? onlineMatch.hostId === userId : true;
  const myTeam = isOnline ? (isHost ? 'player' : 'enemy') : undefined;

  const unitsString = JSON.stringify(units);

  // Sync state from onlineMatch
  useEffect(() => {
    if (isOnline && onlineMatch) {
       // Only parse if changed
       const newUnits = JSON.parse(onlineMatch.units || "[]");
       if (JSON.stringify(newUnits) !== unitsString) {
         setUnits(newUnits);
       }
       if (onlineMatch.gridEnv) {
         setMapEnvironment(JSON.parse(onlineMatch.gridEnv));
       }
       if ((onlineMatch.status === 'play' || onlineMatch.status === 'in_progress') && mode !== 'play' && !coinFlipping) {
          setCoinFlipping(true);
          setCoinSpinning(true);
          const syncedWinner = onlineMatch.activeTeam || 'player';
          setCoinWinner(syncedWinner);
          
          setTimeout(() => {
             setCoinSpinning(false);
          }, 1700);

          setTimeout(() => {
             setMode('play');
             setCoinFlipping(false);
             addLog(`[COIN TOSS] Satellite positioning telemetry initialized. ${syncedWinner === 'player' ? 'Blue' : 'Red'} Squad won initiative and receives the first move!`, 'system');
          }, 2500);
       } else if ((onlineMatch.status === 'play' || onlineMatch.status === 'in_progress') && mode === 'play') {
          // If already in play, keep syncing activeTeam
          if (onlineMatch.activeTeam) {
             setActiveTeam(onlineMatch.activeTeam);
          }
       }
       if (onlineMatch.winner) {
          setWinner(onlineMatch.winner);
       }
       setTurn(onlineMatch.turn || 1);
       if (onlineMatch.activeTeam && !coinFlipping && mode === 'play') {
          setActiveTeam(onlineMatch.activeTeam);
       }
    }
  }, [onlineMatch, isOnline, unitsString, mode, coinFlipping, addLog]);

  const updateOnlineState = async (newUnits: any[], newTurn: number, newActiveTeam: string, newStatus: string = mode, winTeam?: string) => {
     if (isOnline && onlineMatch?.id) {
        const payload: any = {
           units: JSON.stringify(newUnits),
           turn: newTurn,
           activeTeam: newActiveTeam,
           status: newStatus
        };
        if (winTeam) payload.winner = winTeam;
        await updateDoc(doc(db, 'matches', onlineMatch.id), payload);
     }
  };

  useEffect(() => {
    if (!isOnline && mapEnvironment.length === 0) {
      setMapEnvironment(generateMap());
    } else if (isOnline && isHost && mapEnvironment.length === 0 && !onlineMatch?.gridEnv) {
      const generated = generateMap();
      setMapEnvironment(generated);
      updateDoc(doc(db, 'matches', onlineMatch.id), {
         gridEnv: JSON.stringify(generated)
      });
    }
  }, [isOnline, isHost, onlineMatch, mapEnvironment.length]);

  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const reachableTiles = mode === 'play' && selectedUnit && mapEnvironment.length > 0 && !isAbilityActive ? getReachableTiles(selectedUnit, mapEnvironment, units) : [];

  const isReachableTileObj = (x: number, y: number) => reachableTiles.find(t => t.x === x && t.y === y);

  const isValidAbilityTarget = (x: number, y: number) => {
    if (!selectedUnit || !selectedUnit.class.ability) return false;
    const ability = selectedUnit.class.ability;
    
    const dist = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
    if (ability.range !== undefined && dist > ability.range) return false;

    const cell = mapEnvironment[y]?.[x];
    if (!cell) return false;
    
    const unitAtTile = units.find(u => u.x === x && u.y === y && u.hp > 0);

    if (ability.type === 'heal') {
      return !!(unitAtTile && unitAtTile.team === selectedUnit.team);
    }
    
    if (ability.type === 'buff') {
      return !!(unitAtTile && unitAtTile.team === selectedUnit.team && unitAtTile.id !== selectedUnit.id);
    }

    if (ability.type === 'deploy') {
      return dist === 1 && cell.type === 'floor' && !unitAtTile;
    }

    if (ability.type === 'offensive') {
      if (selectedUnit.class.className === 'Demoman') {
        return true;
      }
      if (!unitAtTile || unitAtTile.team === selectedUnit.team) return false;
      if (selectedUnit.class.className !== 'Sniper') {
        const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, x, y, mapEnvironment);
        if (!hasLos) return false;
      }
      return true;
    }
    
    return false;
  };

  const handleSelfAbility = () => {
    if (!selectedUnit || !selectedUnit.class.ability || selectedUnit.ap < 1) return;
    const ability = selectedUnit.class.ability;
    if (ability.type !== 'self') return;

    let healedAmount = 0;
    let addedAp = 0;
    const teamColor = selectedUnit.team === 'player' ? 'Blue' : 'Red';

    if (selectedUnit.class.className === 'Heavy') {
      healedAmount = 50;
      addLog(`[FORTIFY] ${teamColor} Heavy fortified shield barriers: Recovered +50 HP.`, 'ability');
    } else if (selectedUnit.class.className === 'Scout') {
      healedAmount = 20;
      addedAp = 1;
      addLog(`[TACTICAL] ${teamColor} Scout activated rapid adrenaline surge: Gained +1 AP, healed +20 HP.`, 'ability');
    } else if (selectedUnit.class.className === 'Shotgunner') {
      healedAmount = 35;
      addLog(`[STEALTH] ${teamColor} Shotgunner engaged reflex bullet shields: Recovered +35 HP.`, 'ability');
    }

    const newUnits = units.map(u => {
      if (u.id === selectedUnit.id) {
        return { 
          ...u, 
          hp: Math.min(u.class.stats.maxHP, u.hp + healedAmount), 
          ap: Math.min(3, u.ap - ability.apCost + addedAp) 
        };
      }
      return u;
    });

    const effectId = crypto.randomUUID();
    setDamageTexts(prev => [...prev, { id: effectId, x: selectedUnit.x, y: selectedUnit.y, amount: -healedAmount }]);
    setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);

    if (isOnline) {
      updateOnlineState(newUnits, turn, activeTeam);
    } else {
      setUnits(newUnits);
    }
  };

  const executeAbility = (x: number, y: number) => {
    if (!selectedUnit || !selectedUnit.class.ability) return;
    const ability = selectedUnit.class.ability;
    if (selectedUnit.ap < ability.apCost) return;

    const attackerColor = selectedUnit.team === 'player' ? 'Blue' : 'Red';
    const targetColor = selectedUnit.team === 'player' ? 'Red' : 'Blue';

    const targetUnit = units.find(u => u.x === x && u.y === y && u.hp > 0);
    let isCrateCreated = false;
    let newMapEnvironment = [...mapEnvironment];

    const targetFacing = getFacingDirection(selectedUnit.x, selectedUnit.y, x, y, selectedUnit.facing);
    let newUnits = units.map(u => {
      if (u.id === selectedUnit.id) {
        return { ...u, ap: u.ap - ability.apCost, facing: targetFacing, pose: 'firing' as const };
      }
      return u;
    });

    setTimeout(() => {
       setUnits(curr => curr.map(u => u.id === selectedUnit.id ? { ...u, pose: 'idle' as const } : u));
    }, 800);

    if (selectedUnit.class.className === 'Medic') {
      newUnits = newUnits.map(u => {
        if (targetUnit && u.id === targetUnit.id) {
          return { ...u, hp: Math.min(u.class.stats.maxHP, u.hp + 55) };
        }
        return u;
      });
      const effectId = crypto.randomUUID();
      setDamageTexts(prev => [...prev, { id: effectId, x, y, amount: -55 }]);
      setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
      addLog(`[HEAL] ${attackerColor} Medic discharged Nanite Resuscitation onto ${attackerColor} ${targetUnit?.class.className} (+55 HP) at ${getCoord(x, y)}.`, 'ability');
    } 
    else if (selectedUnit.class.className === 'Flamethrower') {
      newUnits = newUnits.map(u => {
        if (targetUnit && u.id === targetUnit.id) {
          return { ...u, hp: u.hp - 85 };
        }
        return u;
      });
      const effectId = crypto.randomUUID();
      setDamageTexts(prev => [...prev, { id: effectId, x, y, amount: 85 }]);
      setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
      setShake(true);
      setTimeout(() => setShake(false), 200);
      addLog(`[INFERNO] ${attackerColor} Flamethrower carbonized ${targetColor} ${targetUnit?.class.className} with Inferno Jet for 85 damage at ${getCoord(x, y)}!`, 'combat');
      if (targetUnit && targetUnit.hp - 85 <= 0) {
        addLog(`[FATALITY] ${targetColor} ${targetUnit.class.className} incinerated by intense thermal burst.`, 'death');
      }
    }
    else if (selectedUnit.class.className === 'Technician') {
      newMapEnvironment = mapEnvironment.map((row, ry) => 
        row.map((cell, cx) => {
          if (cx === x && ry === y) {
            return { ...cell, type: 'crate' };
          }
          return cell;
        })
      );
      isCrateCreated = true;
      const effectId = crypto.randomUUID();
      setDamageTexts(prev => [...prev, { id: effectId, x, y, amount: 0 }]);
      setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
      addLog(`[CONSTRUCT] ${attackerColor} Technician deployed localized cargo shielding cover at sector ${getCoord(x, y)}.`, 'ability');
    }
    else if (selectedUnit.class.className === 'Demoman') {
      const hitUnits = units.filter(u => 
        u.team !== selectedUnit.team && 
        u.hp > 0 &&
        Math.abs(u.x - x) <= 1 && 
        Math.abs(u.y - y) <= 1
      );

      newUnits = newUnits.map(u => {
        const isHit = hitUnits.some(hu => hu.id === u.id);
        if (isHit) {
          return { ...u, hp: u.hp - 30 };
        }
        return u;
      });

      hitUnits.forEach(hu => {
        const damageId = crypto.randomUUID();
        setDamageTexts(prev => [...prev, { id: damageId, x: hu.x, y: hu.y, amount: 30 }]);
        setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
        
        const remHp = hu.hp - 30;
        if (remHp <= 0) {
          addLog(`[FATALITY] ${targetColor} ${hu.class.className} neutralized in explosive Demoman blast at ${getCoord(hu.x, hu.y)}.`, 'death');
        }
      });
      
      setShake(true);
      setTimeout(() => setShake(false), 200);
      addLog(`[BOMBARD] ${attackerColor} Demoman launched high-explosive bundle at sector ${getCoord(x, y)} dealing 30 damage to surrounding enemy units.`, 'combat');
    }
    else if (selectedUnit.class.className === 'Sniper') {
      newUnits = newUnits.map(u => {
        if (targetUnit && u.id === targetUnit.id) {
          return { ...u, hp: u.hp - 55 };
        }
        return u;
      });
      const damageId = crypto.randomUUID();
      setDamageTexts(prev => [...prev, { id: damageId, x, y, amount: 55 }]);
      setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
      setShake(true);
      setTimeout(() => setShake(false), 200);
      addLog(`[SNIPED] ${attackerColor} Sniper discharged Piercing Round direct slug onto ${targetColor} ${targetUnit?.class.className} for 55 damage at ${getCoord(x, y)}!`, 'combat');
      if (targetUnit && targetUnit.hp - 55 <= 0) {
        addLog(`[FATALITY] ${targetColor} ${targetUnit.class.className} neutralized by deep range Sniper strike.`, 'death');
      }
    }
    else if (selectedUnit.class.className === 'Support' || selectedUnit.class.className === 'Assault') {
      const isSupport = selectedUnit.class.className === 'Support';
      const damage = isSupport ? 20 : 25;
      newUnits = newUnits.map(u => {
        if (targetUnit && u.id === targetUnit.id) {
          return { ...u, hp: u.hp - damage, ap: Math.max(0, u.ap - 1) };
        }
        return u;
      });
      const damageId = crypto.randomUUID();
      setDamageTexts(prev => [...prev, { id: damageId, x, y, amount: damage }]);
      setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
      setShake(true);
      setTimeout(() => setShake(false), 200);
      
      if (isSupport) {
        addLog(`[SUPPRESS] ${attackerColor} Support delivered Disruptor Matrix automatic suppress at ${targetColor} ${targetUnit?.class.className}: Dealt 20 damage, drained 1 AP!`, 'combat');
        if (targetUnit && targetUnit.hp - 20 <= 0) {
          addLog(`[FATALITY] ${targetColor} ${targetUnit.class.className} neutralized under heavy Support cover.`, 'death');
        }
      } else {
        addLog(`[TACTICAL] ${attackerColor} Assault performed Tactical Flush on ${targetColor} ${targetUnit?.class.className}: Dealt 25 damage, drained 1 AP!`, 'combat');
        if (targetUnit && targetUnit.hp - 25 <= 0) {
          addLog(`[FATALITY] ${targetColor} ${targetUnit.class.className} neutralized during tactical sweep.`, 'death');
        }
      }
    }

    setIsAbilityActive(false);

    if (isCrateCreated) {
      setMapEnvironment(newMapEnvironment);
    }

    if (isOnline) {
      const payload: any = {
        units: JSON.stringify(newUnits),
        turn: turn,
        activeTeam: activeTeam,
        status: mode
      };
      if (isCrateCreated) {
        payload.gridEnv = JSON.stringify(newMapEnvironment);
      }
      updateDoc(doc(db, 'matches', onlineMatch.id), payload);
    } else {
      setUnits(newUnits);
    }
  };

  const autoDeploy = (team: 'player' | 'enemy') => {
    // Clear existing units for this team
    let currentUnits = units.filter(u => u.team !== team);
    
    // Find all valid non-wall tiles in the designated zone
    const validTiles: {x: number, y: number}[] = [];
    const minRow = team === 'player' ? 8 : 0;
    const maxRow = team === 'player' ? 14 : 6;
    for (let rY = minRow; rY <= maxRow; rY++) {
      for (let cX = 0; cX < GRID_SIZE; cX++) {
        if (mapEnvironment[rY] && mapEnvironment[rY][cX].type === 'floor' && !currentUnits.some(u => u.x === cX && u.y === rY)) {
          validTiles.push({ x: cX, y: rY });
        }
      }
    }
    
    // Shuffle valid tiles
    const shuffledBytes = [...validTiles].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < 4; i++) {
      if (shuffledBytes[i]) {
        const randClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
        currentUnits.push({
          id: crypto.randomUUID(),
          class: randClass,
          x: shuffledBytes[i].x,
          y: shuffledBytes[i].y,
          hp: randClass.stats.maxHP,
          ap: 2,
          team,
        });
      }
    }
    
    addLog(`[AUTO-DEPLOY] Telemetry link auto-positioned 4 combat operators for ${team === 'player' ? 'Blue' : 'Red'} Squad.`, 'system');
    if (isOnline) {
       updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(currentUnits) });
    } else {
       setUnits(currentUnits);
    }
  };

  const handleConfirmHandoff = () => {
    if (pendingTurnData) {
      setUnits(pendingTurnData.units);
      setTurn(pendingTurnData.turn);
      setActiveTeam(pendingTurnData.activeTeam);
    }
    setShowHandoff(false);
    setPendingTurnData(null);
  };

  const handleEndTurn = useCallback(() => {
    const nextTeam = activeTeam === 'player' ? 'enemy' : 'player';
    const nextTurn = activeTeam === 'enemy' ? turn + 1 : turn;
    
    // For local or if we are emitting this
    const updatedUnits = units.map(u => ({
      ...u,
      ap: 2
    }));

    addLog(`[CYCLE] Terminating ${activeTeam === 'player' ? 'Blue Squad (Player)' : 'Red Squad (Enemy)'} action cycle. Rotating control to ${nextTeam === 'player' ? 'Blue Squad (Player)' : 'Red Squad (Enemy)'}. Turn ${nextTurn} active.`, 'system');

    if (isOnline) {
       updateOnlineState(updatedUnits, nextTurn, nextTeam);
    } else {
       if (gameMode === 'local_p2p') {
          setHandoffTarget(nextTeam);
          setPendingTurnData({
            units: updatedUnits,
            turn: nextTurn,
            activeTeam: nextTeam
          });
          setShowHandoff(true);
       } else {
          setActiveTeam(nextTeam);
          if (activeTeam === 'enemy') setTurn(nextTurn);
          setUnits(updatedUnits);
       }
    }
    setSelectedUnitId(null);
  }, [activeTeam, turn, units, isOnline, onlineMatch, addLog, gameMode, pendingTurnData]);

  // Synchronize dynamic visual turn timer for multiplayer matches
  useEffect(() => {
    if (!isOnline || mode !== 'play' || winner) {
      return;
    }
    setTimeLeft(60);
  }, [isOnline, mode, activeTeam, turn, winner]);

  useEffect(() => {
    if (!isOnline || mode !== 'play' || winner) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activeTeam === myTeam) {
            handleEndTurn();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, mode, activeTeam, myTeam, winner, handleEndTurn, turn]);

  const performAINextAction = useCallback(() => {
    const enemyUnits = units.filter(u => u.team === 'enemy' && u.ap > 0);
    if (enemyUnits.length === 0) {
      handleEndTurn();
      return;
    }

    const enemy = enemyUnits[0];
    const playerUnits = units.filter(u => u.team === 'player');
    const friendlies = units.filter(u => u.team === 'enemy' && u.id !== enemy.id);

    // AI special ability activation triggers (Intelligent tactical actions)
    if (enemy.ap >= 1 && enemy.class.ability) {
       if (enemy.class.className === 'Medic') {
          const woundedFriendly = units.find(u => 
             u.team === 'enemy' && 
             u.hp < u.class.stats.maxHP && 
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 3
          );
          if (woundedFriendly) {
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: woundedFriendly.x, y: woundedFriendly.y, amount: -55 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1 };
                if (u.id === woundedFriendly.id) return { ...u, hp: Math.min(u.class.stats.maxHP, u.hp + 55) };
                return u;
             }));
             addLog(`[HEAL] Enemy Medic discharged Nanite Resuscitation onto Enemy ${woundedFriendly.class.className} (+55 HP) at ${getCoord(woundedFriendly.x, woundedFriendly.y)}.`, 'ability');
             return;
          }
       }
       else if (enemy.class.className === 'Heavy') {
          if (enemy.class.stats.maxHP - enemy.hp >= 40) {
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: enemy.x, y: enemy.y, amount: -50 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, hp: Math.min(u.class.stats.maxHP, u.hp + 50), ap: u.ap - 1 };
                return u;
             }));
             addLog(`[FORTIFY] Enemy Heavy activated shield self-repair: Recovered +50 HP.`, 'ability');
             return;
          }
       }
       else if (enemy.class.className === 'Shotgunner') {
          if (enemy.class.stats.maxHP - enemy.hp >= 30) {
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: enemy.x, y: enemy.y, amount: -35 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, hp: Math.min(u.class.stats.maxHP, u.hp + 35), ap: u.ap - 1 };
                return u;
             }));
             addLog(`[BREACH] Enemy Shotgunner activated CQB combat shield: Recovered +35 HP.`, 'ability');
             return;
          }
       }
       else if (enemy.class.className === 'Scout') {
          if (enemy.class.stats.maxHP - enemy.hp >= 20) {
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: enemy.x, y: enemy.y, amount: -20 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             
             setUnits(prev => prev.map(u => {
                // Adrenaline surge heals 20 and returns 1 AP (+1 net AP, since casting costs 1, net AP changed is 0)
                if (u.id === enemy.id) return { ...u, hp: Math.min(u.class.stats.maxHP, u.hp + 20) };
                return u;
             }));
             addLog(`[TACTICAL] Enemy Scout activated rapid adrenaline surge: Gained +1 AP, healed +20 HP.`, 'ability');
             return;
          }
       }
       else if (enemy.class.className === 'Flamethrower') {
          const target = playerUnits.find(u => 
             u.hp > 0 &&
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 2 &&
             checkLineOfSight(enemy.x, enemy.y, u.x, u.y, mapEnvironment)
          );
          if (target) {
             const targetFacing = getFacingDirection(enemy.x, enemy.y, target.x, target.y, enemy.facing);
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: target.x, y: target.y, amount: 85 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             setShake(true);
             setTimeout(() => setShake(false), 200);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                if (u.id === target.id) return { ...u, hp: u.hp - 85 };
                return u;
             }));
             setTimeout(() => {
                setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
             }, 800);
             
             addLog(`[INFERNO] Enemy Flamethrower carbonized Blue ${target.class.className} with Inferno Jet for 85 damage at ${getCoord(target.x, target.y)}!`, 'combat');
             if (target.hp - 85 <= 0) {
                addLog(`[FATALITY] Blue ${target.class.className} incinerated by intense thermal burst.`, 'death');
             }
             return;
          }
       }
       else if (enemy.class.className === 'Sniper') {
          const target = playerUnits.find(u => 
             u.hp > 0 &&
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 12
          ); // Sniper Piercing round ignores normal cover blockers
          if (target) {
             const targetFacing = getFacingDirection(enemy.x, enemy.y, target.x, target.y, enemy.facing);
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: target.x, y: target.y, amount: 55 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             setShake(true);
             setTimeout(() => setShake(false), 200);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                if (u.id === target.id) return { ...u, hp: u.hp - 55 };
                return u;
             }));
             setTimeout(() => {
                setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
             }, 800);
             
             addLog(`[SNIPED] Enemy Sniper discharged Piercing Round direct slug onto Blue ${target.class.className} for 55 damage at ${getCoord(target.x, target.y)}!`, 'combat');
             if (target.hp - 55 <= 0) {
                addLog(`[FATALITY] Blue ${target.class.className} neutralized by deep range Sniper strike.`, 'death');
             }
             return;
          }
       }
       else if (enemy.class.className === 'Demoman') {
          const target = playerUnits.find(u => 
             u.hp > 0 &&
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 5
          );
          if (target) {
             const targetFacing = getFacingDirection(enemy.x, enemy.y, target.x, target.y, enemy.facing);
             const hitUnits = units.filter(u => 
               u.team === 'player' && 
               u.hp > 0 &&
               Math.abs(u.x - target.x) <= 1 && 
               Math.abs(u.y - target.y) <= 1
             );
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                const isHit = hitUnits.some(hu => hu.id === u.id);
                if (isHit) {
                   return { ...u, hp: u.hp - 30 };
                }
                return u;
             }));
             setTimeout(() => {
                setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
             }, 800);
             
             hitUnits.forEach(hu => {
               const damageId = crypto.randomUUID();
               setDamageTexts(prev => [...prev, { id: damageId, x: hu.x, y: hu.y, amount: 30 }]);
               setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
               
               const remHp = hu.hp - 30;
               if (remHp <= 0) {
                 addLog(`[FATALITY] Blue ${hu.class.className} neutralized in explosive Demoman blast at ${getCoord(hu.x, hu.y)}.`, 'death');
               }
             });
             
             setShake(true);
             setTimeout(() => setShake(false), 200);
             addLog(`[BOMBARD] Enemy Demoman launched high-explosive bundle at sector ${getCoord(target.x, target.y)} dealing 30 damage to surrounding player units.`, 'combat');
             return;
          }
       }
       else if (enemy.class.className === 'Assault') {
          const target = playerUnits.find(u => 
             u.hp > 0 &&
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 5 &&
             checkLineOfSight(enemy.x, enemy.y, u.x, u.y, mapEnvironment)
          );
          if (target) {
             const targetFacing = getFacingDirection(enemy.x, enemy.y, target.x, target.y, enemy.facing);
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: target.x, y: target.y, amount: 25 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             setShake(true);
             setTimeout(() => setShake(false), 200);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                if (u.id === target.id) return { ...u, hp: u.hp - 25, ap: Math.max(0, u.ap - 1) };
                return u;
             }));
             setTimeout(() => {
                setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
             }, 800);
             
             addLog(`[CORRECT] Enemy Assault performed tactical sweep on Blue ${target.class.className} dealing 25 damage and draining 1 AP at ${getCoord(target.x, target.y)}!`, 'combat');
             if (target.hp - 25 <= 0) {
                addLog(`[FATALITY] Blue ${target.class.className} neutralized during tactical sweep.`, 'death');
             }
             return;
          }
       }
       else if (enemy.class.className === 'Support') {
          const target = playerUnits.find(u => 
             u.hp > 0 &&
             (Math.abs(u.x - enemy.x) + Math.abs(u.y - enemy.y)) <= 5 &&
             checkLineOfSight(enemy.x, enemy.y, u.x, u.y, mapEnvironment)
          );
          if (target) {
             const targetFacing = getFacingDirection(enemy.x, enemy.y, target.x, target.y, enemy.facing);
             const effectId = crypto.randomUUID();
             setDamageTexts(prev => [...prev, { id: effectId, x: target.x, y: target.y, amount: 20 }]);
             setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);
             setShake(true);
             setTimeout(() => setShake(false), 200);
             
             setUnits(prev => prev.map(u => {
                if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                if (u.id === target.id) return { ...u, hp: u.hp - 20, ap: Math.max(0, u.ap - 1) };
                return u;
             }));
             setTimeout(() => {
                setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
             }, 800);
             
             addLog(`[SUPPRESS] Enemy Support delivered covering automatic fire at Blue ${target.class.className}: Dealt 20 damage, drained 1 AP!`, 'combat');
             if (target.hp - 20 <= 0) {
                addLog(`[FATALITY] Blue ${target.class.className} neutralized under heavy Support cover.`, 'death');
             }
             return;
          }
       }
       else if (enemy.class.className === 'Technician') {
          // Find a valid adjacent tile that is floor and has no unit to deploy cover protection crate
          let foundTile: {x: number, y: number} | null = null;
          const dirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
          for (const dir of dirs) {
             const tx = enemy.x + dir.x;
             const ty = enemy.y + dir.y;
             if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
                const cell = mapEnvironment[ty]?.[tx];
                const unitOnTile = units.find(u => u.x === tx && u.y === ty && u.hp > 0);
                if (cell?.type === 'floor' && !unitOnTile) {
                   foundTile = { x: tx, y: ty };
                   break;
                }
             }
          }
          if (foundTile) {
             const { x: tx, y: ty } = foundTile;
             setMapEnvironment(prev => prev.map((row, ry) => 
               row.map((cell, cx) => cx === tx && ry === ty ? { ...cell, type: 'crate' } : cell)
             ));
             setUnits(prev => prev.map(u => u.id === enemy.id ? { ...u, ap: u.ap - 1 } : u));
             addLog(`[CONSTRUCT] Enemy Technician deployed localized cargo shielding cover at sector ${getCoord(tx, ty)}.`, 'ability');
             return;
          }
       }
    }

    if (playerUnits.length === 0) {
      handleEndTurn();
      return;
    }

    const personality = enemy.class.personality || 'Tactical';

    // 1. Try to attack
    let bestTarget = null;
    let bestTargetScore = -Infinity;

    for (const p of playerUnits) {
       const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
       const hasLos = checkLineOfSight(enemy.x, enemy.y, p.x, p.y, mapEnvironment);
       if (dist <= enemy.class.stats.range && hasLos) {
          let score = 0;
          if (personality === 'Aggressive') score = -dist + (p.class.stats.maxHP - p.hp)*2; // Prefers wounded or close
          else if (personality === 'Cautious') score = -p.class.stats.maxHP; // Prefers squishy
          else if (personality === 'Tactical') score = -p.hp; // Kills lowest hp
          else if (personality === 'Support') score = -dist - p.hp; 
          
          // Randomness for flaw
          score += (Math.random() - 0.5) * 5;

          if (score > bestTargetScore) {
             bestTargetScore = score;
             bestTarget = p;
          }
       }
    }

    if (bestTarget && enemy.ap >= 1) { // attack costs 1 AP
       const p = bestTarget;
       const targetFacing = getFacingDirection(enemy.x, enemy.y, p.x, p.y, enemy.facing);
       const damageId = crypto.randomUUID();
       setDamageTexts(prev => [...prev, { id: damageId, x: p.x, y: p.y, amount: enemy.class.stats.damage }]);
       setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
       
       setShake(true);
       setTimeout(() => setShake(false), 200);

       setUnits(prev => prev.map(u => {
          if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
          if (u.id === p.id) return { ...u, hp: u.hp - enemy.class.stats.damage };
          return u;
       }));

       setTimeout(() => {
          setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
       }, 800);
       
       const remHp = p.hp - enemy.class.stats.damage;
       addLog(`[ENGAGE] Enemy ${enemy.class.className} attacked Blue ${p.class.className} for ${enemy.class.stats.damage} damage at ${getCoord(p.x, p.y)}.`, 'combat');
       if (remHp <= 0) {
         addLog(`[FATALITY] Blue ${p.class.className} neutralized under enemy hostile fire.`, 'death');
       }
       return;
    }

    // 2. Try to move
    const reachable = getReachableTiles(enemy, mapEnvironment, units);
    if (reachable.length > 0) {
       let bestTile = null;
       let bestTileScore = -Infinity;

       const scoreTile = (tx: number, ty: number) => {
          let score = 0;
          let minPlayerDist = Infinity;
          for (const p of playerUnits) {
             const d = Math.abs(tx - p.x) + Math.abs(ty - p.y);
             if (d < minPlayerDist) minPlayerDist = d;
          }

          if (personality === 'Aggressive') {
             score = -minPlayerDist * 2; // AI Flaw: charges blindly forward
          } else if (personality === 'Cautious') {
             const idealRange = enemy.class.stats.range;
             score = -Math.abs(minPlayerDist - idealRange);
             if (minPlayerDist < idealRange * 0.5) score -= 10; // Panics when too close
          } else if (personality === 'Tactical') {
             score = minPlayerDist <= enemy.class.stats.range ? 5 : -minPlayerDist;
          } else if (personality === 'Support') {
             let minFriendDist = Infinity;
             for(const f of friendlies) {
                 const fd = Math.abs(tx - f.x) + Math.abs(ty - f.y);
                 if (fd < minFriendDist) minFriendDist = fd;
             }
             if (minFriendDist === Infinity) minFriendDist = 0;
             score = -minFriendDist * 2 + (minPlayerDist * 0.5); // Stays near friends, away from enemies
          }

          return score + (Math.random() - 0.5) * 2; // Minor variability
       };

       const currentScore = scoreTile(enemy.x, enemy.y);

       for (const r of reachable) {
          const finalScore = scoreTile(r.x, r.y) - (r.apCost * 0.1); 
          if (finalScore > bestTileScore) {
             bestTileScore = finalScore;
             bestTile = r;
          }
       }

       if (bestTile && bestTileScore > currentScore + 0.5) {
          const moveFacing = getFacingDirection(enemy.x, enemy.y, bestTile.x, bestTile.y, enemy.facing);
          setUnits(prev => prev.map(u => 
            u.id === enemy.id ? { ...u, x: bestTile.x, y: bestTile.y, ap: u.ap - bestTile.apCost, facing: moveFacing } : u
          ));
          addLog(`[MANEUVER] Enemy ${enemy.class.className} advanced to quadrant ${getCoord(bestTile.x, bestTile.y)} (used ${bestTile.apCost} AP).`, 'info');
          return;
       }
    }

    // Pass turn for this unit
    setUnits(prev => prev.map(u => u.id === enemy.id ? { ...u, ap: 0 } : u));
    addLog(`[PASS] Enemy ${enemy.class.className} entered passive standby cycle.`, 'system');
  }, [units, mapEnvironment, handleEndTurn, checkLineOfSight, addLog]);

  const performAINextActionRef = React.useRef(performAINextAction);
  useEffect(() => {
    performAINextActionRef.current = performAINextAction;
  }, [performAINextAction]);

  const enemyUnitsApHash = units.filter(u => u.team === 'enemy').map(u => `${u.id}:${u.ap}`).join(',');

  useEffect(() => {
    if (!isOnline && gameMode === 'local_ai' && mode === 'play' && activeTeam === 'enemy') {
       const timer = setTimeout(() => {
          performAINextActionRef.current();
       }, 400);
       return () => clearTimeout(timer);
    }
  }, [enemyUnitsApHash, activeTeam, mode, gameMode, isOnline]);

  useEffect(() => {
    const deadUnits = units.filter(u => u.hp <= 0);
    if (deadUnits.length > 0) {
      const timer = setTimeout(() => {
        const newUnits = units.filter(u => u.hp > 0);
        
        let newWinner = undefined;
        let newStatus = mode;

        if (mode === 'play') {
          const pAlive = newUnits.filter(u => u.team === 'player').length > 0;
          const eAlive = newUnits.filter(u => u.team === 'enemy').length > 0;
          if (!pAlive) { newWinner = 'enemy'; newStatus = 'finished'; }
          else if (!eAlive) { newWinner = 'player'; newStatus = 'finished'; }
        }

        if (newWinner) setWinner(newWinner as any);

        if (isOnline) {
           updateOnlineState(newUnits, turn, activeTeam, newStatus, newWinner);
        } else {
           setUnits(newUnits);
           if (newStatus !== mode) setMode(newStatus as any);
        }
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [units, mode, isOnline, turn, activeTeam]);

  const handleCellClick = (x: number, y: number) => {
    if (!isOnline && gameMode === 'local_ai' && mode === 'play' && activeTeam === 'enemy') return; // Block player input during AI turn
    if (isOnline && myTeam && mode === 'play' && activeTeam !== myTeam) return; // Block out of turn

    const existingUnitIndex = units.findIndex(u => u.x === x && u.y === y);
    const existingUnit = existingUnitIndex >= 0 ? units[existingUnitIndex] : null;

    if (mode === 'deploy') {
      if (isOnline && teamSelection !== myTeam) return; 

      if (mapEnvironment[y] && mapEnvironment[y][x].type === 'wall') return;

      if (existingUnit) {
         if (isOnline && existingUnit.team !== myTeam) return; 
         const newUnits = [...units];
         newUnits.splice(existingUnitIndex, 1);
         addLog(`[RECALL] ${existingUnit.team === 'player' ? 'Blue' : 'Red'} ${existingUnit.class.className} withdrawn from grid.`, 'system');
         if (isOnline) {
            updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(newUnits) });
         } else {
            setUnits(newUnits);
         }
         return;
      }

      if (teamSelection === 'player' && y < 8) return;
      if (teamSelection === 'enemy' && y > 6) return;

      if (selectedClass) {
        if (units.filter(u => u.team === teamSelection).length >= 4) return;
        
        const newUnit: Unit = {
          id: crypto.randomUUID(),
          class: selectedClass,
          x, y,
          hp: selectedClass.stats.maxHP,
          ap: 2,
          team: teamSelection,
        };
        addLog(`[DEPLOY] ${teamSelection === 'player' ? 'Blue' : 'Red'} ${selectedClass.className} deployed at quadrant ${getCoord(x, y)}.`, 'system');
        const newUnitsArray = [...units, newUnit];
        if (isOnline) {
           updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(newUnitsArray) });
        } else {
           setUnits(newUnitsArray);
           if (gameMode === 'local_p2p' && teamSelection === 'player' && newUnitsArray.filter(u => u.team === 'player').length === 4) {
              setTeamSelection('enemy');
              addLog(`[COMMAND_UPLINK] Blue Squad fully deployed. Handing over terminal to Red Squad for unit placement.`, 'system');
           }
        }
      }
    } else if (mode === 'play') {
      if (isAbilityActive && selectedUnit && selectedUnit.team === activeTeam) {
         if (isValidAbilityTarget(x, y)) {
            executeAbility(x, y);
            return;
         } else {
            setIsAbilityActive(false);
         }
      }

      if (existingUnit) {
         if (existingUnit.team === activeTeam) {
            setSelectedUnitId(existingUnit.id);
         } else if (selectedUnitId) {
            const unit = units.find(u => u.id === selectedUnitId);
            if (unit && unit.team === activeTeam) {
               const dist = Math.abs(unit.x - existingUnit.x) + Math.abs(unit.y - existingUnit.y);
               const hasLos = checkLineOfSight(unit.x, unit.y, existingUnit.x, existingUnit.y, mapEnvironment);
               if (dist <= unit.class.stats.range && hasLos && unit.ap >= 1) {
                  const damageId = crypto.randomUUID();
                  setDamageTexts(prev => [...prev, { id: damageId, x: existingUnit.x, y: existingUnit.y, amount: unit.class.stats.damage }]);
                  setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
                  setShake(true);
                  setTimeout(() => setShake(false), 200);

                  const targetFacing = getFacingDirection(unit.x, unit.y, existingUnit.x, existingUnit.y, unit.facing);
                  const newUnits = units.map(u => {
                    if (u.id === unit.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                    if (u.id === existingUnit.id) return { ...u, hp: u.hp - unit.class.stats.damage };
                    return u;
                  });

                  setTimeout(() => {
                    setUnits(curr => curr.map(u => u.id === unit.id ? { ...u, pose: 'idle' as const } : u));
                  }, 800);
                  
                  const relHP = existingUnit.hp - unit.class.stats.damage;
                  const attackerColor = unit.team === 'player' ? 'Blue' : 'Red';
                  const targetColor = existingUnit.team === 'player' ? 'Blue' : 'Red';
                  addLog(`[ENGAGE] ${attackerColor} ${unit.class.className} attacked ${targetColor} ${existingUnit.class.className} at ${getCoord(existingUnit.x, existingUnit.y)} for ${unit.class.stats.damage} damage!`, 'combat');
                  if (relHP <= 0) {
                      addLog(`[FATALITY] ${targetColor} ${existingUnit.class.className} neutralized under hostile fire.`, 'death');
                  }

                  if(isOnline) updateOnlineState(newUnits, turn, activeTeam);
                  else setUnits(newUnits);
               }
            } else {
               setSelectedUnitId(existingUnit.id);
            }
         }
      } else if (selectedUnitId) {
         const reachableObj = isReachableTileObj(x, y);
         const unit = units.find(u => u.id === selectedUnitId);
         if (reachableObj && unit) {
           const moveFacing = getFacingDirection(unit.x, unit.y, x, y, unit.facing);
           const newUnits = units.map(u => 
             u.id === selectedUnitId 
               ? { ...u, x, y, ap: u.ap - reachableObj.apCost, facing: moveFacing }
               : u
           );
           const unitTeamColor = unit.team === 'player' ? 'Blue' : 'Red';
           addLog(`[MANEUVER] ${unitTeamColor} ${unit.class.className} advanced to quadrant ${getCoord(x, y)} (used ${reachableObj.apCost} AP).`, 'info');
           setSelectedUnitId(null);
           if(isOnline) updateOnlineState(newUnits, turn, activeTeam);
           else setUnits(newUnits);
         }
      }
    }
  };

  // Get all path tiles via Bresenham's line algorithm
  const getBresenhamPath = (x1: number, y1: number, x2: number, y2: number) => {
    const path = [];
    let dx = Math.abs(x2 - x1);
    let dy = -Math.abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;

    let cx = x1;
    let cy = y1;

    while (true) {
      path.push({ x: cx, y: cy });
      if (cx === x2 && cy === y2) break;

      let e2 = 2 * err;
      if (e2 >= dy) { err += dy; cx += sx; }
      if (e2 <= dx) { err += dx; cy += sy; }
    }
    return path;
  };

  const hoveredUnit = hoveredTile ? units.find(u => u.x === hoveredTile.x && u.y === hoveredTile.y && u.hp > 0) : null;
  const showLaserPath = mode === 'play' && selectedUnit && hoveredTile && hoveredUnit && selectedUnit.id !== hoveredUnit.id;

  const targetPathTiles = showLaserPath 
    ? getBresenhamPath(selectedUnit.x, selectedUnit.y, hoveredTile!.x, hoveredTile!.y)
    : [];

  const isOnTargetPath = (x: number, y: number) => {
    return targetPathTiles.some(t => t.x === x && t.y === y);
  };

  let firstBlockingTile: {x: number, y: number} | null = null;
  if (showLaserPath) {
    for (let i = 1; i < targetPathTiles.length - 1; i++) {
      const p = targetPathTiles[i];
      const cell = mapEnvironment[p.y]?.[p.x];
      if (cell && (cell.type === 'wall' || cell.type === 'crate')) {
        firstBlockingTile = p;
        break;
      }
    }
  }

  const renderHoverHUD = () => {
    if (!hoveredTile) {
      return (
        <div className="w-full bg-[#12150e]/90 border border-[#2d3324] py-1.5 px-3 rounded-t-lg flex items-center justify-between text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/45 animate-ping"></span>
            <span className="glow-text-green font-semibold">SYSTEM IDLE // SELECT ACTIVE VECTOR</span>
          </div>
          <div className="text-[9px]">CMD_MAT_XBR_1.0</div>
        </div>
      );
    }

    const { x, y } = hoveredTile;
    const cell = mapEnvironment[y]?.[x];
    const unitOnTile = units.find(u => u.x === x && u.y === y && u.hp > 0);

    let typeStr = "FLOOR SECTOR";
    let descStr = "OPEN SECTOR - SECURE PATH";
    let colorClass = "text-[#86966e]";

    if (cell?.type === 'wall') {
      typeStr = "REINFORCED COVER";
      descStr = "DEFENSIVE BARRIER - BLOCKS BALLISTICS";
      colorClass = "text-zinc-500";
    } else if (cell?.type === 'crate') {
      typeStr = "COMMODITY CONTAINER";
      descStr = "OBSTRUCTS PASSING - PROVIDES DESTRUCTIBLE SCREEN";
      colorClass = "text-[#fbbf24]";
    } else if (y >= 8) {
      typeStr = "BLUE INGRESS PORT";
      descStr = "PRIMARY ALLIED DEPLOYMENT VECTOR";
      colorClass = "text-sky-400";
    } else if (y <= 6) {
      typeStr = "RED ENGAGEMENT DECK";
      descStr = "TACTICAL ENEMY OCCUPANCY PERIMETER";
      colorClass = "text-red-400";
    }

    return (
      <div className="w-full bg-[#12150e]/95 border border-[#2d3324] py-1.5 px-3 rounded-t-lg flex flex-col md:flex-row justify-between items-start md:items-center text-[10px] font-mono select-none gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500">SECTOR:</span>
          <span className="text-white bg-[#1a2014] px-1.5 py-0.5 rounded border border-[#2d3324] font-bold font-mono">
            {String.fromCharCode(65 + x)}{(y + 1).toString().padStart(2, '0')} [{x.toString().padStart(2, '0')}, {y.toString().padStart(2, '0')}]
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-500 font-bold">TYPE:</span>
          <span className={`${colorClass} font-bold tracking-wider uppercase`}>{typeStr}</span>
        </div>
        <div className="text-[10px] uppercase">
          {unitOnTile ? (
            <span className={`${unitOnTile.team === 'player' ? 'text-sky-400 font-bold' : 'text-red-400 font-bold'} glow-text`}>
              TARGET DETECTED // {unitOnTile.class.className} [{unitOnTile.hp} / {unitOnTile.class.stats.maxHP} HP]
            </span>
          ) : (
            <span className="text-zinc-400">{descStr}</span>
          )}
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    if (mapEnvironment.length === 0) return null;

    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = mapEnvironment[y][x];
        const unit = units.find(u => u.x === x && u.y === y);
        const reachableObj = isReachableTileObj(x, y);
        
        let bgClass = 'amber-grid-bg relative hover:bg-slate-800/25 transition-colors duration-150'; // Military command base
        let borderClass = 'border-slate-800/60 border-[1px]';
        let content = null;
        let cellDecoration = null;
        let backgroundDecor = null;

        if (cell.type === 'floor') {
          // Decorative structural background sprites for empty tactical deck squares
          const hashVal = (x * 7 + y * 13);
          if (hashVal % 15 === 0) {
            backgroundDecor = (
              <div id={`bg-decor-grate-${x}-${y}`} className="absolute inset-[3px] opacity-25 pointer-events-none z-0">
                <svg viewBox="0 0 40 40" className="w-full h-full text-slate-550/40 stroke-current" fill="none" strokeWidth="1.2">
                  <rect x="4" y="4" width="32" height="32" rx="2" strokeWidth="0.8" />
                  <line x1="10" y1="12" x2="30" y2="12" />
                  <line x1="10" y1="18" x2="30" y2="18" />
                  <line x1="10" y1="24" x2="30" y2="24" />
                  <line x1="10" y1="30" x2="30" y2="30" />
                </svg>
              </div>
            );
          } else if (hashVal % 15 === 3) {
            backgroundDecor = (
              <div id={`bg-decor-conduit-${x}-${y}`} className="absolute inset-0 opacity-[0.25] pointer-events-none z-0">
                <svg viewBox="0 0 60 60" className="w-full h-full text-cyan-500/35 stroke-current" fill="none" strokeWidth="1.1">
                  <path d="M 0 30 L 24 30 L 30 36 L 60 36" />
                  <circle cx="24" cy="30" r="1.5" className="fill-cyan-400" />
                  <circle cx="30" cy="36" r="1.5" className="fill-cyan-400" />
                </svg>
              </div>
            );
          } else if (hashVal % 15 === 7) {
            backgroundDecor = (
              <div id={`bg-decor-corners-${x}-${y}`} className="absolute inset-[4px] opacity-[0.45] pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-slate-500/40" />
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-slate-500/40" />
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-slate-500/40" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-slate-500/40" />
              </div>
            );
          } else if (hashVal % 15 === 11) {
            backgroundDecor = (
              <div id={`bg-decor-hazard-${x}-${y}`} className="absolute inset-x-[2px] bottom-[2px] h-[1.5px] warning-stripes-blue opacity-25 pointer-events-none z-0" />
            );
          } else {
            backgroundDecor = (
              <div id={`bg-decor-wireframe-${x}-${y}`} className="absolute inset-[2.5px] border border-dashed border-slate-700/20 rounded-[1px] pointer-events-none z-0" />
            );
          }
        }

        // Coordinate indicator inside cell that lights up on group hover
        const cellCoord = (
          <span className="absolute top-[3px] left-[3px] text-[5.5px] font-mono tracking-tighter text-[#a8b59a]/35 group-hover:text-amber-400 font-extrabold select-none pointer-events-none transition-colors duration-150 z-2">
            {String.fromCharCode(65 + x)}{(y + 1).toString().padStart(2, '0')}
          </span>
        );

        // Weapon range fire envelope background coverage
        const distToSelected = selectedUnit ? Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y) : 999;
        const inFiringRange = selectedUnit && mode === 'play' && selectedUnit.team === activeTeam && distToSelected <= selectedUnit.class.stats.range && cell.type !== 'wall';
        let rangeEnvelopeOverlay = null;
        if (inFiringRange && !reachableObj && !unit) {
          rangeEnvelopeOverlay = (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_4px_rgba(245,158,11,0.1)]"></div>
            </div>
          );
        }

        // Line of Sight Laser Tracer calculation
        const pathIndex = targetPathTiles.findIndex(t => t.x === x && t.y === y);
        const isPathTile = pathIndex !== -1;
        const isBlockedSegment = firstBlockingTile 
          ? pathIndex > targetPathTiles.findIndex(t => t.x === firstBlockingTile.x && t.y === firstBlockingTile.y)
          : false;
        const isObstructionPoint = firstBlockingTile && firstBlockingTile.x === x && firstBlockingTile.y === y;

        let laserPathTracer = null;
        if (isPathTile && pathIndex !== 0 && pathIndex !== targetPathTiles.length - 1) {
          if (isBlockedSegment) {
            laserPathTracer = (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-1 h-1 rounded-full bg-red-400 shadow-[0_0_3px_#ef4444]" />
                <div className="absolute w-full h-[1px] bg-red-500/30 border-dashed" />
                <div className="absolute h-full w-[1px] bg-red-500/30 border-dashed" />
              </div>
            );
          } else {
            laserPathTracer = (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-200 shadow-[0_0_10px_rgba(74,222,128,1)] animate-ping duration-1000"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 border border-emerald-100 shadow-[0_0_6px_rgba(74,222,128,0.9)] z-10"></div>
                <div className="absolute w-full h-[1.5px] bg-emerald-500/60 shadow-[0_0_5px_rgba(74,222,128,0.6)]" />
                <div className="absolute h-full w-[1.5px] bg-emerald-500/60 shadow-[0_0_5px_rgba(74,222,128,0.6)]" />
              </div>
            );
          }
        }

        if (cell.type === 'wall') {
          bgClass = 'bg-zinc-950 relative overflow-hidden';
          borderClass = 'border-red-500/90 border-[1.5px] shadow-[0_0_10px_rgba(239,68,68,0.3)] z-5';
          cellDecoration = (
            <div className="absolute inset-0 bg-[#160d0e] flex flex-col items-center justify-center border border-red-650 shadow-[inset_0_0_12px_rgba(220,38,38,0.5)] z-5">
              {/* Tactical diagonal stripes at the top and bottom */}
              <div className="absolute inset-x-0 top-0 h-[3.5px] warning-stripes-red opacity-[0.75]"></div>
              <div className="absolute inset-x-0 bottom-0 h-[3.5px] warning-stripes-red opacity-[0.75]"></div>
              
              {/* Pulsing red reactor warning core */}
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300 shadow-[0_0_15px_rgba(244,63,94,1)] animate-pulse mb-0.5" />
              <span className="text-[6.5px] text-red-400 font-mono leading-none tracking-widest scale-90 select-none font-black drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">BLOCK</span>
              
              <div className="absolute top-1.5 left-1.5 text-[4.5px] text-red-500/90 font-mono font-extrabold">B-99</div>
              <div className="absolute bottom-1.5 right-1.5 text-[4.5px] text-red-500/90 font-mono font-extrabold font-black">SHIELD</div>
            </div>
          );
        } else if (cell.type === 'crate') {
          bgClass = 'bg-[#1b1208] relative';
          borderClass = 'border-amber-550 border-[1.5px] shadow-[0_0_8px_rgba(245,158,11,0.25)] z-5';
          cellDecoration = (
            <div className="absolute inset-1 bg-[#1a1106] border-2 border-amber-500/90 flex flex-col items-center justify-center rounded-[2px] shadow-md shadow-black/95 z-5">
              {/* Metal rivet-like corner frames */}
              <div className="absolute top-0.5 left-0.5 w-[3.5px] h-[3.5px] border-t border-l border-amber-400" />
              <div className="absolute top-0.5 right-0.5 w-[3.5px] h-[3.5px] border-t border-r border-amber-400" />
              <div className="absolute bottom-0.5 left-0.5 w-[3.5px] h-[3.5px] border-b border-l border-amber-400" />
              <div className="absolute bottom-0.5 right-0.5 w-[3.5px] h-[3.5px] border-b border-r border-amber-400" />
              
              <div className="absolute inset-[3px] border border-dashed border-amber-500/35 pointer-events-none" />
              <span className="text-[7.5px] text-amber-400 font-mono tracking-tighter leading-none font-black uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">CARGO</span>
              <span className="text-[5px] text-amber-500/90 font-mono mt-0.5 font-black">C-904</span>
            </div>
          );
        }

        // Action Point deploy warning zones
        let deployGridOverlay = null;
        let overlayClass = '';
        if (mode === 'deploy') {
           if (cell.type !== 'wall') {
              if (teamSelection === 'player' && y >= 8) {
                overlayClass = 'warning-stripes-blue opacity-30 border-t border-sky-400/20';
                deployGridOverlay = (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1">
                    <span className="text-[6px] font-mono text-sky-400 font-bold opacity-30 tracking-widest scale-75 select-none uppercase">PLY_DEP</span>
                  </div>
                );
              }
              if (teamSelection === 'enemy' && y <= 6) {
                overlayClass = 'warning-stripes-red opacity-30 border-b border-red-500/20';
                deployGridOverlay = (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1">
                    <span className="text-[6px] font-mono text-red-400 font-bold opacity-30 tracking-widest scale-75 select-none uppercase">ENM_DEP</span>
                  </div>
                );
              }
           }
        }
        
        if (reachableObj && !unit) {
           if (reachableObj.apCost === 1) {
             overlayClass = 'bg-sky-500/20 border-2 border-sky-400/50 hover:bg-sky-400/35 cursor-cell shadow-[inset_0_0_8px_rgba(56,189,248,0.3)] z-5';
           } else {
             overlayClass = 'bg-amber-500/20 border-2 border-amber-400/50 hover:bg-amber-400/35 cursor-cell shadow-[inset_0_0_8px_rgba(251,191,36,0.3)] z-5';
           }
           cellDecoration = (
              <div className="absolute bottom-1 right-1 text-[8px] font-mono font-black text-amber-400/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] z-10 select-none bg-black/50 px-1 rounded-sm border border-amber-500/10">
                -{reachableObj.apCost} AP
              </div>
           );
        }

        if (isAbilityActive && selectedUnit && selectedUnit.team === activeTeam && isValidAbilityTarget(x, y)) {
           const ability = selectedUnit.class.ability!;
           if (ability.type === 'heal' || ability.type === 'buff') {
              overlayClass = 'bg-emerald-500/20 border-2 border-emerald-400/60 cursor-crosshair shadow-[inset_0_0_12px_rgba(74,222,128,0.4)] animate-pulse z-5';
           } else if (ability.type === 'deploy') {
              overlayClass = 'bg-cyan-500/20 border-2 border-cyan-400/60 cursor-crosshair shadow-[inset_0_0_12px_rgba(56,189,248,0.4)] animate-pulse z-5';
           } else {
              overlayClass = 'bg-rose-500/20 border-2 border-rose-400/60 cursor-crosshair shadow-[inset_0_0_12px_rgba(244,63,94,0.4)] animate-pulse z-5';
           }
        }

        // If block obstruction point on line of sight laser path
        let obstacleAlert = null;
        if (isObstructionPoint) {
          obstacleAlert = (
            <div className="absolute inset-0 bg-rose-950/45 border border-red-500 flex flex-col items-center justify-center animate-pulse pointer-events-none z-20">
              <div className="absolute inset-0 warning-stripes-red opacity-25"></div>
              <span className="text-[6.5px] font-mono text-rose-300 font-extrabold bg-black/85 px-1 py-0.5 rounded shadow tracking-tighter uppercase">BLOCK</span>
            </div>
          );
        }

        let losClass = '';
        if (mode === 'play' && selectedUnit && selectedUnit.team === activeTeam && hoveredTile?.x === x && hoveredTile?.y === y && unit && unit.team !== activeTeam) {
           const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, x, y, mapEnvironment);
           if (hasLos) losClass = 'ring-2 ring-red-500 ring-offset-1 ring-offset-[#2a2e25] z-10 scale-105 transition-transform';
        }

        if (unit) {
            const archColor = ARCHETYPE_COLORS[unit.class.archetype as keyof typeof ARCHETYPE_COLORS] || 'text-white border-white/50';
            const archBgColor = ARCHETYPE_BG_COLORS[unit.class.archetype as keyof typeof ARCHETYPE_BG_COLORS] || 'bg-white/10';
            
            // Dynamic archetype-based color coding
            const arch = unit.class.archetype;
            let archBorderColor = 'border-zinc-400';
            let archGlowColor = 'rgba(226, 232, 240, 0.2)';
            let archShadowColor = 'shadow-[0_0_8px_rgba(226,232,240,0.35)]';
            
            if (arch === 'Short Range') {
              archBorderColor = 'border-amber-400';
              archGlowColor = 'rgba(251, 191, 36, 0.25)';
              archShadowColor = 'shadow-[0_0_10px_rgba(251,191,36,0.5)]';
            } else if (arch === 'Long Range') {
              archBorderColor = 'border-sky-400';
              archGlowColor = 'rgba(56, 189, 248, 0.25)';
              archShadowColor = 'shadow-[0_0_10px_rgba(56,189,248,0.5)]';
            } else if (arch === 'Support') {
              archBorderColor = 'border-emerald-400';
              archGlowColor = 'rgba(74, 222, 128, 0.25)';
              archShadowColor = 'shadow-[0_0_10px_rgba(74,222,128,0.5)]';
            } else if (arch === 'Explosives') {
              archBorderColor = 'border-orange-500';
              archGlowColor = 'rgba(249, 115, 22, 0.25)';
              archShadowColor = 'shadow-[0_0_10px_rgba(249,115,22,0.5)]';
            } else if (arch === 'Assault') {
              archBorderColor = 'border-zinc-300';
              archGlowColor = 'rgba(226, 232, 240, 0.2)';
              archShadowColor = 'shadow-[0_0_10px_rgba(226,232,240,0.35)]';
            }

            let unitOutline = `${archBorderColor} ${archShadowColor}`;
            let deathClass = unit.hp <= 0 ? 'opacity-0 scale-50 transition-all duration-500 ease-in-out' : 'opacity-100 scale-100 transition-all duration-500 ease-in-out';
            
            let unitGlow = archGlowColor;
            let unitBaseBg = unit.team === 'player' ? 'rgba(8, 20, 36, 0.95)' : 'rgba(30, 10, 14, 0.95)';

            // Breath/pulse ring for turn active units that have AP
            let activeUnitPulseRing = null;
            if (mode === 'play' && activeTeam === unit.team && unit.ap > 0) {
               const activeColorClass = unit.team === 'player' ? 'border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.4)]' : 'border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
               activeUnitPulseRing = (
                 <div className={`absolute -inset-[1px] border border-dashed rounded-[4px] animate-pulse ${activeColorClass} pointer-events-none z-10`} />
               );
            }

            // High-polish selected target box
            let selectionReticle = null;
            if (selectedUnitId === unit.id) {
               unitOutline += unit.team === 'player' ? ' selected-unit-blue' : ' selected-unit-red';
               selectionReticle = (
                 <div className="absolute -inset-[2px] border-2 border-amber-400 pointer-events-none z-20 rounded-[5px]">
                   <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400" />
                   <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400" />
                   <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400" />
                   <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400" />
                   <div className="absolute inset-1 border border-dashed border-amber-400/30 animate-spin" style={{ animationDuration: '10s' }} />
                 </div>
               );
            }

            const targetableBySelected = selectedUnit && unit.team !== selectedUnit.team && mode === 'play' && selectedUnit.team === activeTeam;
            let targetOverlayClass = '';
            let targetBadge = null;

            if (targetableBySelected) {
               const dist = Math.abs(selectedUnit.x - unit.x) + Math.abs(selectedUnit.y - unit.y);
               const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, unit.x, unit.y, mapEnvironment);
               const inRange = dist <= selectedUnit.class.stats.range;
               
               if (inRange && hasLos && selectedUnit.ap >= 1) {
                  targetOverlayClass = 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse scale-105';
                  targetBadge = (
                     <div className="absolute -top-1 -right-1 bg-red-600 border border-red-400 text-[6.5px] text-white font-mono scale-90 px-1 py-0.5 rounded shadow z-40 font-black animate-bounce tracking-tighter">
                        LOCK
                     </div>
                  );
               } else if (hoveredTile?.x === unit.x && hoveredTile?.y === unit.y) {
                  const reasonText = !inRange ? 'RANGE' : 'OBST';
                  targetBadge = (
                     <div className="absolute -top-1.5 -right-1.5 bg-amber-600 border border-amber-400 text-[6px] text-white font-mono scale-80 px-1 py-0.5 rounded shadow z-40 font-black">
                        {reasonText}
                     </div>
                  );
               }
            }

            const isPlayerTeam = unit.team === 'player';
            const factionTag = (
              <div className={`absolute top-[2px] left-[3px] px-[4px] py-[0.5px] rounded-[2px] pointer-events-none select-none z-20 ${isPlayerTeam ? 'bg-sky-500 text-black shadow-[0_0_4px_rgba(56,189,248,0.4)]' : 'bg-rose-600 text-white shadow-[0_0_4px_rgba(244,63,94,0.4)]'}`}>
                <span className="text-[5.5px] font-mono leading-none tracking-tighter uppercase font-black">
                  {isPlayerTeam ? 'BLUE' : 'OPP'}:{unit.class.className.slice(0, 3)}
                </span>
              </div>
            );

            const apLights = (
              <div className="absolute top-[2px] right-[3px] flex gap-[1px] items-center pointer-events-none z-20 bg-black/70 px-[2.5px] py-[1px] rounded-[1.5px] border border-white/5">
                {Array.from({ length: 2 }).map((_, i) => (
                   <span 
                     key={i} 
                     className={`w-[3px] h-[3px] rounded-full transition-all ${
                        i < unit.ap 
                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.9)]' 
                        : 'bg-zinc-850'
                     }`}
                   />
                ))}
              </div>
            );

            const healthBar = (
              <div className="absolute left-[8%] right-[8%] bottom-[4px] h-[2.5px] bg-black/80 border border-zinc-950 rounded-full overflow-hidden p-[0.3px] z-20">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${unit.hp < unit.class.stats.maxHP * 0.35 ? 'bg-red-500 shadow-[0_0_4px_#f43f5e]' : 'bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]'}`} 
                  style={{ width: `${Math.max(0, (unit.hp / unit.class.stats.maxHP) * 100)}%` }}
                />
              </div>
            );

            const unitSpriteFrame = (
              <div className="w-full h-full p-1 flex items-center justify-center relative overflow-visible select-none pointer-events-none">
                <UnitSprite 
                  classVal={unit.class.className} 
                  team={unit.team} 
                  facing={unit.facing || (isPlayerTeam ? 'right' : 'left')}
                  pose={unit.pose || 'idle'}
                  className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] filter transition-transform duration-300 pointer-events-none" 
                />
              </div>
            );

            content = (
              <div 
                id={`unit-card-${unit.id}`}
                className={`absolute inset-0 flex flex-col justify-center items-center transition-all duration-300 z-10 ${targetOverlayClass} ${deathClass}`}
              >
                 {targetBadge}
                 {selectionReticle}
                 {activeUnitPulseRing}
                 
                 {factionTag}
                 {apLights}
                 {unitSpriteFrame}
                 {healthBar}
              </div>
            );
        }

        grid.push(
          <div
            key={`${x}-${y}`}
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => setHoveredTile({x, y})}
            onMouseLeave={() => setHoveredTile(null)}
            className={`w-full pt-[100%] relative transition-all cursor-pointer rounded-sm group ${bgClass} ${borderClass} ${losClass}`}
          >
            {backgroundDecor}
            {content}
            {cellCoord}
            {rangeEnvelopeOverlay}
            {laserPathTracer}
            {obstacleAlert}
            {deployGridOverlay}
            {overlayClass && <div className={`absolute inset-0 ${overlayClass} z-0`}></div>}
            {cell.type === 'wall' && <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]"></div>}
            
            {damageTexts.filter(dt => dt.x === x && dt.y === y).map(dt => {
               let displayText = `-${dt.amount}`;
               let colorClass = 'text-rose-500';
               if (dt.amount < 0) {
                  if (dt.amount === -1) {
                     displayText = '+1 AP';
                     colorClass = 'text-amber-400';
                  } else {
                     displayText = `+${Math.abs(dt.amount)} HP`;
                     colorClass = 'text-emerald-400';
                  }
               } else if (dt.amount === 0) {
                  displayText = 'CONSTRUCT';
                  colorClass = 'text-cyan-400';
               }
               return (
                 <div key={dt.id} className="absolute inset-0 z-50 flex items-center justify-center animate-out slide-out-to-top-8 fade-out duration-1000 fill-mode-forwards pointer-events-none">
                   <span className={`text-sm sm:text-lg font-black ${colorClass} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter drop-shadow animate-bounce`}>{displayText}</span>
                 </div>
               );
            })}
          </div>
        );
      }
    }
    return grid;
  };

  const renderRoster = (team: 'player' | 'enemy') => {
    const isPlayer = team === 'player';
    const deployedCount = units.filter(u => u.team === team).length;
    
    // Online lock checks
    if (isOnline && team !== myTeam) {
        return (
           <div className="text-[#8b9180] text-xs font-mono uppercase tracking-wider italic p-4 text-center border border-dashed border-[#2d3422]/50 rounded bg-black/10">
             Awaiting remote opponent deployment sequences...
           </div>
        );
    }
    
    return (
      <div className="font-mono">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-[#8b9180] font-black uppercase tracking-widest">
            {deployedCount} / 4 COMM UNITS SYNCED
          </span>
          {deployedCount >= 4 && (
            <span className="text-[8px] text-[#fbbf24] font-black uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              SQUAD CAPACITY LOCKED
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
          {CLASSES.map((c) => {
            const isSelected = selectedClass?.className === c.className && teamSelection === team;
            const arch = c.archetype;
            
            // Archetype color styling for off-board roster
            let rosterArchBorderClass = 'border-[#38422a] bg-[#12160d]/75 text-[#8b9180] hover:border-[#5a6a48] hover:text-[#dae3ce]';
            if (arch === 'Short Range') {
              rosterArchBorderClass = 'border-amber-500/35 bg-amber-950/10 text-amber-400/80 hover:border-amber-400 hover:text-amber-200';
            } else if (arch === 'Long Range') {
              rosterArchBorderClass = 'border-sky-500/35 bg-sky-950/10 text-sky-450/80 hover:border-sky-400 hover:text-sky-200';
            } else if (arch === 'Support') {
              rosterArchBorderClass = 'border-emerald-500/35 bg-emerald-950/10 text-emerald-400/80 hover:border-emerald-450 hover:text-emerald-200';
            } else if (arch === 'Explosives') {
              rosterArchBorderClass = 'border-orange-500/35 bg-orange-950/10 text-orange-400/80 hover:border-orange-450 hover:text-orange-200';
            } else if (arch === 'Assault') {
              rosterArchBorderClass = 'border-zinc-500/35 bg-zinc-900/10 text-zinc-300/80 hover:border-zinc-300 hover:text-zinc-100';
            }

             return (
              <button
                key={c.className}
                disabled={deployedCount >= 4 && !isSelected}
                onClick={() => { setSelectedClass(c); setTeamSelection(team); }}
                className={`
                  text-left p-1 sm:p-1.5 rounded border transition-all flex flex-col justify-between cursor-pointer min-h-[48px] sm:min-h-[58px]
                  ${isSelected 
                    ? (isPlayer ? 'border-sky-500 bg-sky-500/25 text-sky-300 font-extrabold shadow-[0_0_8px_rgba(56,189,248,0.45)]' : 'border-rose-500 bg-rose-500/25 text-rose-300 font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.45)]')
                    : rosterArchBorderClass}
                  ${deployedCount >= 4 && !isSelected ? 'opacity-25 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex gap-1.5 items-center w-full">
                  <UnitHelmetAvatar 
                    classNameVal={c.className} 
                    team={team} 
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-[#10140c]/85 border border-[#3e4835]/50 shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-0.5 w-full text-[6.5px] xs:text-[8px] sm:text-[9.5px] uppercase font-black leading-tight mb-0.5">
                      <span className="truncate">{c.className}</span>
                      {getArchetypeIcon(c.archetype, 'w-2.5 h-2.5 opacity-90 shrink-0')}
                    </div>
                    <div className="flex justify-between gap-0.5 w-full text-[5.5px] xs:text-[7.5px] sm:text-[8.5px] font-black leading-none text-zinc-400">
                      <span className="text-emerald-450">{c.stats.maxHP}H</span>
                      <span className="text-amber-450">{c.stats.damage}A</span>
                      <span className="text-sky-350">{c.stats.range}R</span>
                    </div>
                  </div>
                </div>
              </button>
             );
          })}
        </div>
      </div>
    );
  };

  const renderUnitInfo = (team: 'player' | 'enemy') => {
    const isPlayer = team === 'player';
    const activeColor = isPlayer ? 'text-sky-400' : 'text-rose-400';
    const isMyUnitControl = mode === 'play' && selectedUnit && selectedUnit.team === team && activeTeam === team && (!isOnline || myTeam === team);

    if (selectedUnit && selectedUnit.team === team) {
      // Find the coordinate of this unit
      const unitCoord = `${String.fromCharCode(65 + selectedUnit.x)}${(selectedUnit.y + 1).toString().padStart(2, '0')}`;
      
      return (
         <div className="flex flex-col bg-black/45 rounded border border-[#2d3422]/65 w-full gap-3 p-3">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
               <div className="flex gap-3 items-center min-w-0">
                  {/* Tactical Holographic Video Feed Box */}
                  <div className="w-12 h-12 relative bg-black border border-[#2d3422]/85 rounded overflow-hidden shrink-0 group shadow-md text-emerald-500">
                    {/* Seeded Operator Satellite Image Styled to Cyberpunk Nightvision */}
                    <img 
                      src={`https://picsum.photos/seed/cyber-operator-${selectedUnit.class.className.toLowerCase()}-${selectedUnit.team}/110/110`}
                      alt={`${selectedUnit.class.className} Live Feed`}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover opacity-60 mix-blend-color-dodge transition-all duration-300 filter contrast-135 brightness-110 grayscale saturate-[150%] ${selectedUnit.team === 'player' ? 'hue-rotate-[140deg] sepia-[20%]' : 'hue-rotate-[-30deg] sepia-[10%] brightness-95 animate-pulse'}`}
                    />
                    
                    {/* Dynamic Helmet Overlay centered on top */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <UnitHelmetAvatar classNameVal={selectedUnit.class.className} team={selectedUnit.team} className="w-8 h-8 border-transparent bg-transparent shrink-0 opacity-85 shadow-none" />
                    </div>

                    {/* Scanlines Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>
                  </div>
                 <div className="min-w-0">
                   <h3 className="font-extrabold uppercase tracking-wider text-white text-sm leading-tight flex items-center gap-2">
                     {selectedUnit.class.className}
                     <span className="text-[8px] bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded text-[#fbbf24] font-mono px-1.5 py-[1px] font-black select-none shrink-0">
                       LOC: {unitCoord}
                     </span>
                   </h3>
                   <p className="text-[10px] text-[#8b9180] mt-1 uppercase leading-snug">{selectedUnit.class.description}</p>
                 </div>
               </div>

               <div className="flex gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  <div className="text-center bg-black/40 border border-[#2d3422]/40 px-3 py-1.5 rounded flex-1 md:flex-initial">
                    <div className="text-[8px] text-[#8b9180] font-bold uppercase tracking-wider mb-0.5">HEALTH POINTS</div>
                    <div className="text-emerald-400 font-mono text-xs font-black tracking-wider flex items-center justify-center gap-1">
                      {selectedUnit.hp} <span className="text-[9px] text-[#fbbf24]/60">/ {selectedUnit.class.stats.maxHP}</span>
                    </div>
                  </div>
                  <div className="text-center bg-black/40 border border-[#2d3422]/40 px-3 py-1.5 rounded flex-1 md:flex-initial">
                    <div className="text-[8px] text-[#8b9180] font-bold uppercase tracking-wider mb-0.5">ACTIONS (AP)</div>
                    <div className="text-amber-400 font-mono text-xs font-black tracking-wider">
                      {selectedUnit.ap} <span className="text-[9px] text-zinc-500">/ 2</span>
                    </div>
                  </div>
                  <div className="text-left py-1 text-[8px] uppercase text-[#8b9180] font-bold space-y-0.5 pl-1 hidden sm:block">
                    <div className="flex justify-between gap-3 font-mono"><span>Mobility:</span><span className="text-white font-black">{selectedUnit.class.stats.mobility}</span></div>
                    <div className="flex justify-between gap-3 font-mono"><span>Damage:</span><span className="text-white font-black">{selectedUnit.class.stats.damage}</span></div>
                    <div className="flex justify-between gap-3 font-mono"><span>Range:</span><span className="text-white font-black">{selectedUnit.class.stats.range}</span></div>
                  </div>
               </div>
            </div>

            {selectedUnit.class.ability && isMyUnitControl && (
              <div className="pt-2 border-t border-[#2d3422]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1 font-mono uppercase">
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] font-black text-amber-500 font-mono uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      SPE_ABIL: {selectedUnit.class.ability.name}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-black">
                      COSTS {selectedUnit.class.ability.apCost} Action Pt
                    </span>
                  </div>
                  <p className="text-[8px] text-[#8b9180] lowercase italic leading-tight first-letter:uppercase mt-1.5">{selectedUnit.class.ability.description}</p>
                </div>
                
                <button
                  disabled={selectedUnit.ap < selectedUnit.class.ability.apCost}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedUnit.class.ability?.type === 'self') {
                       handleSelfAbility();
                    } else {
                       setIsAbilityActive(!isAbilityActive);
                    }
                  }}
                  className={`
                    px-4 py-1.5 text-[10px] font-black uppercase tracking-widest font-mono rounded border transition-all shrink-0 w-full sm:w-auto text-center cursor-pointer
                    ${isAbilityActive 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] animate-pulse'
                      : (selectedUnit.ap < selectedUnit.class.ability.apCost 
                         ? 'bg-black/30 border-transparent text-zinc-600 cursor-not-allowed opacity-55' 
                         : 'bg-[#202716] hover:bg-[#2d3a20] border-[#2d3422] text-[#fbbf24] shadow-[0_0_12px_rgba(45,52,34,0.3)] hover:scale-[1.01]')}
                  `}
                >
                  {isAbilityActive ? 'Cancel Ability' : 'Activate Ability'}
                </button>
              </div>
            )}
         </div>
      );
    }
    return (
       <div className="text-[#8b9180] text-xs font-mono uppercase tracking-wider italic p-4 text-center border border-dashed border-[#2d3422]/50 rounded bg-black/10">
         No active {team} squad unit selected. {mode === 'play' && team === activeTeam ? 'Click a unit on the grid battlefield to select.' : ''}
       </div>
    );
  };

  const handleStartBattle = () => {
    let currentUnits = [...units];
    if (gameMode === 'local_ai' && currentUnits.filter(u => u.team === 'enemy').length === 0) {
       for(let i=0; i<4; i++) {
          let x, y;
          do {
             x = Math.floor(Math.random() * GRID_SIZE);
             y = Math.floor(Math.random() * 4); // Top rows 0-3
          } while(currentUnits.some(u => u.x === x && u.y === y) || (mapEnvironment[y] && mapEnvironment[y][x].type === 'wall'));
          const randClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
          currentUnits.push({
             id: crypto.randomUUID(),
             class: randClass,
             x, y, hp: randClass.stats.maxHP, ap: 2, team: 'enemy'
          });
       }
       setUnits(currentUnits);
    }

    const rolledWinner = Math.random() < 0.5 ? 'player' : 'enemy';

    if (isOnline) {
       updateOnlineState(currentUnits, 1, rolledWinner, 'play');
    } else {
       setCoinFlipping(true);
       setCoinSpinning(true);
       setCoinWinner(rolledWinner);
       
       setTimeout(() => {
          setCoinSpinning(false);
       }, 1700);

       setTimeout(() => {
          setMode('play');
          setActiveTeam(rolledWinner);
          setTurn(1);
          setCoinFlipping(false);
          addLog(`[COIN TOSS] Satellite positioning telemetry initialized. ${rolledWinner === 'player' ? 'Blue' : 'Red'} Squad won initiative and receives the first move!`, 'system');
       }, 2500);
       setSelectedUnitId(null);
    }
  };

  const playerDeployedCount = units.filter(u => u.team === 'player').length;
  const enemyDeployedCount = units.filter(u => u.team === 'enemy').length;
  const isEnemyReady = enemyDeployedCount > 0;
  const isPlayerReady = playerDeployedCount > 0;

  const canStartBattleHook = 
    mode === 'play' || (
      gameMode === 'local_ai' ? playerDeployedCount === 4 :
      gameMode === 'local_p2p' ? playerDeployedCount === 4 && enemyDeployedCount === 4 :
      /* online */ playerDeployedCount === 4 && enemyDeployedCount === 4
    );

  const renderDeployGuidance = () => {
    if (mode !== 'deploy') return null;
    
    if (gameMode === 'local_p2p') {
      if (playerDeployedCount < 4) {
        return (
          <div className="bg-sky-950/20 border border-sky-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-sky-300 leading-normal">
            <span className="font-extrabold text-sky-400 bg-sky-400/10 border border-sky-450/40 px-1.5 py-0.5 rounded mr-2">STEP 1 / 2</span>
            First, <span className="font-extrabold text-sky-400">Player 1 (Blue Squad)</span>: Click any class inside the bottom roster, then click on the grid highlighted bottom rows (Rows 09-15) to place exactly 4 units.
          </div>
        );
      } else if (enemyDeployedCount < 4) {
        return (
          <div className="bg-red-950/20 border border-red-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-[#ef4444] leading-normal">
            <span className="font-extrabold text-red-550 bg-red-400/10 border border-red-410/40 px-1.5 py-0.5 rounded mr-2">STEP 2 / 2</span>
            Now, <span className="font-extrabold text-rose-450">Player 2 (Red Squad)</span>: Click inside the Red Forces Terminal (the top panel header) to switch deployment team, then choose unit classes and deploy exactly 4 units in the top rows (Rows 01-07).
          </div>
        );
      } else {
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-amber-400 leading-normal animate-pulse">
            <span className="font-extrabold text-black bg-[#fbbf24] px-1.5 py-0.5 rounded mr-2">SQUADS LOCKED</span>
            Full rosters successfully built! Click the <span className="font-extrabold text-amber-300">Battle Phase</span> button above to trigger the Coin Toss and start playing!
          </div>
        );
      }
    } else if (gameMode === 'local_ai') {
      if (playerDeployedCount < 4) {
        return (
          <div className="bg-sky-950/20 border border-sky-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-sky-300 leading-normal">
            <span className="font-extrabold text-sky-400 bg-sky-400/10 border border-sky-450/40 px-1.5 py-0.5 rounded mr-2">DEPLOY SQUAD</span>
            Select a class from the roster below and deploy exactly 4 units on the bottom rows to lock in your squad. The robot AI forces will automatically populate opposite you.
          </div>
        );
      } else {
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-amber-400 leading-normal">
            <span className="font-extrabold text-black bg-[#fbbf24] px-1.5 py-0.5 rounded mr-2">READY TO DEPLOY</span>
            Tactical squad ready! Click <span className="font-extrabold text-amber-300">Battle Phase</span> above to roll initiative and launch your insertion!
          </div>
        );
      }
    } else if (gameMode === 'online') {
      const amIReady = myTeam === 'player' ? playerDeployedCount === 4 : enemyDeployedCount === 4;
      const opponentReady = myTeam === 'player' ? enemyDeployedCount === 4 : playerDeployedCount === 4;
      
      if (!amIReady) {
        return (
          <div className="bg-sky-950/20 border border-sky-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-sky-300 leading-normal">
            <span className="font-extrabold text-sky-400 bg-sky-400/10 border border-sky-450/40 px-1.5 py-0.5 rounded mr-2">ONLINE DEPLOY</span>
            Please position exactly 4 tactical units on your designated grid rows. Select classes and position them.
          </div>
        );
      } else if (!opponentReady) {
        return (
          <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 rounded text-[10px] font-mono uppercase text-zinc-400 leading-normal animate-pulse">
            <span className="font-extrabold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded mr-2">AWAITING OPPONENT</span>
            You are fully deployed. Awaiting remote opponent to finish synchronizing their tactical squad deployment.
          </div>
        );
      } else {
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-amber-400 leading-normal font-black">
            <span className="font-extrabold text-black bg-[#fbbf24] px-1.5 py-0.5 rounded mr-2">SYMMETRIC SYNC LOCK</span>
            Both squads synchronized! {isHost ? "Click 'Battle Phase' to trigger the initiative roll!" : "Waiting for Host to begin battle..."}
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0e100c] text-[#dae3ce] font-sans p-2 sm:p-4 flex flex-col items-center justify-start relative overflow-x-hidden md:overflow-y-auto">
      {/* Subtle CRT Overlay */}
      <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] mix-blend-overlay"></div>

      {showHandoff && pendingTurnData && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
           <div className="bg-[#141810] border-2 border-[#424f35] p-10 flex flex-col items-center min-w-[320px] shadow-2xl rounded-lg max-w-sm text-center">
              <h1 className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 text-center ${handoffTarget === 'player' ? 'text-[#38bdf8] drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-[#ef4444] drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`}>
                {handoffTarget === 'player' ? 'BLUE SQUAD' : 'RED SQUAD'} TURN
              </h1>
              <p className="text-sm font-mono text-amber-500/80 tracking-widest uppercase mb-8 leading-relaxed">
                PASS THE DEVICE TO {handoffTarget === 'player' ? 'PLAYER 1 (BLUE)' : 'PLAYER 2 (RED)'}
              </p>
              <button 
                onClick={handleConfirmHandoff} 
                className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-mono font-black uppercase tracking-widest transition-colors border border-amber-400 rounded shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                I AM READY
              </button>
           </div>
        </div>
      )}

      {winner && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm">
           <div className="bg-[#141810] border-2 border-[#424f35] p-10 flex flex-col items-center min-w-[320px] shadow-2xl rounded-lg">
              <h1 className={`text-4xl sm:text-6xl font-black uppercase tracking-[0.22em] mb-4 text-center ${winner === myTeam || winner === 'player' ? 'text-[#38bdf8] drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-[#ef4444] drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`}>
                {winner === myTeam ? 'TACTICAL VICTORY' : (myTeam ? 'TACTICAL DEFEAT' : (winner === 'player' ? 'BLUE TEAM WINS' : 'RED TEAM WINS'))}
              </h1>
              <p className="text-sm font-mono text-[#8b9180] tracking-widest uppercase mb-8">SECURE FIELD OPERATION DISMISSED</p>
              <button 
                onClick={onBack} 
                className="px-8 py-3 bg-[#242b1e] hover:bg-[#323c2a] text-[#fbbf24] font-mono font-bold uppercase tracking-widest transition-colors border border-[#424f35] rounded shadow-md"
              >
                RETURN TO COMMAND
              </button>
           </div>
        </div>
      )}

      {/* Main Grid Frame */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 relative z-10 animate-fade-in">
        
        {/* TOP COMMAND HUD */}
        <div className="w-full bg-[#141810] border border-[#2d3422] px-4 py-3.5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-[#21271b] p-2 rounded border border-[#3c4630] shrink-0">
              <Radar className="w-5 h-5 text-[#f59e0b] animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h1 className="text-md font-black tracking-widest text-[#fbbf24] uppercase font-mono flex items-center gap-2">
                TACTICAL COMMAND // SECURE PORTAL
                <span className="text-[10px] bg-[#fbbf24]/10 border border-[#fbbf24]/40 px-1.5 py-[1px] font-mono text-[#fbbf24] rounded">v4.2.1-SEC</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>COMM SECTOR: ESTABLISHED</span>
                </span>
                <span className="text-[#3c4630] hidden sm:inline">|</span>
                <span>NET SEGMENT: <span className="text-zinc-200">{isOnline ? 'MULTIPLAYER SYNC' : 'LOCAL SIMULATOR'}</span></span>
                {isOnline && (
                  <>
                    <span className="text-[#3c4630] hidden sm:inline">|</span>
                    <span className="text-sky-400">ROLE: {myTeam === 'player' ? 'BLUE COMMANDER' : 'RED OPONENT'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex gap-1 p-0.5 bg-black/40 rounded border border-[#2d3324]/80 font-mono w-full sm:w-auto justify-center sm:justify-start">
              <button 
                onClick={() => { 
                   if (!isOnline && mode !== 'play') { setMode('deploy'); setSelectedUnitId(null); }
                }}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded uppercase transition-all flex items-center gap-1.5 ${mode === 'deploy' ? 'bg-[#2a3022] text-[#fbbf24] border border-[#48533b]' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'} ${mode === 'play' ? 'opacity-50 cursor-not-allowed hidden md:flex' : ''}`}
                disabled={mode === 'play'}
              >
                <Users className="w-3.5 h-3.5" /> Deploy Phase
              </button>
              <button 
                onClick={handleStartBattle}
                disabled={!canStartBattleHook || (isOnline && !isHost && mode === 'deploy')}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded uppercase transition-all flex items-center gap-1.5 ${mode === 'play' ? 'bg-[#2563eb]/20 border border-[#2563eb]/50 text-sky-300' : (canStartBattleHook ? 'bg-emerald-600 text-white animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400' : 'text-zinc-400 hover:text-zinc-200 border border-transparent disabled:opacity-30')}`}
              >
                <Crosshair className="w-3.5 h-3.5" /> Battle Phase
              </button>
            </div>

            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4c1d1d]/30 border border-[#991b1b]/50 hover:bg-[#991b1b]/20 text-red-200 rounded text-xs font-mono font-bold uppercase transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>

        {/* HUD CORE DISPLAY FLOW */}
        <div className="flex flex-col gap-4 w-full">
          
          {/* 0. SYSTEM STATUS CONTROL PORTAL */}
          <div className="bg-[#141810] border border-[#38422a] p-3 sm:p-4 rounded-lg flex flex-col gap-3 shadow-lg select-none">
            {/* STATUS BAR HUD */}
            <div>
              {renderHoverHUD()}
            </div>

            {renderDeployGuidance()}

            <TurnCounter 
              turn={turn}
              activeTeam={activeTeam}
              mode={mode}
              isOnline={isOnline}
              myTeam={myTeam}
              onEndTurn={handleEndTurn}
              gameMode={gameMode}
              timeLeft={timeLeft}
              onForceEndTurn={handleEndTurn}
              units={units}
            />
          </div>

          {/* 1. ENEMY/RED FORCES TERMINAL (TOP) */}
          <div 
            className={`p-2.5 sm:p-3.5 rounded-lg border transition-all duration-300 ${
              (activeTeam === 'enemy' && mode === 'play') || (mode === 'deploy' && teamSelection === 'enemy') 
                ? 'border-red-500/50 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                : 'border-[#2d3422] bg-[#141810]/95'
            } ${mode === 'deploy' && (!isOnline || myTeam === 'enemy') ? 'cursor-pointer hover:border-red-500/40' : ''}`}
            onClick={() => {
              if (mode === 'deploy' && (!isOnline || myTeam === 'enemy')) {
                setTeamSelection('enemy');
              }
            }}
          >
             <h2 className="text-red-400 font-bold mb-3 uppercase tracking-widest text-xs font-mono flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${activeTeam === 'enemy' && mode === 'play' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-red-910/20'}`}></div>
               RED SQUAD (HOSTILE COMMAND) {isOnline && (myTeam === 'enemy' ? '(You)' : '(Opponent)')}
               {mode === 'deploy' && <span className="text-zinc-500 font-normal font-mono normal-case text-[10px] ml-auto">Deploy in top rows</span>}
             </h2>
             {mode === 'deploy' ? renderRoster('enemy') : renderUnitInfo('enemy')}
          </div>

          {/* 2. GRID CONSOLE CARD (MIDDLE) */}
          <div className="bg-[#141810] border border-[#2d3422] rounded-lg p-3 sm:p-5 flex flex-col items-center justify-start shadow-lg">
            <div className="w-full">
              
              {/* Aligned Coordinate Scales with Battlefield Grid */}
              <div className="w-full flex flex-col p-1 sm:p-2 bg-[#090b07] border border-[#1e2317] rounded overflow-hidden select-none">
                {/* Column labels scale (A-O) */}
                <div 
                  className="grid gap-[1px] w-full mb-1" 
                  style={{ 
                    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, 
                    paddingLeft: '24px' // width of row labels column (20px) + gap space (4px)
                  }}
                >
                  {Array.from({ length: GRID_SIZE }).map((_, i) => (
                    <div key={i} className="text-center text-[7.5px] sm:text-[9.5px] font-mono text-[#afd19c] font-black py-0.5 select-none uppercase tracking-wider bg-black/60 border border-[#445236] rounded-[1px]">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>

                <div className="flex w-full items-stretch">
                  {/* Row labels vertical column (01-15) */}
                  <div className="flex flex-col gap-[1px] select-none text-right w-[20px] mr-1">
                    {Array.from({ length: GRID_SIZE }).map((_, i) => (
                      <div key={i} className="flex-1 flex items-center justify-center text-[7.5px] sm:text-[9.5px] font-mono text-[#afd19c] font-black bg-black/60 border border-[#445236] rounded-[1px] py-1 select-none">
                        {(i + 1).toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>

                  {/* Actual battlefield grid */}
                  <div className="flex-1 relative">
                    <div 
                      className={`grid gap-[1px] w-full transition-all border-2 border-[#546843] bg-[#12150e] shadow-inner rounded overflow-hidden ${shake ? 'translate-x-1 translate-y-1' : ''}`}
                      style={{ 
                        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                        backgroundColor: '#1b2015'
                      }}
                    >
                      {renderGrid()}
                    </div>
                    {/* Floating Tactical Bubble for Selected Unit */}
                    {selectedUnit && mode === 'play' && (
                      <div 
                        className="absolute z-50 pointer-events-none p-2"
                        style={{
                          left: selectedUnit.x > 7 ? '2px' : 'auto',
                          right: selectedUnit.x <= 7 ? '2px' : 'auto',
                          top: selectedUnit.y > 7 ? '2px' : 'auto',
                          bottom: selectedUnit.y <= 7 ? '2px' : 'auto',
                        }}
                      >
                        <div className="w-44 sm:w-52 bg-black/95 text-[#dae3ce] p-2 rounded border border-[#546843] shadow-[0_0_15px_rgba(0,0,0,0.8)] font-mono text-[8px] flex flex-col gap-1.5 opacity-95 backdrop-blur-sm relative">
                           <div className="flex justify-between items-center border-b border-[#2d3422] pb-1">
                             <span className={`font-extrabold text-[10px] truncate ${selectedUnit.team === 'player' ? 'text-sky-400' : 'text-rose-400'}`}>{selectedUnit.class.className}</span>
                             <span className="bg-amber-400/20 border border-amber-500/30 text-amber-500 font-bold px-1 rounded truncate ml-1">{selectedUnit.class.archetype}</span>
                           </div>
                           <div className="text-[7.5px] italic text-[#8b9180] leading-tight break-words whitespace-normal">{selectedUnit.class.description}</div>
                           <div className="grid grid-cols-4 gap-1 mt-1 text-center font-black">
                             <div className="border border-[#2d3422] rounded p-1 bg-[#12150e] flex flex-col justify-center">
                               <span className="text-[#8b9180] text-[6px] uppercase tracking-wider mb-0.5">HP</span>
                               <span className="text-emerald-400">{selectedUnit.hp}</span>
                             </div>
                             <div className="border border-[#2d3422] rounded p-1 bg-[#12150e] flex flex-col justify-center">
                               <span className="text-[#8b9180] text-[6px] uppercase tracking-wider mb-0.5">AP</span>
                               <span className="text-amber-400">{selectedUnit.ap}</span>
                             </div>
                             <div className="border border-[#2d3422] rounded p-1 bg-[#12150e] flex flex-col justify-center">
                               <span className="text-[#8b9180] text-[6px] uppercase tracking-wider mb-0.5">DMG</span>
                               <span className="text-white">{selectedUnit.class.stats.damage}</span>
                             </div>
                             <div className="border border-[#2d3422] rounded p-1 bg-[#12150e] flex flex-col justify-center">
                               <span className="text-[#8b9180] text-[6px] uppercase tracking-wider mb-0.5">RNG</span>
                               <span className="text-white">{selectedUnit.class.stats.range}</span>
                             </div>
                           </div>
                           {selectedUnit.class.ability && (
                             <div className="border border-[#2d3422] rounded p-1.5 mt-0.5 bg-[#12150e]">
                               <div className="flex justify-between items-center mb-0.5">
                                 <span className="font-bold text-indigo-400 uppercase tracking-tighter">Spec: {selectedUnit.class.ability.name}</span>
                                 <span className="text-zinc-500 text-[6.5px]">-{selectedUnit.class.ability.apCost} AP</span>
                               </div>
                               <span className="text-[#8b9180] text-[7px] break-words whitespace-normal leading-tight">{selectedUnit.class.ability.description}</span>
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. PLAYER/BLUE FORCES TERMINAL (BOTTOM) */}
          <div 
            className={`p-2.5 sm:p-3.5 rounded-lg border transition-all duration-300 ${
              (activeTeam === 'player' && mode === 'play') || (mode === 'deploy' && teamSelection === 'player') 
                ? 'border-sky-500/50 bg-sky-950/10 shadow-[0_0_15px_rgba(56,189,248,0.15)]' 
                : 'border-[#2d3422] bg-[#141810]/95'
            } ${mode === 'deploy' && (!isOnline || myTeam === 'player') ? 'cursor-pointer hover:border-sky-500/40' : ''}`}
            onClick={() => {
              if (mode === 'deploy' && (!isOnline || myTeam === 'player')) {
                setTeamSelection('player');
              }
            }}
          >
             <h2 className="text-sky-400 font-bold mb-3 uppercase tracking-widest text-xs font-mono flex items-center gap-2">
               <div className={`w-2.5 h-2.5 rounded-full ${activeTeam === 'player' && mode === 'play' ? 'bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]' : 'bg-sky-910/20'}`}></div>
               BLUE SQUAD (TACTICAL FRIENDLY) {isOnline && (myTeam === 'player' ? '(You)' : '(Opponent)')}
               {mode === 'deploy' && <span className="text-zinc-500 font-normal font-mono normal-case text-[10px] ml-auto">Deploy in bottom rows</span>}
             </h2>
             {mode === 'deploy' ? renderRoster('player') : renderUnitInfo('player')}
          </div>

          {/* 4. INTEGRATED LOG CARD */}
          <CombatLog logs={logs} onClear={() => setLogs([])} />

        </div>

      </div>
    </div>
  );
}
