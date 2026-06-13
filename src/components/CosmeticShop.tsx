import React, { useState } from 'react';
import { ShoppingBag, Check, Lock, Coins, Palette } from 'lucide-react';
import { BOARD_THEMES, BoardTheme } from '../progression';

interface CosmeticShopProps {
  credits: number;
  unlockedThemes: string[];
  activeTheme: string;
  onPurchase: (themeId: string) => void;
  onEquip: (themeId: string) => void;
}

export default function CosmeticShop({ credits, unlockedThemes, activeTheme, onPurchase, onEquip }: CosmeticShopProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleBuy = (theme: BoardTheme) => {
    if (confirmId === theme.id) {
      onPurchase(theme.id);
      setConfirmId(null);
    } else {
      setConfirmId(theme.id);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 font-mono flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">Armory</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
          <Coins className="w-3.5 h-3.5" /> {credits.toLocaleString()}
        </div>
      </div>

      <div className="text-[9px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
        <Palette className="w-3 h-3" /> Board Themes
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BOARD_THEMES.map((theme) => {
          const owned = unlockedThemes.includes(theme.id);
          const equipped = activeTheme === theme.id;
          const canAfford = credits >= theme.price;

          return (
            <div key={theme.id} className={`p-3 rounded-lg border transition-all ${
              equipped
                ? 'border-amber-500/40 bg-amber-500/5'
                : owned
                ? 'border-zinc-700/30 bg-zinc-800/20 hover:border-zinc-600/40'
                : 'border-zinc-800/20 bg-zinc-900/30'
            }`}>
              {/* Preview strip */}
              <div className="flex gap-1 mb-2 h-6 rounded-md overflow-hidden border border-zinc-800/30">
                <div className={`flex-1 ${theme.floor}`} />
                <div className={`w-6 ${theme.wall}`} />
                <div className={`w-4 ${theme.crate}`} />
                <div className={`flex-1 ${theme.floor}`} />
                <div className={`w-4 ${theme.crate}`} />
                <div className={`w-6 ${theme.wall}`} />
                <div className={`flex-1 ${theme.floor}`} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-zinc-200 uppercase truncate">{theme.name}</div>
                  <div className="text-[8px] text-zinc-500 mt-0.5">{theme.preview}</div>
                </div>

                {equipped ? (
                  <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md uppercase shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                ) : owned ? (
                  <button
                    type="button"
                    onClick={() => onEquip(theme.id)}
                    className="text-[8px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-md uppercase shrink-0 cursor-pointer hover:bg-sky-500/20 transition-colors"
                  >
                    Equip
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuy(theme)}
                    disabled={!canAfford}
                    className={`text-[8px] font-bold px-2 py-1 rounded-md uppercase shrink-0 transition-colors flex items-center gap-1 ${
                      !canAfford
                        ? 'text-zinc-600 bg-zinc-800/30 border border-zinc-800/20 cursor-not-allowed'
                        : confirmId === theme.id
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 cursor-pointer animate-pulse'
                        : 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 cursor-pointer hover:bg-fuchsia-500/20'
                    }`}
                  >
                    {!canAfford ? (
                      <><Lock className="w-3 h-3" /> {theme.price}</>
                    ) : confirmId === theme.id ? (
                      'Confirm?'
                    ) : (
                      <><Coins className="w-3 h-3" /> {theme.price}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
