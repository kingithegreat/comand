import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Target, Activity, Move, PlusCircle, RotateCcw, ChevronRight, Crosshair, Users, Zap, Flame, Rocket, Car, Truck, Radar, Terminal } from 'lucide-react';
import TurnCounter from './TurnCounter';
import { CLASSES } from '../data';
import { CharacterClass, Unit, GridCell } from '../types';
import { generateMap, MAPS } from '../mapUtils';
import { getReachableTiles, checkLineOfSight, calculateHitChance, getCharacterLevelInfo, getBoostedStats } from '../logic';
import { getActiveChemistries, applyChemistryBuffsToStats, CHEMISTRIES } from '../chemistries';
import { db, auth } from '../firebase';
import { doc, updateDoc, setDoc, getDoc, increment } from 'firebase/firestore';
import CombatLog, { LogMessage } from './CombatLog';
import HUDCombatLog from './HUDCombatLog';
import RosterStatus from './RosterStatus';
import SelectedUnitConsole from './SelectedUnitConsole';
import UnitHelmetAvatar from './UnitHelmetAvatar';
import UnitSprite from './UnitSprite';
import CommanderLeaderboard from './CommanderLeaderboard';
import { useAudio } from '../contexts/AudioContext';
import { PostBattleSummary } from './PostBattleSummary';

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
  userId,
  userProfile
}: { 
  gameMode: 'local_ai' | 'local_p2p' | 'online',
  onBack: () => void,
  onlineMatch?: any,
  userId?: string,
  userProfile?: any
}) {
  const { playSound } = useAudio();
  const [mapEnvironment, setMapEnvironment] = useState<GridCell[][]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('sector_alpha');
  const [mode, setMode] = useState<'deploy' | 'play'>('deploy');
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
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
  const [zoomLevel, setZoomLevel] = useState(100);

  const [startingUnits, setStartingUnits] = useState<Unit[]>([]);
  const [battleStats, setBattleStats] = useState({
    playerShotsFired: 0,
    playerShotsHit: 0,
    playerDamageDealt: 0,
    playerHealsPerformed: 0,
    playerAbilitiesUsed: 0,
    turnsElapsed: 1,
    damageTaken: 0,
  });

  // Coin Flip & P2P Handoff states
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSpinning, setCoinSpinning] = useState(true);
  const [coinWinner, setCoinWinner] = useState<'player' | 'enemy' | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffTarget, setHandoffTarget] = useState<'player' | 'enemy'>('player');
  const [pendingTurnData, setPendingTurnData] = useState<{ units: Unit[], turn: number, activeTeam: 'player' | 'enemy' } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [activeLeftTab, setActiveLeftTab] = useState<'map' | 'logs' | 'leaderboard' | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'roster' | 'unit_console' | null>(null);

  useEffect(() => {
    if (mode === 'play') {
      setActiveLeftTab(null);
      setActiveRightTab(null);
    } else if (mode === 'deploy') {
      setActiveLeftTab(null);
      setActiveRightTab(null);
    }
  }, [mode]);

  useEffect(() => {
    if (selectedClass && mode === 'deploy') {
      setActiveRightTab('unit_console');
    }
  }, [selectedClass, mode]);

  useEffect(() => {
    if (mode === 'play') {
      if (startingUnits.length === 0 && units.length > 0) {
        setStartingUnits(JSON.parse(JSON.stringify(units)));
      }
    } else if (mode === 'deploy') {
      setStartingUnits([]);
      setWinner(null);
      setBattleStats({
        playerShotsFired: 0,
        playerShotsHit: 0,
        playerDamageDealt: 0,
        playerHealsPerformed: 0,
        playerAbilitiesUsed: 0,
        turnsElapsed: 1,
        damageTaken: 0,
      });
    }
  }, [mode, units, startingUnits.length]);

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
    setUnits(newUnits);
    if (isOnline) {
      updateOnlineState(newUnits, turn, activeTeam);
    }
  };

  const isOnline = gameMode === 'online' && onlineMatch;
  const isHost = isOnline ? onlineMatch.hostId === userId : true;
  const myTeam = isOnline ? (isHost ? 'player' : 'enemy') : undefined;

  const [deployedClasses, setDeployedClasses] = useState<string[]>([]);

  const getUnitClassWithBoosts = useCallback((characterClass: any, team: 'player' | 'enemy') => {
    let activeClass = { ...characterClass };
    const userTeam = isOnline ? myTeam : 'player';
    if (team === userTeam && userProfile?.characterProgress) {
      const classProgress = userProfile.characterProgress[characterClass.className];
      if (classProgress && classProgress.boosts && classProgress.boosts.length > 0) {
        activeClass = {
          ...activeClass,
          stats: getBoostedStats(characterClass.stats, classProgress.boosts)
        };
      }
    }
    
    // Squad chemistry boosts
    const sameTeamUnits = units.filter(u => u.team === team);
    const sameTeamClassNames = sameTeamUnits.map(u => u.class.className);
    if (!sameTeamClassNames.includes(characterClass.className)) {
      sameTeamClassNames.push(characterClass.className);
    }
    
    activeClass = {
      ...activeClass,
      stats: applyChemistryBuffsToStats(characterClass.className, activeClass.stats, sameTeamClassNames)
    };
    
    return activeClass;
  }, [isOnline, myTeam, userProfile, units]);

  const recalculateSquadStats = useCallback((allUnits: Unit[]) => {
    return allUnits.map(unit => {
      const baseClass = CLASSES.find(c => c.className === unit.class.className) || unit.class;
      let adjustedClass = { ...baseClass };

      // 1. Level up boosts
      const userTeam = isOnline ? myTeam : 'player';
      if (unit.team === userTeam && userProfile?.characterProgress) {
        const classProgress = userProfile.characterProgress[baseClass.className];
        if (classProgress && classProgress.boosts && classProgress.boosts.length > 0) {
          adjustedClass = {
            ...adjustedClass,
            stats: getBoostedStats(baseClass.stats, classProgress.boosts)
          };
        }
      }

      // 2. Chemistry boosts
      const sameTeamUnits = allUnits.filter(u => u.team === unit.team);
      const sameTeamClassNames = sameTeamUnits.map(u => u.class.className);
      adjustedClass = {
        ...adjustedClass,
        stats: applyChemistryBuffsToStats(baseClass.className, adjustedClass.stats, sameTeamClassNames)
      };

      const maxHP = adjustedClass.stats.maxHP;
      const hp = unit.hp === unit.class.stats.maxHP || mode === 'deploy' ? maxHP : Math.min(maxHP, unit.hp);

      return {
        ...unit,
        class: adjustedClass,
        hp
      };
    });
  }, [isOnline, myTeam, userProfile, mode]);

  useEffect(() => {
    if (mode === 'play') {
      const userTeam = isOnline ? myTeam : 'player';
      const myClasses = units
        .filter(u => u.team === userTeam)
        .map(u => u.class.className);
      if (myClasses.length > 0) {
        setDeployedClasses(myClasses);
      }
    }
  }, [mode, isOnline, myTeam, units]);

  const isSyncInitializedRef = React.useRef(false);
  const pendingTurnWriteRef = React.useRef<{ turn: number, activeTeam: 'player' | 'enemy' } | null>(null);
  const lastProcessedTurnKeyRef = React.useRef<string>("");

  useEffect(() => {
     isSyncInitializedRef.current = false;
  }, [onlineMatch?.id]);

  useEffect(() => {
     if (isOnline && myTeam) {
        setTeamSelection(myTeam);
     }
  }, [isOnline, myTeam]);

  const mergeUnits = (myNewTeamUnits: any[], myTeamName: string, latestOnlineUnitsStr?: string) => {
    try {
      const latestOnline = JSON.parse(latestOnlineUnitsStr || "[]");
      const otherTeamUnits = latestOnline.filter((u: any) => u.team !== myTeamName);
      return [...otherTeamUnits, ...myNewTeamUnits];
    } catch (e) {
      return myNewTeamUnits;
    }
  };

  const selectMap = (mapId: string) => {
    if (mode !== 'deploy') return;
    const mapPreset = MAPS.find(m => m.id === mapId);
    if (!mapPreset) return;
    
    setSelectedMapId(mapId);
    
    const generated = generateMap(mapPreset.layout);
    setMapEnvironment(generated);
    
    // Clear deployed units on map topography updates
    setUnits([]);
    setSelectedUnitId(null);
    
    if (isOnline && isHost && onlineMatch?.id) {
       updateDoc(doc(db, 'matches', onlineMatch.id), {
          mapId: mapId,
          gridEnv: JSON.stringify(generated),
          units: "[]"
       });
       addLog(`[MAP RE-ROUTE] Host selector re-synchronized sector environment: "${mapPreset.name}" initiated. Squad deployment reset.`, 'system');
    } else {
       addLog(`[MAP RE-ROUTE] Command console loaded sector environment: "${mapPreset.name}". Squad deployment reset.`, 'system');
    }
  };

  // MULTIPLAYER MATCH INITIALIZATION (SEEDING FIRST MAP)
  useEffect(() => {
    if (isOnline && isHost && onlineMatch && !onlineMatch.mapId && mode === 'deploy') {
      const defaultMapId = 'sector_alpha';
      const defaultPreset = MAPS.find(m => m.id === defaultMapId) || MAPS[0];
      const generated = generateMap(defaultPreset.layout);
      
      updateDoc(doc(db, 'matches', onlineMatch.id), {
        mapId: defaultMapId,
        gridEnv: JSON.stringify(generated),
        units: "[]"
      }).catch(err => console.error("Error initializing default map:", err));
    }
  }, [isOnline, isHost, onlineMatch, mode]);

  const unitsString = JSON.stringify(units);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
      emailVerified?: boolean | null;
      isAnonymous?: boolean | null;
      tenantId?: string | null;
      providerInfo?: {
        providerId?: string | null;
        email?: string | null;
      }[];
    }
  }

  function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Sync state from onlineMatch
  useEffect(() => {
    if (isOnline && onlineMatch) {
       const remoteUnits = JSON.parse(onlineMatch.units || "[]");
       
       if (!isSyncInitializedRef.current) {
          setUnits(remoteUnits);
          isSyncInitializedRef.current = true;
       } else {
          if (mode === 'deploy') {
             const myTeamName = myTeam || 'player';
             const myLocalUnits = units.filter(u => u.team === myTeamName);
             const opponentRemoteUnits = remoteUnits.filter(u => u.team !== myTeamName);
             
             const merged = [...myLocalUnits, ...opponentRemoteUnits];
             if (JSON.stringify(merged) !== unitsString) {
                setUnits(merged);
             }
          } else if (mode === 'play') {
             const dbActiveTeam = onlineMatch.activeTeam;
             const dbTurn = onlineMatch.turn || 1;
             const dbTurnKey = `${dbActiveTeam}:${dbTurn}`;

             if (pendingTurnWriteRef.current) {
                if (dbActiveTeam === pendingTurnWriteRef.current.activeTeam && dbTurn === pendingTurnWriteRef.current.turn) {
                   pendingTurnWriteRef.current = null;
                   lastProcessedTurnKeyRef.current = dbTurnKey;
                } else {
                   return;
                }
             }

             if (dbActiveTeam !== myTeam) {
                if (JSON.stringify(remoteUnits) !== unitsString) {
                   setUnits(remoteUnits);
                }
                if (activeTeam !== dbActiveTeam) {
                   setActiveTeam(dbActiveTeam as 'player' | 'enemy');
                }
                if (turn !== dbTurn) {
                   setTurn(dbTurn);
                }
             } else {
                if (lastProcessedTurnKeyRef.current !== dbTurnKey) {
                   if (JSON.stringify(remoteUnits) !== unitsString) {
                      setUnits(remoteUnits);
                   }
                   lastProcessedTurnKeyRef.current = dbTurnKey;
                }
                if (activeTeam !== myTeam) {
                   setActiveTeam(myTeam);
                }
                if (turn !== dbTurn) {
                   setTurn(dbTurn);
                }
             }
          }
       }

       if (onlineMatch.gridEnv) {
         (() => {
          const parsed = JSON.parse(onlineMatch.gridEnv);
          if (JSON.stringify(parsed) !== JSON.stringify(mapEnvironment)) {
             setMapEnvironment(parsed);
          }
          if (onlineMatch.mapId && onlineMatch.mapId !== selectedMapId) {
             setSelectedMapId(onlineMatch.mapId);
          }
        })();
       }
       if (onlineMatch.mode === 'play' && mode !== 'play' && !coinFlipping) {
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
       } else if (onlineMatch.mode === 'play' && mode === 'play' && !pendingTurnWriteRef.current && onlineMatch.activeTeam !== myTeam) {
          // If already in play, keep syncing activeTeam
          if (onlineMatch.activeTeam) {
             setActiveTeam(onlineMatch.activeTeam);
          }
       }
       if (onlineMatch.winner) {
          setWinner(onlineMatch.winner);
       }
       if (!pendingTurnWriteRef.current && onlineMatch.activeTeam !== myTeam) { setTurn(onlineMatch.turn || 1); }
       if (onlineMatch.activeTeam && !coinFlipping && mode === 'play' && !pendingTurnWriteRef.current && onlineMatch.activeTeam !== myTeam) {
          setActiveTeam(onlineMatch.activeTeam);
       }
    }
  }, [onlineMatch, isOnline, unitsString, mode, coinFlipping, addLog, selectedMapId, mapEnvironment, myTeam, activeTeam, units]);

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
      const preset = MAPS.find(m => m.id === selectedMapId) || MAPS[0];
      setMapEnvironment(generateMap(preset.layout));
    } else if (isOnline && isHost && mapEnvironment.length === 0 && !onlineMatch?.gridEnv) {
      const preset = MAPS.find(m => m.id === selectedMapId) || MAPS[0];
      const generated = generateMap(preset.layout);
      setMapEnvironment(generated);
      updateDoc(doc(db, 'matches', onlineMatch.id), {
         gridEnv: JSON.stringify(generated)
      });
    }
  }, [isOnline, isHost, onlineMatch, mapEnvironment.length, selectedMapId]);

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

    if (selectedUnit.team === (myTeam || 'player')) {
      setBattleStats(prev => ({
        ...prev,
        playerAbilitiesUsed: prev.playerAbilitiesUsed + 1
      }));
    }

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

    setUnits(newUnits);
    if (isOnline) {
      updateOnlineState(newUnits, turn, activeTeam);
    }
  };

  const executeAbility = (x: number, y: number) => {
    if (!selectedUnit || !selectedUnit.class.ability) return;
    const ability = selectedUnit.class.ability;
    if (selectedUnit.ap < ability.apCost) return;

    if (selectedUnit.team === (myTeam || 'player')) {
      const demoHits = selectedUnit.class.className === 'Demoman' 
        ? units.filter(u => u.team !== selectedUnit.team && u.hp > 0 && Math.abs(u.x - x) <= 1 && Math.abs(u.y - y) <= 1).length 
        : 0;

      setBattleStats(prev => ({
        ...prev,
        playerAbilitiesUsed: prev.playerAbilitiesUsed + 1,
        playerHealsPerformed: prev.playerHealsPerformed + (selectedUnit.class.className === 'Medic' ? 1 : 0),
        playerDamageDealt: prev.playerDamageDealt + (
          selectedUnit.class.className === 'Flamethrower' ? 85 :
          selectedUnit.class.className === 'Demoman' ? (demoHits * 30) :
          selectedUnit.class.className === 'Sniper' ? 55 :
          selectedUnit.class.className === 'Assault' ? 25 :
          selectedUnit.class.className === 'Support' ? 20 : 0
        )
      }));
    }

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
       setUnits(curr => {
          const updated = curr.map(u => u.id === selectedUnit.id ? { ...u, pose: 'idle' as const } : u);
          if (isOnline) {
             updateOnlineState(updated, turn, activeTeam);
          }
          return updated;
       });
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

    setUnits(newUnits);

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
    setUnits(currentUnits);
    if (isOnline) {
       updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(currentUnits) });
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
       setUnits(updatedUnits);
       setActiveTeam(nextTeam);
       setTurn(nextTurn);
       pendingTurnWriteRef.current = { turn: nextTurn, activeTeam: nextTeam };
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, mode, activeTeam, winner, turn]);

  // Trigger end turn automatically when timer expires
  useEffect(() => {
    if (isOnline && mode === 'play' && !winner && timeLeft === 0 && activeTeam === myTeam) {
      handleEndTurn();
    }
  }, [timeLeft, isOnline, mode, winner, activeTeam, myTeam, handleEndTurn]);

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
          const { chance } = calculateHitChance(enemy, p, mapEnvironment);
          let score = chance; // Factor in hit chance heavily
          if (personality === 'Aggressive') score += -dist + (p.class.stats.maxHP - p.hp)*2; // Prefers wounded or close
          else if (personality === 'Cautious') score += -p.class.stats.maxHP; // Prefers squishy
          else if (personality === 'Tactical') score += -p.hp; // Kills lowest hp
          else if (personality === 'Support') score += -dist - p.hp; 
          
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
       const { chance, isCovered } = calculateHitChance(enemy, p, mapEnvironment);
       const isHit = Math.random() * 100 <= chance;

       if (isHit) {
         playSound('attack');
         setTimeout(() => playSound('damage'), 150);
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
         addLog(`[ENGAGE] Enemy ${enemy.class.className} attacked Blue ${p.class.className} for ${enemy.class.stats.damage} damage at ${getCoord(p.x, p.y)} (${chance}% hit chance).`, 'combat');
         if (remHp <= 0) {
           addLog(`[FATALITY] Blue ${p.class.className} neutralized under enemy hostile fire.`, 'death');
         }
       } else {
         playSound('attack');
         const damageId = crypto.randomUUID();
         setDamageTexts(prev => [...prev, { id: damageId, x: p.x, y: p.y, amount: 0 }]);
         setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);

         setUnits(prev => prev.map(u => {
            if (u.id === enemy.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
            return u;
         }));

         setTimeout(() => {
            setUnits(curr => curr.map(u => u.id === enemy.id ? { ...u, pose: 'idle' as const } : u));
         }, 800);
         
         addLog(`[MISS] Enemy ${enemy.class.className} fired on Blue ${p.class.className} (${chance}% hit chance) but missed!${isCovered ? ' (Cover interference)' : ''}`, 'info');
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
          playSound('move');
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

        if (newWinner && !winner) {
          setWinner(newWinner as any);
          const isPlayerWin = newWinner === myTeam || (!myTeam && newWinner === 'player');
          if (isPlayerWin) {
            playSound('win');
            if (auth.currentUser) {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              getDoc(userRef).then((snap) => {
                if (snap.exists()) {
                  const userData = snap.data();
                  const currentProgress = userData.characterProgress || {};
                  const updatedProgress = { ...currentProgress };
                  
                  deployedClasses.forEach((className) => {
                    const classProg = updatedProgress[className] || { xp: 0, level: 1, boosts: [] };
                    const newXp = (classProg.xp || 0) + 100;
                    const levelInfo = getCharacterLevelInfo(newXp);
                    
                    updatedProgress[className] = {
                      ...classProg,
                      xp: newXp,
                      level: levelInfo.level,
                      boosts: classProg.boosts || []
                    };
                  });
                  
                  updateDoc(userRef, {
                    characterProgress: updatedProgress
                  }).then(() => {
                    addLog(`[SQUAD SYNC] Mission Successful! Deployed squad members gained 100 XP. Check the Squad Database in the main menu to unlock minor stat boosts!`, 'system');
                  }).catch(err => console.error("Error updating squad XP:", err));
                }
              }).catch(err => console.error("Error loading user profile for XP:", err));
            }
          } else {
            playSound('lose');
          }
          if (isOnline && newWinner === myTeam && auth.currentUser) {
            setDoc(doc(db, 'stats', auth.currentUser.uid), {
               userId: auth.currentUser.uid,
               displayName: auth.currentUser.displayName || 'Commander',
               victories: increment(1)
            }, { merge: true }).catch(console.error);
          }
        }

        if (isOnline) {
           updateOnlineState(newUnits, turn, activeTeam, newStatus, newWinner);
        }
        setUnits(newUnits);
        if (newStatus !== mode) setMode(newStatus as any);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [units, mode, isOnline, turn, activeTeam, winner, myTeam]);

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
         const myNewTeamUnits = units.filter(u => u.team === teamSelection && u.id !== existingUnit.id);
         const baseNewUnits = isOnline 
           ? mergeUnits(myNewTeamUnits, teamSelection, onlineMatch?.units) 
           : units.filter(u => u.id !== existingUnit.id);
         const newUnits = recalculateSquadStats(baseNewUnits);

         addLog(`[RECALL] ${existingUnit.team === 'player' ? 'Blue' : 'Red'} ${existingUnit.class.className} withdrawn from grid.`, 'system');
         playSound('click');
         setUnits(newUnits);
         if (isOnline) {
            updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(newUnits) });
         }
         return;
      }

      if (teamSelection === 'player' && y < 8) return;
      if (teamSelection === 'enemy' && y > 6) return;

      if (selectedClass) {
        if (units.filter(u => u.team === teamSelection).length >= 4) return;
        
        const activeClass = getUnitClassWithBoosts(selectedClass, teamSelection);
        const newUnit: Unit = {
          id: crypto.randomUUID(),
          class: activeClass,
          x, y,
          hp: activeClass.stats.maxHP,
          ap: 2,
          team: teamSelection,
        };
        addLog(`[DEPLOY] ${teamSelection === 'player' ? 'Blue' : 'Red'} ${selectedClass.className} deployed at quadrant ${getCoord(x, y)}.`, 'system');
        playSound('deploy');
        const deployId = crypto.randomUUID();
        setDamageTexts(prev => [...prev, { id: deployId, x, y, amount: -2 }]);
        setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== deployId)), 1000);
        
        const myNewTeamUnits = [...units.filter(u => u.team === teamSelection), newUnit];
        
        const prevClassNames = units.filter(u => u.team === teamSelection).map(u => u.class.className);
        const newClassNames = myNewTeamUnits.map(u => u.class.className);
        const prevChems = getActiveChemistries(prevClassNames);
        const newChems = getActiveChemistries(newClassNames);
        
        newChems.forEach(chem => {
          if (!prevChems.some(c => c.id === chem.id)) {
            addLog(`[CHEMISTRY TRIGGER] ${chem.name} online! ${chem.buffText}`, 'system');
          }
        });

        const baseUnitsArray = isOnline 
          ? mergeUnits(myNewTeamUnits, teamSelection, onlineMatch?.units) 
          : [...units, newUnit];
        const newUnitsArray = recalculateSquadStats(baseUnitsArray);

        setUnits(newUnitsArray);
        if (isOnline) {
           updateDoc(doc(db, 'matches', onlineMatch.id), { units: JSON.stringify(newUnitsArray) });
        } else {
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
            playSound('click');
            setSelectedUnitId(existingUnit.id);
         } else if (selectedUnitId) {
            const unit = units.find(u => u.id === selectedUnitId);
            if (unit && unit.team === activeTeam) {
               const dist = Math.abs(unit.x - existingUnit.x) + Math.abs(unit.y - existingUnit.y);
               const hasLos = checkLineOfSight(unit.x, unit.y, existingUnit.x, existingUnit.y, mapEnvironment);
               if (dist <= unit.class.stats.range && hasLos && unit.ap >= 1) {
                  const { chance, isCovered } = calculateHitChance(unit, existingUnit, mapEnvironment);
                  const isHit = Math.random() * 100 <= chance;
                  const attackerColor = unit.team === 'player' ? 'Blue' : 'Red';
                  const targetColor = existingUnit.team === 'player' ? 'Blue' : 'Red';
                  
                  const targetFacing = getFacingDirection(unit.x, unit.y, existingUnit.x, existingUnit.y, unit.facing);

                  if (isHit) {
                    if (unit.team === (myTeam || 'player')) {
                      setBattleStats(prev => ({
                        ...prev,
                        playerShotsFired: prev.playerShotsFired + 1,
                        playerShotsHit: prev.playerShotsHit + 1,
                        playerDamageDealt: prev.playerDamageDealt + unit.class.stats.damage
                      }));
                    }
                    playSound('attack');
                    setTimeout(() => playSound('damage'), 150);
                    const damageId = crypto.randomUUID();
                    setDamageTexts(prev => [...prev, { id: damageId, x: existingUnit.x, y: existingUnit.y, amount: unit.class.stats.damage }]);
                    setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== damageId)), 1000);
                    setShake(true);
                    setTimeout(() => setShake(false), 200);

                    const newUnits = units.map(u => {
                      if (u.id === unit.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                      if (u.id === existingUnit.id) return { ...u, hp: u.hp - unit.class.stats.damage };
                      return u;
                    });

                    setTimeout(() => {
                      setUnits(curr => {
                        const updated = curr.map(u => u.id === unit.id ? { ...u, pose: 'idle' as const } : u);
                        if (isOnline) {
                          updateOnlineState(updated, turn, activeTeam);
                        }
                        return updated;
                      });
                    }, 800);
                    
                    const relHP = existingUnit.hp - unit.class.stats.damage;
                    addLog(`[ENGAGE] ${attackerColor} ${unit.class.className} attacked ${targetColor} ${existingUnit.class.className} at ${getCoord(existingUnit.x, existingUnit.y)} (${chance}% hit chance) for ${unit.class.stats.damage} damage!${isCovered ? ' (Target partially behind cover)' : ''}`, 'combat');
                    if (relHP <= 0) {
                        addLog(`[FATALITY] ${targetColor} ${existingUnit.class.className} neutralized under hostile fire.`, 'death');
                    }

                    setUnits(newUnits);
                    if(isOnline) updateOnlineState(newUnits, turn, activeTeam);
                  } else {
                    // Miss
                    if (unit.team === (myTeam || 'player')) {
                      setBattleStats(prev => ({
                        ...prev,
                        playerShotsFired: prev.playerShotsFired + 1
                      }));
                    }
                    playSound('attack');
                    const effectId = crypto.randomUUID();
                    setDamageTexts(prev => [...prev, { id: effectId, x: existingUnit.x, y: existingUnit.y, amount: 0 }]); // Using 0 to represent miss
                    setTimeout(() => setDamageTexts(current => current.filter(d => d.id !== effectId)), 1000);

                    const newUnits = units.map(u => {
                      if (u.id === unit.id) return { ...u, ap: u.ap - 1, facing: targetFacing, pose: 'firing' as const };
                      return u;
                    });

                    setTimeout(() => {
                      setUnits(curr => {
                        const updated = curr.map(u => u.id === unit.id ? { ...u, pose: 'idle' as const } : u);
                        if (isOnline) {
                          updateOnlineState(updated, turn, activeTeam);
                        }
                        return updated;
                      });
                    }, 800);

                    addLog(`[MISS] ${attackerColor} ${unit.class.className} fired on ${targetColor} ${existingUnit.class.className} at ${getCoord(existingUnit.x, existingUnit.y)} (${chance}% hit chance) but missed!${isCovered ? ' (Target shielded by cover)' : ''}`, 'info');

                    setUnits(newUnits);
                    if(isOnline) updateOnlineState(newUnits, turn, activeTeam);
                  }
               } else {
                  playSound('click');
                  if (unit.ap < 1) {
                     addLog(`[COMMAND REJECTED] ${unit.class.className} has no Action Points (AP) remaining in this cycle!`, 'system');
                  } else if (dist > unit.class.stats.range) {
                     addLog(`[COMMAND REJECTED] Target is out of range! Target distance is ${dist} tiles, but ${unit.class.className} weapon range is ${unit.class.stats.range} tiles.`, 'system');
                  } else if (!hasLos) {
                     addLog(`[COMMAND REJECTED] Line of Sight is completely blocked by solid wall obstacles!`, 'system');
                  }
               }
            } else {
               playSound('click');
               setSelectedUnitId(existingUnit.id);
            }
         }
      } else if (selectedUnitId) {
         const reachableObj = isReachableTileObj(x, y);
         const unit = units.find(u => u.id === selectedUnitId);
         if (reachableObj && unit && unit.team === activeTeam) {
           const moveFacing = getFacingDirection(unit.x, unit.y, x, y, unit.facing);
           const newUnits = units.map(u => 
             u.id === selectedUnitId 
               ? { ...u, x, y, ap: u.ap - reachableObj.apCost, facing: moveFacing }
               : u
           );
           const unitTeamColor = unit.team === 'player' ? 'Blue' : 'Red';
           addLog(`[MANEUVER] ${unitTeamColor} ${unit.class.className} advanced to quadrant ${getCoord(x, y)} (used ${reachableObj.apCost} AP).`, 'info');
           playSound('move');
           setSelectedUnitId(null);
           setUnits(newUnits);
           if (isOnline) {
             updateOnlineState(newUnits, turn, activeTeam);
           }
            // State updated locally above
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
      if (cell && cell.type === 'wall') {
        firstBlockingTile = p;
        break;
      }
    }
  }

  const renderHoverHUD = () => {
    if (!hoveredTile) {
      return (
        <div className="w-full h-full bg-[#12150e]/95 border border-[#2d3324]/80 py-1.5 px-3 rounded-t-lg flex items-center justify-between text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest select-none">
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

    // Reachable tile cost calculation
    const reachableObj = mode === 'play' && selectedUnit && selectedUnit.team === activeTeam ? reachableTiles.find(t => t.x === x && t.y === y) : null;
    let pathLabel = "";
    if (reachableObj) {
      pathLabel = ` // MOVEMENT REQUISITION: -${reachableObj.apCost} AP`;
    }

    // Enemy targeting details
    let attackContextLabel = "";
    if (selectedUnit && unitOnTile && unitOnTile.team !== selectedUnit.team && mode === 'play' && selectedUnit.team === activeTeam) {
      const dist = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
      const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, x, y, mapEnvironment);
      const inRange = dist <= selectedUnit.class.stats.range;
      if (inRange && hasLos && selectedUnit.ap >= 1) {
        const { chance } = calculateHitChance(selectedUnit, unitOnTile, mapEnvironment);
        attackContextLabel = ` // TARGET LOCK: ACQUIRED (${chance}% HIT) // CLICK TO FIRE`;
      } else if (!inRange) {
        attackContextLabel = " // TARGET LOCK: OUT OF MAX WEAPON RANGE";
      } else if (selectedUnit.ap < 1) {
        attackContextLabel = " // TARGET LOCK: NO ACTION POINTS AVAILABLE (NO AP)";
      } else if (!hasLos) {
        attackContextLabel = " // TARGET LOCK: BLOCKED (OBSTRUCTION INTERFERENCE)";
      }
    }

    const isPlayerTeam = unitOnTile?.team === 'player';

    return (
      <div className="w-full h-full bg-[#12150e]/95 border border-[#2d3324] py-2 px-3 rounded-t-lg flex flex-col xl:flex-row justify-between items-start xl:items-center text-[10px] font-mono select-none gap-2 animate-fade-in shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 font-bold">SECTOR:</span>
          <span className="text-white bg-[#1a2014] px-1.5 py-0.5 rounded border border-[#2d3324] font-bold font-mono">
            {String.fromCharCode(65 + x)}{(y + 1).toString().padStart(2, '0')} [{x.toString().padStart(2, '0')}, {y.toString().padStart(2, '0')}]
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-500 font-bold">TYPE:</span>
          <span className={`${colorClass} font-bold tracking-wider uppercase`}>{typeStr}</span>
          {pathLabel && <span className="text-sky-400 font-black animate-pulse">{pathLabel}</span>}
        </div>
        
        <div className="text-[10px] uppercase w-full md:w-auto">
          {unitOnTile ? (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-1.5 md:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-505">UNIT:</span>
                <span className={`${isPlayerTeam ? 'text-sky-400 font-black' : 'text-rose-400 font-black'} glow-text`}>
                  {unitOnTile.class.className.toUpperCase()} ({isPlayerTeam ? 'BLUE SQUAD' : 'RED FORCE'})
                </span>
              </div>
              <div className="flex items-center gap-1 md:border-l md:border-[#2d3324]/50 md:pl-3">
                <span className="text-zinc-500">HP:</span>
                <span className="text-white font-black">{unitOnTile.hp}/{unitOnTile.class.stats.maxHP}</span>
                <span className="text-zinc-500 ml-1.5">AP:</span>
                <span className="text-amber-400 font-black">{unitOnTile.ap}/2</span>
                <span className="text-zinc-500 ml-1.5">RNG:</span>
                <span className="text-zinc-300 font-bold">{unitOnTile.class.stats.range}S</span>
              </div>
              {unitOnTile.class.ability && (
                <div className="text-[9.5px] text-emerald-400 md:border-l md:border-[#2d3324]/50 md:pl-3 max-w-xs truncate" title={unitOnTile.class.ability.description}>
                  <span className="text-zinc-500 mr-1 font-bold">SPEC:</span> {unitOnTile.class.ability.name.toUpperCase()}
                </div>
              )}
              {attackContextLabel && (
                <span className="text-[#f43f5e] font-black animate-pulse md:border-l md:border-[#2d3324]/50 md:pl-3">
                  {attackContextLabel}
                </span>
              )}
            </div>
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
              
              {mode === 'deploy' && (
                <>
                  <span className="text-[6.5px] text-red-400 font-mono leading-none tracking-widest scale-90 select-none font-black drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">BLOCK</span>
                  <div className="absolute top-1.5 left-1.5 text-[4.5px] text-red-500/90 font-mono font-extrabold">B-99</div>
                  <div className="absolute bottom-1.5 right-1.5 text-[4.5px] text-red-500/90 font-mono font-extrabold font-black">SHIELD</div>
                </>
              )}
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
              {mode === 'deploy' && (
                <>
                  <span className="text-[7.5px] text-amber-400 font-mono tracking-tighter leading-none font-black uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">CARGO</span>
                  <span className="text-[5px] text-amber-500/90 font-mono mt-0.5 font-black">C-904</span>
                </>
              )}
            </div>
          );
        }

        // Action Point deploy warning zones (Visible simultaneously on both allied and enemy regions)
        let deployGridOverlay = null;
        let overlayClass = '';
        if (mode === 'deploy') {
           if (cell.type !== 'wall') {
              if (y >= 8) {
                const isActive = teamSelection === 'player';
                overlayClass = isActive 
                  ? 'warning-stripes-blue opacity-35 border-t border-sky-400/20'
                  : 'warning-stripes-blue opacity-15 border-t border-sky-505/10';
                deployGridOverlay = (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1">
                    <span className={`text-[6px] font-mono ${isActive ? 'text-sky-300 font-black' : 'text-sky-500/40 font-semibold'} tracking-widest scale-75 select-none uppercase`}>
                      BLUE ZONE
                    </span>
                  </div>
                );
              } else if (y <= 6) {
                const isActive = teamSelection === 'enemy';
                overlayClass = isActive 
                  ? 'warning-stripes-fuchsia opacity-35 border-b border-fuchsia-500/20'
                  : 'warning-stripes-fuchsia opacity-15 border-b border-fuchsia-900/40';
                deployGridOverlay = (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1 text-center">
                    <span className={`text-[6px] font-mono ${isActive ? 'text-fuchsia-400 font-black' : 'text-fuchsia-500/40 font-semibold'} tracking-widest scale-75 select-none uppercase`}>
                      PURPLE ZONE
                    </span>
                  </div>
                );
              }
           }
        }
        
        if (!isAbilityActive && mode === 'play' && selectedUnit && selectedUnit.team === activeTeam) {
           if (reachableObj && !unit) {
             overlayClass = 'bg-sky-500/20 border-2 border-sky-400/50 hover:bg-sky-400/35 cursor-cell shadow-[inset_0_0_8px_rgba(56,189,248,0.3)] z-5';
             cellDecoration = (
                <div className="hidden">
                  -{reachableObj.apCost} AP
                </div>
             );
           } else if (unit && unit.team !== activeTeam && unit.hp > 0 && selectedUnit.ap >= 1) {
              const dist = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
              if (dist <= selectedUnit.class.stats.range) {
                 const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, x, y, mapEnvironment);
                 if (hasLos) {
                    overlayClass = 'bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/35 cursor-crosshair shadow-[inset_0_0_8px_rgba(239,68,68,0.3)] z-5';
                 }
              }
           }
        }

        if (isAbilityActive && mode === 'play' && selectedUnit && selectedUnit.team === activeTeam && selectedUnit.class.ability) {
           const ability = selectedUnit.class.ability;
           const dist = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
           const inRange = ability.range !== undefined ? dist <= ability.range : false;
           
           if (isValidAbilityTarget(x, y)) {
              overlayClass = 'bg-yellow-500/30 border-2 border-yellow-400/80 cursor-crosshair shadow-[inset_0_0_12px_rgba(234,179,8,0.5)] animate-pulse z-5';
           } else if (inRange && ability.type !== 'self') {
              overlayClass = 'bg-yellow-500/10 border border-yellow-500/20 z-1 pointer-events-none';
           }
        }

        // If block obstruction point on line of sight laser path
        let obstacleAlert = null;
        if (isObstructionPoint) {
          obstacleAlert = (
            <div className="absolute inset-0 bg-rose-950/45 border border-red-500 flex flex-col items-center justify-center animate-pulse pointer-events-none z-20">
              <div className="absolute inset-0 warning-stripes-red opacity-25"></div>
              <span className="hidden">BLOCK</span>
            </div>
          );
        }

        let losClass = '';
        let hitChanceInfo = null;
        if (mode === 'play' && selectedUnit && selectedUnit.team === activeTeam && hoveredTile?.x === x && hoveredTile?.y === y && unit && unit.team !== activeTeam) {
           const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, x, y, mapEnvironment);
           if (hasLos) {
             losClass = 'ring-2 ring-red-500 ring-offset-1 ring-offset-[#2a2e25] z-10';
             const { chance } = calculateHitChance(selectedUnit, unit, mapEnvironment);
             hitChanceInfo = (
                <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 z-20">
                   <div className="bg-red-950/90 text-red-400 text-[6px] font-black font-mono px-1 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-red-500/50 flex flex-col items-center leading-none">
                     <span>HIT</span>
                     <span>{chance}%</span>
                   </div>
                </div>
             );
           }
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
                  targetOverlayClass = 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse';
                  targetBadge = (
                     <div className="absolute -top-1 -right-1 bg-red-600 border border-red-400 text-[6.5px] text-white font-mono scale-90 px-1 py-0.5 rounded shadow z-40 font-black animate-bounce tracking-tighter">
                        LOCK
                     </div>
                  );
               } else if (hoveredTile?.x === unit.x && hoveredTile?.y === unit.y) {
                  let reasonText = 'OBST';
                  if (!inRange) {
                     reasonText = 'RANGE';
                  } else if (selectedUnit.ap < 1) {
                     reasonText = 'NO AP';
                  } else if (!hasLos) {
                     reasonText = 'OBST';
                  }
                  targetBadge = (
                     <div className="absolute -top-1.5 -right-1.5 bg-amber-600 border border-amber-400 text-[6px] text-white font-mono scale-80 px-1 py-0.5 rounded shadow z-40 font-black">
                        {reasonText}
                     </div>
                  );
               }
            }

            const isPlayerTeam = unit.team === 'player';
            const isHovered = hoveredTile?.x === unit.x && hoveredTile?.y === unit.y;

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
                 {/* clean board: hitChanceInfo shown in HUD */}
                 {/* clean board: lock/range indicator is in HUD */}
                 {selectionReticle}
                 {activeUnitPulseRing}
                 
                 {unitSpriteFrame}
                 
                 {/* Unit Status Overlays (HP & AP) */}
                 {mode === 'play' && (
                    <div className="absolute bottom-0 w-full px-1 pb-1 flex flex-col items-center gap-[2px] z-30 pointer-events-none">
                       {/* AP Pips */}
                       <div className="flex gap-1 justify-center mb-[1px]">
                          {Array.from({ length: 2 }).map((_, i) => (
                             <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-black/90 ${i < unit.ap ? 'bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.9)]' : 'bg-black/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]'}`} />
                          ))}
                       </div>
                       {/* HP Bar */}
                       <div className="w-4/5 sm:w-full max-w-[28px] h-[3px] bg-black/80 border border-black/90 rounded-sm overflow-hidden flex">
                          <div 
                             className={`h-full transition-all duration-300 ${unit.hp / unit.class.stats.maxHP > 0.5 ? 'bg-emerald-400' : unit.hp / unit.class.stats.maxHP > 0.25 ? 'bg-amber-400' : 'bg-rose-500'}`}
                             style={{ width: `${Math.max(0, (unit.hp / unit.class.stats.maxHP) * 100)}%` }}
                          />
                       </div>
                    </div>
                 )}
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
                  } else if (dt.amount === -2) {
                     displayText = 'DEPLOYED';
                     colorClass = 'text-cyan-400';
                  } else {
                     displayText = `+${Math.abs(dt.amount)} HP`;
                     colorClass = 'text-emerald-400';
                  }
               } else if (dt.amount === 0) {
                  displayText = 'MISS';
                  colorClass = 'text-zinc-400';
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
                onClick={() => { 
                  setSelectedClass(c); 
                  setTeamSelection(team); 
                }}
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


  const handleStartBattle = () => {
    let currentUnits = units.map(u => ({ ...u, ap: 2 }));
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
    }

    currentUnits = recalculateSquadStats(currentUnits);
    setUnits(currentUnits);

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
          <div className="bg-fuchsia-950/20 border border-fuchsia-500/30 p-2.5 rounded text-[10px] font-mono uppercase text-fuchsia-400 leading-normal">
            <span className="font-extrabold text-fuchsia-400 bg-fuchsia-400/10 border border-fuchsia-500/40 px-1.5 py-0.5 rounded mr-2">STEP 2 / 2</span>
            Now, <span className="font-extrabold text-fuchsia-400">Player 2 (Purple Squad)</span>: Click inside the Purple Forces Terminal (the top panel header) to switch deployment team, then choose unit classes and deploy exactly 4 units in the top rows (Rows 01-07).
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
    <div className="h-screen w-full bg-[#0e100c] text-[#dae3ce] font-sans flex flex-col relative xl:overflow-hidden overflow-y-auto overflow-x-hidden select-none">
      {/* Subtle CRT Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] mix-blend-overlay"></div>

      {showHandoff && pendingTurnData && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
           <div className="bg-[#141810] border-2 border-[#424f35] p-10 flex flex-col items-center min-w-[320px] shadow-2xl rounded-lg max-w-sm text-center">
              <h1 className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 text-center ${handoffTarget === 'player' ? 'text-[#38bdf8] drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-[#c026d3] drop-shadow-[0_0_15px_rgba(192,38,211,0.4)]'}`}>
                {handoffTarget === 'player' ? 'BLUE SQUAD' : 'PURPLE SQUAD'} TURN
              </h1>
              <p className="text-sm font-mono text-amber-500/80 tracking-widest uppercase mb-8 leading-relaxed">
                PASS THE DEVICE TO {handoffTarget === 'player' ? 'PLAYER 1 (BLUE)' : 'PLAYER 2 (PURPLE)'}
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

      {coinFlipping && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
           <div className="bg-[#141810]/95 border-2 border-amber-500/45 p-10 flex flex-col items-center min-w-[340px] shadow-[0_0_50px_rgba(245,158,11,0.2)] rounded-xl max-w-sm text-center relative overflow-hidden">
              {/* Retro digital circuit scanning borders */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400"></div>
              
              <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
                 <div className="absolute inset-0 border border-amber-500/20 rounded-full animate-ping [animation-duration:1.6s]"></div>
                 <div className="absolute inset-2 border border-dashed border-amber-500/35 rounded-full animate-[spin_8s_linear_infinite]"></div>
                 <div className="absolute inset-4 border border-amber-550/15 rounded-full"></div>
                 
                 {/* The holographic spinning "coin" */}
                 <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-mono font-black text-xs sm:text-sm tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] ${coinSpinning ? 'animate-[spin_0.2s_linear_infinite] border-amber-550 text-amber-400 bg-amber-500/5' : (coinWinner === 'player' ? 'border-sky-500 text-sky-450 bg-sky-950/20 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-110' : 'border-rose-500 text-rose-500 bg-rose-950/20 shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-110')}`}>
                   {coinSpinning ? 'INIT' : (coinWinner === 'player' ? 'BLUE' : 'RED')}
                 </div>
              </div>
              
              <h2 className="text-xs font-mono text-amber-400 font-extrabold tracking-widest uppercase mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                INITIATIVE SEQUENCING ENGINE
              </h2>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#2d3422] to-transparent my-4"></div>
              
              {coinSpinning ? (
                <div className="space-y-1.5 animate-pulse">
                   <p className="text-[#8c9c7c] text-[9px] font-mono uppercase tracking-widest leading-normal">
                     PULSED INITIATIVE SCAN IN PROGRESS...
                   </p>
                   <p className="text-[10px] text-zinc-500 font-mono uppercase font-bold">
                     DECODING COMBAT NET SYNCHRONIZER
                   </p>
                </div>
              ) : (
                <div className="space-y-3">
                   <p className="text-zinc-400 text-[10px] font-mono uppercase tracking-widest leading-normal mb-1">
                     TACTICAL ADVANTAGE DETECTED
                   </p>
                   <h1 className={`text-3xl font-black uppercase tracking-[0.15em] ${coinWinner === 'player' ? 'text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]' : 'text-fuchsia-500 drop-shadow-[0_0_12px_rgba(217,70,239,0.45)]'}`}>
                     {coinWinner === 'player' ? 'BLUE LEADER' : 'PURPLE OPPONENT'}
                   </h1>
                   <div className="h-2"></div>
                   <p className={`text-[9.5px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md border text-center font-bold relative overflow-hidden shrink-0 ${coinWinner === 'player' ? 'bg-sky-500/10 text-sky-350 border-sky-500/25' : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25'}`}>
                     {coinWinner === 'player' ? 'BLUE SQUAD OPENS TARGET CHANNELS' : 'PURPLE SQUAD COMMANDS INITIATION'}
                   </p>
                </div>
              )}
           </div>
        </div>
      )}

      {winner && (
        <PostBattleSummary
          winner={winner}
          myTeam={myTeam}
          startingUnits={startingUnits}
          survivingUnits={units}
          battleStats={battleStats}
          turn={turn}
          onBack={onBack}
        />
      )}

      {/* Main Grid Frame */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-3 relative z-10 animate-fade-in xl:flex-1 xl:overflow-hidden h-full">
        
        {/* TOP COMMAND HUD */}
        <div className="w-full bg-[#141810] border border-[#2d3422] px-3.5 py-2 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl shrink-0">
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
            {mode === 'play' && (
              <div className="flex gap-1 p-0.5 bg-black/40 rounded border border-[#2d3324]/80 font-mono text-xs text-[#afd19c] font-black items-center px-3 py-1.5 uppercase shrink-0">
                <Crosshair className="w-3.5 h-3.5 text-red-500 animate-pulse" /> BATTLE LIVE
              </div>
            )}

            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4c1d1d]/30 border border-[#991b1b]/50 hover:bg-[#991b1b]/20 text-red-200 rounded text-xs font-mono font-bold uppercase transition-colors shadow-sm w-full sm:w-auto justify-center cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>

        {/* HUD CORE DISPLAY FLOW */}
        <div className="w-full xl:flex-1 flex flex-col xl:flex-row flex-wrap xl:flex-nowrap gap-4 items-center xl:items-stretch justify-center relative xl:overflow-hidden min-h-0">
          
          {/* LEFT COLUMN AUX PANEL */}
          {activeLeftTab && (
            <div className="flex-1 w-full shrink-0 flex flex-col items-center gap-3 animate-fade-in text-left absolute inset-0 z-[100] bg-[#0e100c]/98 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-2xl flex flex-col gap-3">
              {/* Close Button */}
              <div className="flex justify-end">
                 <button onClick={() => setActiveLeftTab(null)} className="text-zinc-400 hover:text-white p-2 px-4 border border-zinc-700 rounded bg-zinc-900 font-mono text-[10px] uppercase font-black transition-colors flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Close Panel</button>
              </div>
              <div className="bg-[#12160d]/95 border border-[#303a24] p-4 rounded-lg flex flex-col gap-3 shadow-[0_10px_40px_rgba(0,0,0,1)] select-none">
                {activeLeftTab === 'map' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black font-mono uppercase tracking-widest text-[#fbbf24] flex items-center gap-1.5">
                      <Radar className="w-3.5 h-3.5 animate-pulse" /> topography sector
                    </span>
                    <div className="text-[8.5px] font-mono text-zinc-400 uppercase leading-relaxed mb-1">
                      Choose dynamic tactical sector. Updating maps resets team configurations.
                    </div>
                    {/* Compact selection maps list */}
                    <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-0.5">
                      {MAPS.map((mapPreset) => {
                        const isSelected = selectedMapId === mapPreset.id;
                        return (
                          <button
                            key={mapPreset.id}
                            type="button"
                            onClick={(e) => { e.preventDefault(); selectMap(mapPreset.id); }}
                            className={`text-left p-1.5 rounded border transition-all text-[10px] font-mono uppercase flex flex-col justify-between group cursor-pointer ${
                              isSelected ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.2)]' : 'bg-black/25 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                          >
                            <span className="font-bold flex items-center justify-between w-full">
                              <span className="truncate">{mapPreset.name}</span>
                              {isSelected && <span className="text-[7.5px] bg-[#fbbf24] text-black px-1 rounded-sm select-none font-black shrink-0">ACTIVE</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeLeftTab === 'logs' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase font-black text-[#fbbf24] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> SENSORY CONSOLE FEED
                    </span>
                    <div className="bg-black/35 rounded border border-zinc-900 p-1 h-[320px]">
                      <CombatLog logs={logs} onClear={() => setLogs([])} />
                    </div>
                  </div>
                )}

                {activeLeftTab === 'leaderboard' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase font-black text-purple-400">
                      🏆 LEADERBOARD RANKINGS
                    </span>
                    <div className="h-[320px] overflow-y-auto">
                      <CommanderLeaderboard />
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* MAIN CENTER GROUND ASSIGNER CONTAINER */}
          <div className="flex-1 w-full flex flex-col gap-3 items-center justify-start shrink-0 order-1 overflow-y-auto custom-scrollbar h-full min-h-0 relative z-10 px-2 sm:px-4">
          
          {/* 0. SYSTEM STATUS INTEGRATED HEADER */}
          <div className="bg-[#12160d]/95 border border-[#303a24] p-2 rounded-lg flex flex-col lg:flex-row gap-3 items-stretch justify-between shadow-lg select-none shrink-0">
            {/* HOVER FEEDBACK IN HEADER */}
            <div className="flex-1 min-w-0 h-[80px] md:h-[60px] xl:h-[44px] overflow-hidden">
              {renderHoverHUD()}
            </div>

          </div>

          {/* MASTER COMMAND BAR (PANEL TOGGLES) */}
          <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between bg-[#1a2014] border border-[#445236] p-2 rounded-lg gap-2 shrink-0 font-mono text-[9px] sm:text-[10px] select-none text-left shadow-[0_4px_15px_rgba(0,0,0,0.5)] mt-1">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[#8b9180] font-black tracking-widest px-1 mr-1">OVERLAYS:</span>
              <button
                type="button"
                onClick={() => setActiveLeftTab(activeLeftTab === 'map' ? null : 'map')}
                className={`px-3 py-1.5 rounded uppercase font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5 ${
                  activeLeftTab === 'map' ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-black/30 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Radar className="w-3.5 h-3.5" /> Sector Map
              </button>
              <button
                type="button"
                onClick={() => setActiveLeftTab(activeLeftTab === 'logs' ? null : 'logs')}
                className={`px-3 py-1.5 rounded uppercase font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5 ${
                  activeLeftTab === 'logs' ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-black/30 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> Sensors
              </button>
              <button
                type="button"
                onClick={() => setActiveLeftTab(activeLeftTab === 'leaderboard' ? null : 'leaderboard')}
                className={`px-3 py-1.5 rounded uppercase font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5 ${
                  activeLeftTab === 'leaderboard' ? 'bg-purple-950/40 border-purple-800/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-black/30 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Rankings
              </button>
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setActiveRightTab(activeRightTab === 'roster' ? null : 'roster')}
                className={`px-3 py-1.5 rounded uppercase font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5 ${
                  activeRightTab === 'roster' ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-black/30 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Squads
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab(activeRightTab === 'unit_console' ? null : 'unit_console')}
                className={`px-3 py-1.5 rounded uppercase font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5 ${
                  activeRightTab === 'unit_console' ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-black/30 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" /> Targeting
              </button>
            </div>
          </div>

          {/* TACTICAL REGION CALIBRATION (MAP SELECTION) */}
          {mode === 'deploy' && (
            <div className="w-full max-w-3xl flex border border-[#303a24] p-3 md:p-4 rounded-lg flex-col sm:flex-row justify-between items-center sm:items-start gap-4 select-none bg-[#141810] shadow-[0_10px_25px_rgba(0,0,0,0.5)] shrink-0">
              <div className="flex items-start gap-3">
                <Radar className="w-6 h-6 text-amber-500 animate-spin shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] sm:text-xs font-black font-mono uppercase tracking-widest text-[#dae3ce]">
                    TOPOGRAPHY SECTOR CALIBRATION
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase leading-relaxed max-w-md border-t border-[#303a24] pt-1.5 mt-1.5">
                    Current sector layout determines grid constraints. <br className="hidden sm:block" /> {isOnline && !isHost ? 'Waiting for host to configure...' : 'Open map settings to adjust.'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('map')}
                  disabled={isOnline && !isHost}
                  className={`px-5 py-2.5 bg-amber-950/20 text-amber-400 rounded-lg flex items-center justify-center gap-2 font-mono text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap active:scale-95 w-full sm:w-auto shadow-md ${isOnline && !isHost ? 'opacity-50 cursor-not-allowed border border-amber-900/50' : 'cursor-pointer hover:bg-amber-900/40 hover:border-amber-400 border border-amber-500/50 hover:-translate-y-0.5 shadow-[0_0_20px_rgba(245,158,11,0.15)]'}`}
                >
                  <Radar className="w-4 h-4" />
                  Select Sector Map &raquo;
                </button>
                {selectedMapId && (
                  <span className="text-[8px] font-black text-emerald-400 font-mono tracking-widest uppercase">
                    ACTIVE: {MAPS.find(m => m.id === selectedMapId)?.name || 'UNKNOWN'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 1. ENEMY/RED FORCE DEPLOY SQUAD ROSTER (Placed ABOVE the Battlefield during deployment) */}
          {mode === 'deploy' && (
            <div 
              className={`p-3 rounded-lg border transition-all duration-300 ${
                teamSelection === 'enemy' 
                  ? 'border-fuchsia-500/50 bg-fuchsia-950/15 shadow-[0_0_15px_rgba(217,70,239,0.15)]' 
                  : 'border-[#2d3422] bg-[#141810]'
              } ${!isOnline || myTeam === 'enemy' ? 'cursor-pointer hover:border-fuchsia-500/40' : ''}`}
              onClick={() => {
                if (!isOnline || myTeam === 'enemy') {
                  setTeamSelection('enemy');
                }
              }}
            >
               <h2 className="text-fuchsia-400 font-bold mb-2 uppercase tracking-widest text-[10px] sm:text-xs font-mono flex items-center gap-1.5 border-b border-fuchsia-900/30 pb-2">
                 <div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_4px_#d946ef] animate-pulse animate-duration-1000"></div>
                 PURPLE SQUAD (TACTICAL ENEMY DEPLOYMENT AREA)
                 <span className="text-zinc-500 font-normal font-mono normal-case text-[9px] ml-auto">Deploys on rows 01-07 (top side of battlefield)</span>
               </h2>
               {renderRoster('enemy')}
            </div>
          )}

          {/* RECRUITMENT TIPS */}
          {mode === 'deploy' && selectedClass && (
            <div className="bg-[#1f1b0a]/90 border border-amber-500/30 p-2.5 rounded flex flex-col sm:flex-row items-center justify-between gap-y-2 select-none shadow animate-pulse font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[7.5px] bg-[#fbbf24] text-black px-1.5 py-0.5 rounded font-black uppercase">PRE-DEPLOY</span>
                <span className="text-[9.5px] font-mono text-zinc-100 uppercase font-black">
                  ARMING SQUAD COMPONENT: <span className="text-[#fbbf24]">{selectedClass.className}</span> ({selectedClass.archetype})
                </span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-[8.5px] font-mono text-[#afd19c] uppercase truncate flex-1 block">
                  Click highlighted cells on {teamSelection === 'player' ? 'bottom rows 08-15' : 'top rows 01-07'} to deploy
                </span>
                <button 
                  onClick={() => setSelectedClass(null)}
                  className="bg-[#3b1111] hover:bg-rose-900 border border-red-500/30 text-rose-300 font-mono text-[9px] uppercase rounded px-2.5 py-0.5 font-bold cursor-pointer transition-colors"
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}

          {/* 2. DYNAMIC MAP CONTAINER (Centered and responsive) */}
          <div className="bg-[#141810] border border-[#2d3422] rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center shadow-xl w-full relative">
            <div className="w-full flex flex-col items-center justify-center">

              <div className="w-full max-w-3xl flex items-center justify-center mb-2 shrink-0">
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

              {/* HIGH-TECH COMBAT TIMER COUNTDOWN HUD (For Online Active Play) */}
              {isOnline && mode === 'play' && !winner && (
                <div className={`w-full max-w-3xl mb-3.5 p-3 rounded-lg border font-mono text-[10px] sm:text-xs flex flex-col gap-2 select-none uppercase tracking-wider backdrop-blur-md transition-all duration-300 ${
                  timeLeft <= 15
                    ? 'bg-red-950/35 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse'
                    : activeTeam === myTeam
                      ? 'bg-emerald-950/25 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                      : 'bg-[#1a1f13] border-[#2d3422] text-[#8b9180]'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      {timeLeft <= 15 ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-550 animate-ping shrink-0" />
                          <span className="text-red-400 font-extrabold tracking-widest animate-pulse">WARNING // INITIATE DECISION</span>
                        </>
                      ) : activeTeam === myTeam ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-[#34d399] tracking-widest font-extrabold filter drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">ALLIED ACTION TURN active</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#8b9180] shrink-0" />
                          <span className="tracking-widest">HOSTILE TARGET INTERFACE ACTIVE</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[#8b9180]">OP_LIMIT:</span>
                      <span className={`font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded border leading-none ${
                        timeLeft <= 15 
                          ? 'bg-red-950/60 text-red-400 border-red-500/60' 
                          : activeTeam === myTeam 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/35' 
                            : 'bg-black/40 text-[#8b9180] border-[#2d3422]'
                      }`}>
                        {timeLeft.toString().padStart(2, '0')}s
                      </span>
                    </div>
                  </div>

                  {/* Scientific visual depleting progress bar */}
                  <div className="w-full h-2 bg-black/50 rounded border border-[#2d3422]/60 overflow-hidden relative p-[0.5px]">
                    <div 
                      className={`h-full rounded-sm transition-all duration-1000 ease-linear ${
                        timeLeft <= 15 
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse' 
                          : activeTeam === myTeam 
                            ? 'bg-emerald-450 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                            : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      }`}
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[8px] sm:text-[9.5px] font-bold text-[#8b9180] leading-none">
                    <span>SECTOR_SYNC: ONLINE</span>
                    {timeLeft === 0 && activeTeam !== myTeam ? (
                      <button 
                        onClick={handleEndTurn}
                        className="bg-red-600 hover:bg-red-500 border border-red-400 text-white font-extrabold px-2 py-1 rounded text-[8.5px] transition-all cursor-pointer animate-bounce shadow-md"
                      >
                        CLAIM OVERTIME TURN »
                      </button>
                    ) : (
                      <span>{activeTeam === myTeam ? "SELECT DEPLOYED UNIT AND TARGET ACTIONS" : "OPPOSING COMMANDER IS SOLVING CALCULUS..."}</span>
                    )}
                  </div>
                </div>
              )}
              {/* Aligned Coordinate Scales with Battlefield Grid */}
              <div className="relative w-full max-w-none min-w-[320px] flex items-center justify-center bg-[#090b07] border border-[#1e2317] rounded p-2 overflow-x-auto hide-scrollbar shrink-0 animate-fade-in mt-1">
                <div 
                  className="w-full flex flex-col select-none max-w-3xl"
                >
                  {/* Column labels scale (A-O) */}
                  <div 
                    className="grid gap-[1px] w-full mb-1 shrink-0" 
                    style={{ 
                      gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, 
                      paddingLeft: '24px', // width of left row labels column (20px) + gap space (4px)
                      paddingRight: '24px' // width of right row labels column (20px) + gap space (4px)
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
                    <div className="flex flex-col gap-[1px] select-none text-right w-[20px] mr-1 shrink-0">
                      {Array.from({ length: GRID_SIZE }).map((_, i) => (
                        <div key={i} className="flex-1 flex items-center justify-center text-[7.5px] sm:text-[9.5px] font-mono text-[#afd19c] font-black bg-[#141810]/80 border border-[#445236] rounded-[1px] py-1 select-none">
                          {(i + 1).toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Actual battlefield grid */}
                    <div className="flex-1 relative">
                      <div 
                        className={`grid gap-[1px] w-full transition-all border-2 border-[#546843] bg-[#12150e] shadow-inner rounded overflow-hidden ${shake ? 'animate-screenshake-heavy shadow-[0_0_25px_rgba(239,68,68,0.30)] border-red-600/85' : ''}`}
                        style={{ 
                          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                          backgroundColor: '#1b2015'
                        }}
                      >
                        {renderGrid()}
                      </div>
                    </div>

                    {/* Right Row labels vertical column (01-15) */}
                    <div className="flex flex-col gap-[1px] select-none text-left w-[20px] ml-1 shrink-0">
                      {Array.from({ length: GRID_SIZE }).map((_, i) => (
                        <div key={i} className="flex-1 flex items-center justify-center text-[7.5px] sm:text-[9.5px] font-mono text-[#afd19c]/65 font-semibold bg-[#141810]/50 border border-[#445236]/35 rounded-[1px] py-1 select-none">
                          {(i + 1).toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Column labels scale (A-O) */}
                  <div 
                    className="grid gap-[1px] w-full mt-1 shrink-0" 
                    style={{ 
                      gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, 
                      paddingLeft: '24px',
                      paddingRight: '24px'
                    }}
                  >
                    {Array.from({ length: GRID_SIZE }).map((_, i) => (
                      <div key={i} className="text-center text-[7.5px] sm:text-[9.5px] font-mono text-[#afd19c]/65 font-semibold py-0.5 select-none uppercase tracking-wider bg-black/45 border border-[#445236]/35 rounded-[1px]">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unified 1-Button Deployment and Battle Launch Flow (Placed below grid to prevent covering any playable squares!) */}
              {mode === 'deploy' && (
                <div className="w-full max-w-3xl mt-3.5 animate-fade-in flex justify-center">
                  <button
                    onClick={() => {
                      if (canStartBattleHook) {
                        if (isOnline && !isHost) return; // Wait for host
                        handleStartBattle();
                      }
                    }}
                    disabled={!canStartBattleHook || (isOnline && !isHost)}
                    className={`pointer-events-auto px-6 py-4 rounded-xl border font-mono text-[11px] sm:text-xs uppercase tracking-wider shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1 w-full ${
                      canStartBattleHook
                        ? (isOnline && !isHost 
                            ? 'bg-[#151c11]/90 border-[#303a24] text-zinc-500 cursor-not-allowed shadow-none'
                            : 'bg-emerald-950/95 border-emerald-500 text-emerald-400 hover:bg-emerald-900 border-2 hover:scale-105 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse'
                          )
                        : 'bg-[#12150e]/95 border-[#475231]/70 text-amber-500 shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-sm'
                    }`}
                  >
                    {(() => {
                      if (canStartBattleHook) {
                        if (isOnline) {
                          if (isHost) {
                            return (
                              <>
                                <span className="font-extrabold text-[#34d399] tracking-widest text-xs sm:text-sm flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                  ⚔️ INITIALIZE COIN TOSS
                                </span>
                                <span className="text-[9px] text-emerald-400/80 font-bold">ALL COMBATANTS READY // CLICK TO COMMENCE</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <span className="font-bold text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 animate-pulse" />
                                  DEPLOYMENT COMMITTED
                                </span>
                                <span className="text-[9px] text-zinc-500">WAITING FOR ENEMY COMMANDER TO COMMENCE BATTLE</span>
                              </>
                            );
                          }
                        } else {
                          return (
                            <>
                              <span className="font-extrabold text-emerald-450 tracking-widest text-xs sm:text-sm flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-405 animate-ping" />
                                ⚔️ START STRATEGIC ENGAGEMENT
                              </span>
                              <span className="text-[9px] text-[#afd19c] font-black animate-pulse">ALL SQUADS SYNCHRONIZED. CLICK TO ENTER FIELD</span>
                            </>
                          );
                        }
                      } else {
                        // Deployment in progress
                        if (isOnline) {
                          const myDeployed = myTeam === 'player' ? playerDeployedCount : enemyDeployedCount;
                          if (myDeployed < 4) {
                            return (
                              <>
                                <span className="font-bold text-amber-500 tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse animate-duration-1000" />
                                  PRE-DEPLOYING SQUAD
                                </span>
                                <span className="text-[9px] text-zinc-400 font-bold">PLACE {4 - myDeployed} MORE SQUAD UNITS ON GRID</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <span className="font-bold text-amber-500 tracking-wider flex items-center gap-1.5 animate-pulse">
                                  <span className="border border-amber-500/30 rounded px-1.5 py-0.5 bg-amber-950/20 text-[9px] mr-1">DEPLOYED (4/4)</span>
                                </span>
                                <span className="text-[9px] text-zinc-400">AWAITING ADVERSARY FORWARD FORCES DIRECTIVE</span>
                              </>
                            );
                          }
                        } else if (gameMode === 'local_ai') {
                          return (
                            <>
                              <span className="font-bold text-amber-450 tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                SQUAD ASSEMBLY IN PROGRESS
                              </span>
                              <span className="text-[9px] text-zinc-300 font-black">DEPLOY ALLIED SQUAD UNITS ({playerDeployedCount}/4)</span>
                            </>
                          );
                        } else {
                          // local p2p
                          if (playerDeployedCount < 4) {
                            return (
                              <>
                                <span className="font-bold text-sky-400 tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-sky-450 animate-pulse" />
                                  BLUE SQUAD ASSEMBLY (P1)
                                </span>
                                <span className="text-[9px] text-sky-300 font-bold">DEPLOY BLUE SQUAD UNITS ({playerDeployedCount}/4)</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <span className="font-bold text-[#f43f5e] tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#f43f5e] animate-pulse" />
                                  RED SQUAD ASSEMBLY (P2)
                                </span>
                                <span className="text-[9px] text-rose-350 font-bold">DEPLOY RED SQUAD UNITS ({enemyDeployedCount}/4)</span>
                              </>
                            );
                          }
                        }
                      }
                    })()}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* 3. PLAYER/BLUE FORCE DEPLOY SQUAD ROSTER (Placed BELOW the Battlefield during deployment) */}
          {mode === 'deploy' && (
            <div 
              className={`p-3 rounded-lg border transition-all duration-300 ${
                teamSelection === 'player' 
                  ? 'border-sky-500/50 bg-sky-950/15 shadow-[0_0_15px_rgba(56,189,248,0.15)]' 
                  : 'border-[#2d3422] bg-[#141810]'
              } ${!isOnline || myTeam === 'player' ? 'cursor-pointer hover:border-sky-500/40' : ''}`}
              onClick={() => {
                if (!isOnline || myTeam === 'player') {
                  setTeamSelection('player');
                }
              }}
            >
               <h2 className="text-sky-400 font-bold mb-2 uppercase tracking-widest text-[10px] sm:text-xs font-mono flex items-center gap-1.5 border-b border-sky-900/30 pb-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_4px_#38bdf8] animate-pulse"></div>
                 BLUE SQUAD (YOUR TACTICAL DEPLOYMENT AREA)
                 <span className="text-zinc-500 font-normal font-mono normal-case text-[9px] ml-auto">Deploys on rows 08-15 (bottom side of battlefield)</span>
               </h2>
               {renderRoster('player')}
            </div>
          )}

          {/* 4. SELECTED UNIT METRICS BAR / STANDBY CONSOLE (Play and Deploy Modes below the board inside the core control HUD) */}
          {(mode === 'play' || (mode === 'deploy' && selectedClass)) && activeRightTab !== 'unit_console' && (
            <div className="w-full animate-fade-in mt-1 z-35">
              <SelectedUnitConsole
                selectedUnit={mode === 'play' ? selectedUnit : (selectedClass ? {
                  id: 'preview-' + selectedClass.className,
                  class: getUnitClassWithBoosts(selectedClass, teamSelection),
                  x: -1,
                  y: -1,
                  hp: getUnitClassWithBoosts(selectedClass, teamSelection).stats.maxHP,
                  ap: 2,
                  team: teamSelection,
                } : null)}
                activeTeam={activeTeam}
                onEndTurn={handleEndTurn}
                onCancelSelection={() => {
                  if (mode === 'play') {
                    setSelectedUnitId(null);
                  } else {
                    setSelectedClass(null);
                  }
                }}
                isAbilityActive={isAbilityActive}
                onToggleAbility={() => {
                   if (selectedUnit?.class.ability?.type === 'self') {
                     handleSelfAbility();
                   } else {
                     setIsAbilityActive(!isAbilityActive);
                   }
                }}
                mapEnvironment={mapEnvironment}
                units={units}
                activeHoveredTile={hoveredTile}
                isOnline={isOnline}
                myTeam={myTeam}
                onPassUnit={handlePassUnit}
                mode={mode}
              />
            </div>
          )}

          {/* 4.5. SEMI-TRANSPARENT COMBAT FEED LOG (Placed directly under unit/battle controls during gameplay) */}
          {mode === 'play' && activeLeftTab !== 'logs' && (
            <div className="w-full flex justify-center animate-fade-in mt-1">
              <div className="w-full max-w-3xl xl:max-w-none">
                <HUDCombatLog 
                  logs={logs} 
                  onClear={() => setLogs([])}
                  activeTeam={activeTeam}
                />
              </div>
            </div>
          )}

          {/* 5. GORGEOUS POPUP MODAL OVERLAYS (Toggled via Top Command Hub buttons) */}
          </div> {/* CLOSE MAIN CENTER COLUMN ASSEMBLY */}

          {/* RIGHT COLUMN AUX PANEL */}
          {activeRightTab && (
            <div className="flex-1 w-full shrink-0 flex flex-col items-center gap-3 animate-fade-in text-left absolute inset-0 z-[100] bg-[#0e100c]/98 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-2xl flex flex-col gap-3">
              {/* Close Button */}
              <div className="flex justify-end">
                 <button onClick={() => setActiveRightTab(null)} className="text-zinc-400 hover:text-white p-2 px-4 border border-zinc-700 rounded bg-zinc-900 font-mono text-[10px] uppercase font-black transition-colors flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Close Panel</button>
              </div>
              {activeRightTab === 'roster' && (
                <div className="bg-[#12160d]/95 border border-[#303a24] p-3 rounded-lg flex flex-col gap-3 shadow-lg select-none">
                  <div className="flex items-center gap-2 border-b border-[#2d3422] pb-1.5 shrink-0">
                    <Users className="w-4 h-4 text-[#38bdf8]" />
                    <span className="text-[10px] font-black font-mono uppercase tracking-widest text-[#fbbf24]">
                      SQUAD INTEGERS & INTEGRITY
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-0.5">
                    <div className="border border-sky-500/20 bg-sky-950/20 p-2 rounded">
                      <span className="text-[9px] text-sky-400 font-extrabold block mb-1 uppercase pb-1 border-b border-sky-500/15">BLUE SQUADRON</span>
                      {renderRoster('player')}
                    </div>
                    <div className="border border-red-500/20 bg-red-955/20 p-2 rounded">
                      <span className="text-[9px] text-red-155 text-red-400 font-extrabold block mb-1 uppercase pb-1 border-b border-red-500/15">RED SQUADRON</span>
                      {renderRoster('enemy')}
                    </div>

                    {/* ACTIVE SQUAD CHEMISTRIES */}
                    {(() => {
                      const pClassNames = units.filter(u => u.team === 'player').map(u => u.class.className);
                      const eClassNames = units.filter(u => u.team === 'enemy').map(u => u.class.className);
                      const pChems = getActiveChemistries(pClassNames);
                      const eChems = getActiveChemistries(eClassNames);
                      const hasChems = pChems.length > 0 || eChems.length > 0;

                      if (!hasChems) return null;

                      return (
                        <div className="border border-[#2d3422]/60 bg-black/40 p-2 rounded flex flex-col gap-1.5 mt-1 text-[7.5px]">
                          <span className="text-[8px] text-[#fbbf24] font-black tracking-widest uppercase flex items-center gap-1.5 pb-1 border-b border-[#2d3422]/20">
                            <Zap className="w-3 h-3 text-[#fbbf24] animate-pulse" /> SQUAD CHEMISTRY SYNERGIES
                          </span>
                          
                          {pChems.map(chem => (
                            <div key={`p-${chem.id}`} className="bg-sky-500/5 border border-sky-500/20 p-1.5 rounded uppercase">
                              <div className="flex justify-between items-center font-black text-sky-400 mb-0.5">
                                <span>⚡ {chem.name}</span>
                                <span className="text-[5.5px] bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold px-1 rounded">BLUE</span>
                              </div>
                              <span className="text-zinc-400 font-medium text-[6.5px]">{chem.buffText}</span>
                            </div>
                          ))}

                          {eChems.map(chem => (
                            <div key={`e-${chem.id}`} className="bg-orange-500/5 border border-orange-500/20 p-1.5 rounded uppercase">
                              <div className="flex justify-between items-center font-black text-orange-400 mb-0.5">
                                <span>⚡ {chem.name}</span>
                                <span className="text-[5.5px] bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold px-1 rounded">RED</span>
                              </div>
                              <span className="text-zinc-400 font-medium text-[6.5px]">{chem.buffText}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="border-t border-zinc-800/60 pt-2 shrink-0">
                    <RosterStatus 
                      units={units}
                      activeTeam={activeTeam}
                      selectedUnitId={selectedUnitId}
                      onSelectUnit={(id) => { setSelectedUnitId(id); }}
                      mode={mode}
                      teamSelection={teamSelection}
                      setTeamSelection={setTeamSelection}
                      selectedClass={selectedClass}
                      setSelectedClass={setSelectedClass}
                      isOnline={!!isOnline}
                      myTeam={myTeam}
                    />
                  </div>
                </div>
              )}

              {activeRightTab === 'unit_console' && (
                <div className="bg-[#12160d]/95 border border-[#303a24] p-3 rounded-lg flex flex-col gap-2 shadow-lg text-left">
                  <div className="flex items-center justify-between border-b border-[#2d3a20] pb-1.5 shrink-0">
                    <span className="text-[10px] font-black font-mono uppercase text-[#fbbf24] flex items-center gap-1.5 font-black">
                      <Crosshair className="w-3.5 h-3.5 text-[#fbbf24] animate-pulse" /> TARGET INTERFACING DIAGNOSTICS
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <SelectedUnitConsole
                      selectedUnit={mode === 'play' ? selectedUnit : (selectedClass ? {
                        id: 'preview-' + selectedClass.className,
                        class: getUnitClassWithBoosts(selectedClass, teamSelection),
                        x: -1,
                        y: -1,
                        hp: getUnitClassWithBoosts(selectedClass, teamSelection).stats.maxHP,
                        ap: 2,
                        team: teamSelection,
                      } : null)}
                      activeTeam={activeTeam}
                      onEndTurn={handleEndTurn}
                      onCancelSelection={() => {
                        if (mode === 'play') {
                          setSelectedUnitId(null);
                        } else {
                          setSelectedClass(null);
                        }
                      }}
                      isAbilityActive={isAbilityActive}
                      onToggleAbility={() => {
                         if (selectedUnit?.class.ability?.type === 'self') {
                           handleSelfAbility();
                         } else {
                           setIsAbilityActive(!isAbilityActive);
                         }
                      }}
                      mapEnvironment={mapEnvironment}
                      units={units}
                      activeHoveredTile={hoveredTile}
                      isOnline={isOnline}
                      myTeam={myTeam}
                      onPassUnit={handlePassUnit}
                      mode={mode}
                    />
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {/* 5. GORGEOUS POPUP MODAL OVERLAYS (Toggled via Top Command Hub buttons) */}
          {/* Popup modals omitted to utilize modern non-blocking docked side columns */}

        </div>

      </div>
    </div>
  );
}
