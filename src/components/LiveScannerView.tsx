import React, { useState } from 'react';
import { 
  Play, RefreshCw, TrendingUp, TrendingDown, CheckCircle2, 
  XCircle, Clock, Eye, Copy, Check, Filter, Search, Zap, Compass 
} from 'lucide-react';
import { MacroBtcStatus, PairScanResult, BreakoutSignal } from '../types/scanner';
import { MacroRegimeBanner } from './MacroRegimeBanner';
import { formatPrice } from '../services/marketScanner';

interface LiveScannerViewProps {
  macro: MacroBtcStatus | null;
  results: PairScanResult[];
  signals: BreakoutSignal[];
  isScanning: boolean;
  onRunScan: () => void;
  onSelectSignal: (signal: BreakoutSignal) => void;
  onCopyTelegram: (signal: BreakoutSignal) => void;
  lastScanTime: string | null;
}

export const LiveScannerView: React.FC<LiveScannerViewProps> = ({
  macro,
  results,
  signals,
  isScanning,
  onRunScan,
  onSelectSignal,
  onCopyTelegram,
  lastScanTime
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'passed' | 'golden'>('all');

  const isBullish = macro?.regime === 'BULLISH';
  const targetDir = isBullish ? 'LONG' : 'SHORT';

  const filteredResults = results.filter(r => {
    const matchesSearch = r.cleanSymbol.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'passed') return r.passedAll;
    if (filterMode === 'golden') return r.fibonacci?.currentZone === 'GOLDEN_POCKET' || r.fibonacci?.currentZone === 'OTE_PRIME';
    return true;
  });

  const handleCopy = (sig: BreakoutSignal) => {
    onCopyTelegram(sig);
    setCopiedId(sig.symbol);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* 1. Macro Market Regime Status Banner */}
      <MacroRegimeBanner macro={macro} isLoading={isScanning} onRefresh={onRunScan} />

      {/* 2. Strategy KPI Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs font-medium text-neutral-400">حالة السوق الماكرو (Macro BTC)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-bold font-mono ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
              {macro ? `${macro.regime} (${isBullish ? 'صاعد' : 'هابط'})` : '---'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            BTC {macro?.diffPct ? (macro.diffPct > 0 ? `+${macro.diffPct.toFixed(2)}%` : `${macro.diffPct.toFixed(2)}%`) : ''} فوق EMA 100
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs font-medium text-neutral-400">الاتجاه المسموح به حالياً</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-bold font-mono px-2 py-0.5 rounded ${
              isBullish ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {targetDir} ONLY
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {isBullish ? 'صفقات شراء فقط وتجاهل الشورت' : 'صفقات بيع فقط وتجاهل الشراء'}
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs font-medium text-neutral-400">الأزواج المفحوصة (15m)</span>
          <div className="text-lg font-bold text-white font-mono mt-1 tabular-nums">
            {results.length} أزواج نشطة
          </div>
          <span className="text-[11px] text-neutral-500">Binance Live Prices & Futures</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs font-medium text-neutral-400">الإشارات المؤكدة المقتنصة</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-bold font-mono tabular-nums ${signals.length > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
              {signals.length} فرص مؤكدة
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            {lastScanTime ? `آخر فحص: ${lastScanTime.substring(11, 19)}` : 'جاهز للمسح'}
          </span>
        </div>
      </div>

      {/* 3. Confirmed Signals Showcase (High Priority Visual Cards) */}
      {signals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-base font-bold text-white">
                الإشارات المؤكدة المقتنصة الآن ({signals.length})
              </h3>
            </div>
            <span className="text-xs text-neutral-400">جاهزة للإرسال إلى Telegram مع أهداف فيبوناتشي</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals.map((sig) => {
              const isLong = sig.direction === 'LONG';
              const fib = sig.fibonacci;

              return (
                <div 
                  key={sig.symbol}
                  className={`bg-neutral-900 border rounded-xl p-5 transition-all relative overflow-hidden ${
                    isLong 
                      ? 'border-emerald-500/40 hover:border-emerald-500/70 shadow-lg shadow-emerald-950/20' 
                      : 'border-rose-500/40 hover:border-rose-500/70 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono text-white tracking-wide">
                          {sig.cleanSymbol}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
                          isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {sig.direction} · {sig.timeframe}
                        </span>
                        {fib && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                            {fib.currentZoneLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        دخول عند إغلاق الشمعة: <strong className="text-white font-mono tabular-nums">{formatPrice(sig.entry)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(sig)}
                        title="نسخ نص التنبيه بصيغة Markdown"
                        className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors border border-neutral-700"
                      >
                        {copiedId === sig.symbol ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onSelectSignal(sig)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-colors font-sans"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>تحليل الفيبوناتشي والشارت</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Levels Grid (ATR + Fib Confluence) */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-neutral-800/80 text-right">
                    <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/60">
                      <div className="text-[11px] text-rose-400 font-medium">الوقف (SL · 1.8 ATR)</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-rose-300 mt-0.5">
                        {formatPrice(sig.stopLoss)}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {sig.slPct > 0 ? `+${sig.slPct.toFixed(2)}%` : `${sig.slPct.toFixed(2)}%`}
                      </div>
                    </div>

                    <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/60">
                      <div className="text-[11px] text-emerald-400 font-medium">الهدف 1 (TP1 · 2.5)</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-emerald-300 mt-0.5">
                        {formatPrice(sig.tp1)}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {sig.tp1Pct > 0 ? `+${sig.tp1Pct.toFixed(2)}%` : `${sig.tp1Pct.toFixed(2)}%`} · R:R 1:{sig.riskReward1}
                      </div>
                    </div>

                    <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/60">
                      <div className="text-[11px] text-teal-400 font-medium">الهدف 2 (TP2 · 5.0)</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-teal-300 mt-0.5">
                        {formatPrice(sig.tp2)}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {sig.tp2Pct > 0 ? `+${sig.tp2Pct.toFixed(2)}%` : `${sig.tp2Pct.toFixed(2)}%`} · R:R 1:{sig.riskReward2}
                      </div>
                    </div>
                  </div>

                  {/* Fibonacci Confluence Strip */}
                  {fib && (
                    <div className="mt-3 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 text-neutral-300">
                        <span className="text-yellow-400 font-mono font-bold">Fib 0.618: {formatPrice(fib.fib618)}</span>
                        <span>·</span>
                        <span className="text-neutral-400">Fib 0.500: {formatPrice(fib.fib500)}</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-[10px]">
                        امتداد 1.618: {formatPrice(fib.fibExt1618)}
                      </span>
                    </div>
                  )}

                  {/* Quantitative Rationale Metas */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-neutral-400 font-mono">
                    <span>الفوليوم: <strong className="text-white">{sig.volRatio.toFixed(2)}x SMA20</strong></span>
                    <span>·</span>
                    <span>RSI: <strong className="text-amber-400">{sig.rsi.toFixed(1)}</strong> ({sig.rsiRange})</span>
                    <span>·</span>
                    <span>ATR: <strong className="text-neutral-300">{formatPrice(sig.atr)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Complete Pairs Matrix / Scanner Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {/* Table Controls */}
        <div className="px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950/60">
          <div>
            <h3 className="text-sm font-bold text-white">
              مصفوفة فحص أزواج بينانس اللحظية مع مستويات فيبوناتشي
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              أسعار حية مباشرة من بينانس مع تحليل ضلع فيبوناتشي التلقائي وتحديد مناطق البيع والشراء
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث عن زوج..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 w-36 sm:w-44 font-mono text-left"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterMode === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                الكل ({results.length})
              </button>
              <button
                onClick={() => setFilterMode('passed')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterMode === 'passed' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                المؤكدة فقط ({signals.length})
              </button>
              <button
                onClick={() => setFilterMode('golden')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterMode === 'golden' ? 'bg-yellow-500/20 text-yellow-300 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                النسبة الذهبية OTE
              </button>
            </div>
          </div>
        </div>

        {/* Dense Quantitative Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/40">
                <th className="py-3 px-4 font-medium">الزوج</th>
                <th className="py-3 px-4 font-medium">السعر الحي (Live)</th>
                <th className="py-3 px-4 font-medium">موقع فيبوناتشي (Fib Zone)</th>
                <th className="py-3 px-4 font-medium">الاتجاه</th>
                <th className="py-3 px-4 font-medium">تقاطع 5/15</th>
                <th className="py-3 px-4 font-medium">EMA 50</th>
                <th className="py-3 px-4 font-medium">الفوليوم (&ge; 1.4x)</th>
                <th className="py-3 px-4 font-medium">RSI (14)</th>
                <th className="py-3 px-4 font-medium text-center">القرار</th>
                <th className="py-3 px-4 font-medium text-left">شارت وفيبو</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-500 font-sans">
                    لا توجد أزواج تطابق خيارات الفلترة المحددة.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => {
                  const isLongTarget = r.targetDirection === 'LONG';
                  const fib = r.fibonacci;

                  return (
                    <tr 
                      key={r.symbol}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        r.passedAll ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Pair Symbol */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${r.passedAll ? 'bg-amber-400' : 'bg-neutral-600'}`}></span>
                          <span>{r.cleanSymbol}</span>
                        </div>
                      </td>

                      {/* Live Price formatted with formatPrice */}
                      <td className="py-3 px-4 text-emerald-400 font-bold tabular-nums">
                        {formatPrice(r.price)}
                      </td>

                      {/* Fibonacci Current Zone Badge */}
                      <td className="py-3 px-4 font-sans">
                        {fib ? (
                          <div className="flex flex-col">
                            <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium inline-block w-fit ${
                              fib.currentZone === 'GOLDEN_POCKET'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : fib.currentZone === 'OTE_PRIME'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : fib.currentZone === 'BREAKOUT_ZONE'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              {fib.currentZoneLabel}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono mt-0.5">
                              0.618: {formatPrice(fib.fib618)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>

                      {/* Target Direction */}
                      <td className="py-3 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                          isLongTarget ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {r.targetDirection}
                        </span>
                      </td>

                      {/* EMA 5 / 15 Cross */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 ${
                          r.checks.emaCross ? 'text-emerald-400' : 'text-neutral-500'
                        }`}>
                          {r.checks.emaCross ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span className="font-sans text-[11px]">
                            {r.checks.emaCross ? 'مكتمل' : 'غير متقاطع'}
                          </span>
                        </span>
                      </td>

                      {/* Price vs EMA 50 */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 ${
                          r.checks.trendBaselineOk ? 'text-emerald-400' : 'text-neutral-500'
                        }`}>
                          {r.checks.trendBaselineOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span className="font-sans text-[11px]">
                            {isLongTarget ? '> EMA 50' : '< EMA 50'}
                          </span>
                        </span>
                      </td>

                      {/* Volume Ratio */}
                      <td className="py-3 px-4 tabular-nums">
                        <span className={r.checks.volumeExplosion ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                          {r.volRatio.toFixed(2)}x
                        </span>
                      </td>

                      {/* RSI */}
                      <td className="py-3 px-4 tabular-nums">
                        <span className={r.checks.rsiHealthy ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                          {r.rsi.toFixed(1)}
                        </span>
                      </td>

                      {/* Final Status */}
                      <td className="py-3 px-4 text-center">
                        {r.passedAll ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-neutral-950 font-sans">
                            <Zap className="w-3 h-3 fill-neutral-950" />
                            <span>فرصة مؤكدة</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-500 font-sans">
                            مراقبة
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-left">
                        {r.signal ? (
                          <button
                            onClick={() => onSelectSignal(r.signal!)}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium underline font-sans flex items-center gap-1"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>فحص الفيبو</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Create an on-demand inspectable signal container for chart inspection
                              const tempSignal: BreakoutSignal = {
                                symbol: r.symbol,
                                cleanSymbol: r.cleanSymbol,
                                direction: r.targetDirection,
                                timeframe: '15m',
                                entry: r.price,
                                stopLoss: isLongTarget ? r.price - 1.8 * r.atr : r.price + 1.8 * r.atr,
                                tp1: isLongTarget ? r.price + 2.5 * r.atr : r.price - 2.5 * r.atr,
                                tp2: isLongTarget ? r.price + 5.0 * r.atr : r.price - 5.0 * r.atr,
                                slPct: -((1.8 * r.atr) / r.price) * 100,
                                tp1Pct: ((2.5 * r.atr) / r.price) * 100,
                                tp2Pct: ((5.0 * r.atr) / r.price) * 100,
                                riskReward1: 1.39,
                                riskReward2: 2.78,
                                volRatio: r.volRatio,
                                rsi: r.rsi,
                                rsiRange: isLongTarget ? '52-68' : '32-48',
                                atr: r.atr,
                                ema5: r.ema5,
                                ema15: r.ema15,
                                ema50: r.ema50,
                                volume24h: r.volume24h,
                                macroStatus: macro?.regime || 'BULLISH',
                                btcPrice: macro?.price || 82750,
                                btcEma: macro?.ema100 || 81900,
                                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                                candles: [],
                                fibonacci: r.fibonacci
                              };
                              onSelectSignal(tempSignal);
                            }}
                            className="text-xs text-neutral-400 hover:text-white font-sans underline"
                          >
                            معاينة الفيبو
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
