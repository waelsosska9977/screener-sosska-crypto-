import React from 'react';
import { TrendingUp, TrendingDown, ShieldAlert, Activity, CheckCircle2, Clock } from 'lucide-react';
import { MacroBtcStatus } from '../types/scanner';

interface MacroRegimeBannerProps {
  macro: MacroBtcStatus | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const MacroRegimeBanner: React.FC<MacroRegimeBannerProps> = ({ macro, isLoading, onRefresh }) => {
  if (!macro) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 animate-pulse flex items-center justify-between">
        <div className="h-6 w-64 bg-neutral-800 rounded"></div>
        <div className="h-6 w-32 bg-neutral-800 rounded"></div>
      </div>
    );
  }

  const isBull = macro.regime === 'BULLISH';

  return (
    <div className={`rounded-xl border transition-all p-5 ${
      isBull 
        ? 'bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-neutral-950 border-emerald-500/30' 
        : 'bg-gradient-to-r from-rose-950/30 via-neutral-900 to-neutral-950 border-rose-500/30'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: BTC Price & Regime */}
        <div className="flex items-start sm:items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isBull 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {isBull ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                فلتر نظام السوق الكلي (Macro Market Regime) · 15m
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isBull ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isBull ? 'BULLISH MARKET' : 'BEARISH MARKET'}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{isBull ? 'سوق صاعد · فحص صفقات الشراء (LONG) فقط' : 'سوق هابط · فحص صفقات البيع (SHORT) فقط'}</span>
            </h2>

            <p className="text-xs text-neutral-400 mt-1">
              {isBull 
                ? 'سعر البيتكوين أعلى من خط EMA 100 على فريم 15 دقيقة. يتم فلترة أزواج USDT للبحث عن الاختراقات الصاعدة فقط وتجاهل أي إشارات بيع منعاً للمصائد.'
                : 'سعر البيتكوين أدنى من خط EMA 100 على فريم 15 دقيقة. يتم البحث عن فرص البيع والشورت (SHORT) فقط لحماية المحفظة من مصائد الهبوط.'}
            </p>
          </div>
        </div>

        {/* Right: Telemetry data */}
        <div className="flex items-center gap-4 bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3 self-stretch md:self-auto justify-between md:justify-end">
          <div className="text-right">
            <div className="text-xs text-neutral-400">سعر البيتكوين (BTC/USDT)</div>
            <div className="text-base font-bold font-mono tabular-nums text-white">
              ${macro.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
          </div>

          <div className="h-8 w-px bg-neutral-800"></div>

          <div className="text-right">
            <div className="text-xs text-neutral-400">EMA 100 (15m)</div>
            <div className="text-base font-bold font-mono tabular-nums text-neutral-300">
              ${macro.ema100.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
          </div>

          <div className="h-8 w-px bg-neutral-800"></div>

          <div className="text-right">
            <div className="text-xs text-neutral-400">الفارق النسبي</div>
            <div className={`text-base font-bold font-mono tabular-nums ${
              macro.diffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {macro.diffPct >= 0 ? `+${macro.diffPct.toFixed(2)}%` : `${macro.diffPct.toFixed(2)}%`}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
