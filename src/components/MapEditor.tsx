import React, { useState, useCallback } from 'react';
import { ArrowLeft, Save, Trash2, Download, Upload, RotateCcw, Grid, Copy, Check } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../lib/storage';

type TileType = 'floor' | 'wall' | 'crate' | 'fire' | 'poison' | 'barrel';

interface MapEditorProps {
  onBack: () => void;
  onPlayMap?: (layout: string[]) => void;
}

const TILE_CHARS: Record<TileType, string> = {
  floor: '_',
  wall: 'X',
  crate: 'C',
  fire: 'F',
  poison: 'P',
  barrel: 'B',
};

const CHAR_TO_TILE: Record<string, TileType> = {
  '_': 'floor',
  'X': 'wall',
  'C': 'crate',
  'F': 'fire',
  'P': 'poison',
  'B': 'barrel',
};

const TILE_STYLES: Record<TileType, { bg: string; label: string; shortLabel: string }> = {
  floor: { bg: 'bg-zinc-900/60', label: 'Floor', shortLabel: '_' },
  wall: { bg: 'bg-zinc-600', label: 'Wall', shortLabel: 'X' },
  crate: { bg: 'bg-amber-900/70', label: 'Crate', shortLabel: 'C' },
  fire: { bg: 'bg-orange-600/50', label: 'Fire', shortLabel: 'F' },
  poison: { bg: 'bg-lime-600/40', label: 'Poison', shortLabel: 'P' },
  barrel: { bg: 'bg-red-800/60', label: 'Barrel', shortLabel: 'B' },
};

const GRID_SIZE = 15;

function createEmptyGrid(): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'floor' as TileType)
  );
}

function gridToLayout(grid: TileType[][]): string[] {
  return grid.map(row => row.map(t => TILE_CHARS[t]).join(''));
}

function layoutToGrid(layout: string[]): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = layout[y]?.[x] || '_';
      row.push(CHAR_TO_TILE[ch] || 'floor');
    }
    grid.push(row);
  }
  return grid;
}

interface SavedMap {
  name: string;
  layout: string[];
  createdAt: number;
}

export default function MapEditor({ onBack, onPlayMap }: MapEditorProps) {
  const [grid, setGrid] = useState<TileType[][]>(createEmptyGrid);
  const [activeTile, setActiveTile] = useState<TileType>('wall');
  const [mapName, setMapName] = useState('Custom Map');
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    try {
      const stored = safeGetItem('tc_custom_maps');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isPainting, setIsPainting] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const paintTile = useCallback((x: number, y: number) => {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[y][x] = next[y][x] === activeTile ? 'floor' : activeTile;
      return next;
    });
  }, [activeTile]);

  const handleMouseDown = (x: number, y: number) => {
    setIsPainting(true);
    paintTile(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isPainting) paintTile(x, y);
  };

  const handleMouseUp = () => setIsPainting(false);

  const handleSave = () => {
    const layout = gridToLayout(grid);
    const newMap: SavedMap = { name: mapName || 'Untitled', layout, createdAt: Date.now() };
    const updated = [...savedMaps, newMap];
    setSavedMaps(updated);
    safeSetItem('tc_custom_maps', JSON.stringify(updated));
  };

  const handleDelete = (index: number) => {
    const updated = savedMaps.filter((_, i) => i !== index);
    setSavedMaps(updated);
    safeSetItem('tc_custom_maps', JSON.stringify(updated));
  };

  const handleLoad = (map: SavedMap) => {
    setGrid(layoutToGrid(map.layout));
    setMapName(map.name);
    setShowSaved(false);
  };

  const handleClear = () => setGrid(createEmptyGrid());

  const handleExport = () => {
    const layout = gridToLayout(grid);
    const text = layout.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n').map(l => l.trim());
    if (lines.length >= GRID_SIZE) {
      setGrid(layoutToGrid(lines));
      setShowImport(false);
      setImportText('');
    }
  };

  const tileCount = (type: TileType) => grid.flat().filter(t => t === type).length;

  return (
    <div
      className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-300 font-mono p-4 sm:p-6 flex flex-col items-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50" />

      <div className="w-full max-w-4xl z-10 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to HQ
          </button>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Grid className="w-5 h-5 text-amber-400" /> Map Editor
          </h2>
        </div>

        {/* Map Name */}
        <div className="flex items-center gap-3">
          <input
            value={mapName}
            onChange={e => setMapName(e.target.value)}
            maxLength={30}
            className="flex-1 bg-black/50 border border-zinc-800/50 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono uppercase tracking-wider outline-none"
            placeholder="MAP NAME"
          />
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={handleClear} className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        {/* Tile Palette */}
        <div className="flex flex-wrap gap-2 bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-3">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold w-full mb-1">Tile Palette</span>
          {(Object.keys(TILE_STYLES) as TileType[]).map(type => (
            <button
              key={type}
              onClick={() => setActiveTile(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                activeTile === type
                  ? 'border-amber-400 bg-amber-500/15 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]'
                  : 'border-zinc-700/30 bg-zinc-800/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              <div className={`w-5 h-5 rounded ${TILE_STYLES[type].bg} border border-zinc-600/30 flex items-center justify-center text-[8px] font-mono`}>
                {type === 'fire' && <span className="text-orange-300">F</span>}
                {type === 'poison' && <span className="text-lime-300">P</span>}
                {type === 'barrel' && <span className="text-red-300">B</span>}
                {type === 'wall' && <span className="text-zinc-300">X</span>}
                {type === 'crate' && <span className="text-amber-300">C</span>}
              </div>
              {TILE_STYLES[type].label}
              <span className="text-[8px] text-zinc-500">({tileCount(type)})</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-3 flex justify-center overflow-x-auto">
          <div
            className="grid gap-[1px] select-none touch-none"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {grid.map((row, y) =>
              row.map((tile, x) => (
                <div
                  key={`${x}-${y}`}
                  onMouseDown={() => handleMouseDown(x, y)}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onTouchStart={(e) => { e.preventDefault(); paintTile(x, y); }}
                  className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-sm cursor-crosshair transition-colors duration-75 border border-zinc-800/20 hover:border-amber-400/50 flex items-center justify-center text-[7px] sm:text-[8px] font-bold ${TILE_STYLES[tile].bg}`}
                >
                  {tile === 'wall' && <span className="text-zinc-400">X</span>}
                  {tile === 'crate' && <span className="text-amber-600">C</span>}
                  {tile === 'fire' && <span className="text-orange-400">F</span>}
                  {tile === 'poison' && <span className="text-lime-400">P</span>}
                  {tile === 'barrel' && <span className="text-red-400">B</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column labels */}
        <div className="flex justify-center">
          <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_SIZE }, (_, i) => (
              <div key={i} className="w-6 sm:w-7 md:w-8 text-center text-[7px] text-zinc-600 font-mono">{i}</div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Export Layout</>}
          </button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import Layout
          </button>
          <button onClick={() => setShowSaved(!showSaved)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
            <Download className="w-3.5 h-3.5" /> Saved Maps ({savedMaps.length})
          </button>
          {onPlayMap && (
            <button
              onClick={() => onPlayMap(gridToLayout(grid))}
              className="flex items-center gap-1.5 px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-lg text-xs font-black uppercase cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              Play This Map
            </button>
          )}
        </div>

        {/* Import Panel */}
        {showImport && (
          <div className="bg-zinc-900/80 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <span className="text-[10px] text-purple-400 font-bold uppercase">Paste layout (15 lines, 15 chars each)</span>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={8}
              className="w-full bg-black/60 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-300 font-mono outline-none focus:border-purple-400 resize-none"
              placeholder={"_______________\n_XX_C_____C_XX_\n..."}
            />
            <button onClick={handleImport} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors">
              Load Layout
            </button>
          </div>
        )}

        {/* Saved Maps */}
        {showSaved && (
          <div className="bg-zinc-900/80 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Saved Custom Maps</span>
            {savedMaps.length === 0 ? (
              <p className="text-xs text-zinc-500 uppercase">No saved maps yet. Create and save one above!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedMaps.map((m, i) => (
                  <div key={i} className="bg-black/40 border border-zinc-800/40 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase">{m.name}</span>
                      <span className="text-[8px] text-zinc-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    {/* Mini preview */}
                    <div className="grid gap-[0.5px]" style={{ gridTemplateColumns: `repeat(15, 1fr)` }}>
                      {m.layout.map((row, ry) =>
                        row.split('').map((ch, rx) => {
                          const t = CHAR_TO_TILE[ch] || 'floor';
                          return (
                            <div
                              key={`${rx}-${ry}`}
                              className={`w-1.5 h-1.5 ${t === 'wall' ? 'bg-zinc-500' : t === 'crate' ? 'bg-amber-700' : t === 'fire' ? 'bg-orange-500' : t === 'poison' ? 'bg-lime-500' : t === 'barrel' ? 'bg-red-600' : 'bg-zinc-900/60'}`}
                            />
                          );
                        })
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleLoad(m)} className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors">
                        Load
                      </button>
                      {onPlayMap && (
                        <button onClick={() => onPlayMap(m.layout)} className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors">
                          Play
                        </button>
                      )}
                      <button onClick={() => handleDelete(i)} className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-zinc-900/50 border border-zinc-800/30 rounded-lg p-3 text-[9px] text-zinc-500 uppercase space-y-1">
          <p>Click or drag to paint tiles. Click a painted tile again to erase it back to floor.</p>
          <p>Maps are 15x15. Deploy zones are rows 0-6 (enemy) and rows 8-14 (player).</p>
          <p>Fire deals 15 dmg on move. Poison deals 10 dmg. Barrels explode for 30 AoE when shot.</p>
        </div>
      </div>
    </div>
  );
}
