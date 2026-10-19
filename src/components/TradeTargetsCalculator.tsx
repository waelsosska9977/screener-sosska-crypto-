import React, { useState } from 'react';
import { Target, Shield, Scale, TrendingUp, TrendingDown, DollarSign, ArrowRight, CheckCircle2, AlertCircle, Percent, Compass, Sparkles } from 'lucide-react';
import { BreakoutSignal, SignalDirection } from '../types/scanner';
import { formatPrice } from '../services/marketScanner';

interface TradeTargetsCalculatorProps {
  signals: BreakoutSignal[];
  onSelectSignalForChart?: (signal: BreakoutSignal) => void;
}

export const TradeTargetsCalculator: React.FC<TradeTargetsCalculatorProps> = ({
  signals,
  onSelectSignalForChart
}) => {
  // Calculator state
  const [direction, setDirection] = useState<SignalDirection>('LONG');
  const [symbolName, setSymbolName] = useState<string>('SOL/USDT');
  const [entryPrice, setEntryPrice] = useState<number>(105.67);
  const [atrValue, setAtrValue] = useState<number>(2.45);
  const [accountBalance, setAccountBalance] = useState<number>(2000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5); // 1.5%

  // Auto Fibonacci Swing inputs
  const [swingHigh, setSwingHigh] = useState<number>(112.50);
  const [swingLow, setSwingLow] = useState<number>(98.20);
  const [activeModel, setActiveModel] = useState<'both' | 'atr' | 'fib'>('both');

  // Auto-sync with first live signal if available
  React.useEffect(() => {
    if (signals && signals.length > 0) {
      const first = signals[0];
      setSymbolName(first.cleanSymbol);
      setDirection(first.direction);
      setEntryPrice(first.entry);
      setAtrValue(first.atr);
      if (first.fibonacci) {
        setSwingHigh(first.fibonacci.swingHigh);
        setSwingLow(first.fibonacci.swingLow);
      }
    }
  }, [signals]);

  const isLong = direction === 'LONG';

  // Math Calculations (SOSSKA1 Strategy Rules)
  // SL = 1.8 * ATR
  // TP1 = 2.5 * ATR
  // TP2 = 5.0 * ATR
  const slDist = 1.8 * atrValue;
  const tp1Dist = 2.5 * atrValue;
  const tp2Dist = 5.0 * atrValue;

  const stopLoss = isLong ? entryPrice - slDist : entryPrice + slDist;
  const tp1 = isLong ? entryPrice + tp1Dist : entryPrice - tp1Dist;
  const tp2 = isLong ? entryPrice + tp2Dist : entryPrice - tp2Dist;

  const slPct = ((Math.abs(entryPrice - stopLoss)) / entryPrice) * 100;
  const tp1Pct = ((Math.abs(tp1 - entryPrice)) / entryPrice) * 100;
  const tp2Pct = ((Math.abs(tp2 - entryPrice)) / entryPrice) * 100;

  const rr1 = Number((2.5 / 1.8).toFixed(2)); // ~1.39
  const rr2 = Number((5.0 / 1.8).toFixed(2)); // ~2.78
  const combinedRR = Number(((1.39 * 0.5) + (2.78 * 0.5)).toFixed(2)); // ~2.08

  // Risk & Position Sizing
  const dollarRisk = (accountBalance * riskPercent) / 100;
  const positionSizeUsdt = slPct > 0 ? (dollarRisk / (slPct / 100)) : 0;
  const positionCoins = entryPrice > 0 ? (positionSizeUsdt / entryPrice) : 0;

  // Partial Profit Taking Math (50% at TP1, 50% at TP2)
  const profitAtTp1 = (positionSizeUsdt * 0.5) * (tp1Pct / 100);
  const profitAtTp2 = (positionSizeUsdt * 0.5) * (tp2Pct / 100);
  const totalPotentialProfit = profitAtTp1 + profitAtTp2;

  // Auto Fibonacci Levels Calculations (Exact Pine Script Formulas)
  const fibRange = Math.max(swingHigh - swingLow, 0.00000001);
  const fib618 = isLong ? swingHigh - (fibRange * 0.618) : swingLow + (fibRange * 0.618);
  const fib500 = isLong ? swingHigh - (fibRange * 0.500) : swingLow + (fibRange * 0.500);
  const fib382 = isLong ? swingHigh - (fibRange * 0.382) : swingLow + (fibRange * 0.382);
  const fib786 = isLong ? swingHigh - (fibRange * 0.786) : swingLow + (fibRange * 0.786);
  const fib886 = isLong ? swingHigh - (fibRange * 0.886) : swingLow + (fibRange * 0.886);

  // Fibonacci Extension Targets
  const fibExt1272 = isLong ? swingHigh + (fibRange * 0.272) : swingLow - (fibRange * 0.272);
  const fibExt1618 = isLong ? swingHigh + (fibRange * 0.618) : swingLow - (fibRange * 0.618);

  const handlePickSignal = (sig: BreakoutSignal) => {
    setSymbolName(sig.cleanSymbol);
    setDirection(sig.direction);
    setEntryPrice(sig.entry);
    setAtrValue(sig.atr);
    if (sig.fibonacci) {
      setSwingHigh(sig.fibonacci.swingHigh);
      setSwingLow(sig.fibonacci.swingLow);
    }
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">نظام تحديد أهداف الصفقة ومستويات فيبوناتشي التلقائية</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                تحديد دقيق لأهداف الربح (TP1, TP2) ووقف الخسارة عبر محرك ATR ومستويات فيبوناتشي (Fib 0.618 / 0.500 / 0.382 / OTE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">
              معادلة الأهداف: <strong className="text-emerald-400 font-semibold">SL 1.8x · TP1 2.5x · TP2 5.0x ATR</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Select from Live Signals */}
      {signals.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-2 font-medium">
            اختيار سريع من الإشارات المؤكدة الحالية لتعبئة الأهداف ومستويات فيبوناتشي تلقائياً:
          </div>
          <div className="flex flex-wrap gap-2">
            {signals.map((sig) => (
              <button
                key={sig.symbol}
                onClick={() => handlePickSignal(sig)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors flex items-center gap-1.5 ${
                  symbolName === sig.cleanSymbol
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sig.direction === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span>{sig.cleanSymbol}</span>
                <span className="text-neutral-500 text-[10px]">({formatPrice(sig.entry)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Calculator Inputs & Target Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>مدخلات الصفقة وضلع فيبوناتشي</span>
              <span className="text-xs text-neutral-500 font-mono font-normal">SOSSKA1 & Fib</span>
            </h3>

            {/* Direction Toggle */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">نوع الصفقة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    isLong
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>شراء (LONG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    !isLong
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>بيع (SHORT)</span>
                </button>
              </div>
            </div>

            {/* Symbol & Entry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">الزوج</label>
                <input
                  type="text"
                  value={symbolName}
                  onChange={e => setSymbolName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-700 text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">سعر الدخول ($)</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={e => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-700 text-left"
                />
              </div>
            </div>

            {/* ATR Value */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-300">قيمة مؤشر ATR(14)</label>
                <span className="text-[11px] text-neutral-500 font-mono">
                  تقلب العملة لحساب الأهداف
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={atrValue}
                onChange={e => setAtrValue(Math.max(0.000001, parseFloat(e.target.value) || 0.000001))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-neutral-700 text-left"
              />
            </div>

            {/* Fibonacci Swing High & Low (ضلع الفيبوناتشي) */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>ضلع الفيبوناتشي (Swing High & Low)</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">طول 20 شمعة</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">قمة الضلع (Swing High)</label>
                  <input
                    type="number"
                    step="any"
                    value={swingHigh}
                    onChange={e => setSwingHigh(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-neutral-700 text-left"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">قاع الضلع (Swing Low)</label>
                  <input
                    type="number"
                    step="any"
                    value={swingLow}
                    onChange={e => setSwingLow(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-neutral-700 text-left"
                  />
                </div>
              </div>
              <div className="text-[11px] text-neutral-500 font-mono text-left">
                مدى الضلع (Range): <strong className="text-amber-400">{formatPrice(fibRange)}</strong>
              </div>
            </div>

            {/* Risk Sizing Inputs */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">رأس مال المحفظة ($)</label>
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={e => setAccountBalance(Math.max(10, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-700 text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">نسبة المخاطرة (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={riskPercent}
                    onChange={e => setRiskPercent(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-400 focus:outline-none focus:border-neutral-700 text-left"
                  />
                </div>
              </div>

              {/* Calculated Risk Amount */}
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">أقصى خسارة مسموح بها بالدولار:</span>
                <span className="font-mono font-bold text-rose-400 tabular-nums">
                  ${dollarRisk.toFixed(2)} ({riskPercent}% من الحساب)
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Position Sizing Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              حجم العقد المحسوب رياضياً (Position Sizing):
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[11px] text-neutral-400">حجم الصفقة الإجمالي</span>
                <div className="text-base font-bold font-mono text-white mt-0.5 tabular-nums">
                  ${positionSizeUsdt.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">بالدولار (USDT)</span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[11px] text-neutral-400">كمية العملات المطلوبة</span>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5 tabular-nums">
                  {positionCoins.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">عملة {symbolName.split('/')[0]}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              إذا ضرب السعر الوقف، ستخسر بالضبط <strong className="text-rose-400 font-mono">${dollarRisk.toFixed(2)}</strong> فقط، لحماية الحساب من أي نزيف مالي.
            </p>
          </div>
        </div>

        {/* Right Column: Visual Target Ladder & Levels Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Target Levels Visual Strip */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>أهداف الصفقة ووقف الخسارة المحددة</span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold ${
                  isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {direction}
                </span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                عائد/مخاطرة إجمالي: <strong className="text-emerald-400">1:{combinedRR}</strong>
              </span>
            </div>

            {/* Target 2 Card (Top) */}
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                    <span className="text-xs font-bold text-teal-300 font-mono">الهدف الثاني (Take Profit 2)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                      5.0x ATR
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                    {formatPrice(tp2)}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-sm font-bold text-teal-300 tabular-nums">
                    {tp2Pct > 0 ? `+${tp2Pct.toFixed(2)}%` : `${tp2Pct.toFixed(2)}%`}
                  </div>
                  <div className="text-xs text-neutral-400">
                    R:R 1:{rr2} · ربح: +${profitAtTp2.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-teal-200/80 mt-2 font-sans">
                إغلاق الـ 50% المتبقية من الصفقة وتأمين خروج كامل بربح مضاعف.
              </p>
            </div>

            {/* Target 1 Card (Middle) */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-emerald-300 font-mono">الهدف الأول (Take Profit 1)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      2.5x ATR
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                    {formatPrice(tp1)}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-sm font-bold text-emerald-300 tabular-nums">
                    {tp1Pct > 0 ? `+${tp1Pct.toFixed(2)}%` : `${tp1Pct.toFixed(2)}%`}
                  </div>
                  <div className="text-xs text-neutral-400">
                    R:R 1:{rr1} · ربح: +${profitAtTp1.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-2 font-sans">
                إغلاق 50% من الكمية وتثبيت أول ربح، ونقل الوقف إلى سعر الدخول فوراً (Breakeven).
              </p>
            </div>

            {/* Entry Price Strip */}
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-xs font-bold text-blue-300">سعر الدخول (Entry Level)</span>
              </div>
              <div className="text-base font-bold text-white tabular-nums">
                {formatPrice(entryPrice)}
              </div>
            </div>

            {/* Stop Loss Card (Bottom) */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    <span className="text-xs font-bold text-rose-300 font-mono">وقف الخسارة (Stop Loss)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      1.8x ATR
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                    {formatPrice(stopLoss)}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-sm font-bold text-rose-300 tabular-nums">
                    -{slPct.toFixed(2)}%
                  </div>
                  <div className="text-xs text-neutral-400">
                    أقصى خسارة: -${dollarRisk.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-rose-200/80 mt-2 font-sans">
                خروج فوري عند كسر هذا المستوى لحماية رأس المال من تقلبات السوق المفاجئة.
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* AUTO FIBONACCI TARGETS & BUY/SELL ZONES SECTION */}
          {/* ============================================================== */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>مستويات فيبوناتشي التلقائية ومناطق البيع والشراء للعملة</span>
              </h3>
              <span className="text-xs font-mono text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
                Fib 0.618 الذهبي: {formatPrice(fib618)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Buy Zones Guide */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-900/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>مناطق الشراء (Where to Buy):</span>
                </div>
                <div className="space-y-1.5 text-neutral-300 text-[11px]">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-white block">1. منطقة الارتداد الذهبية OTE:</strong>
                    <span className="font-mono text-emerald-400 font-bold">{formatPrice(fib886)} - {formatPrice(fib618)}</span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">شراء مع ارتداد السعر فوق متوسط EMA 50</p>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-white block">2. منطقة الشراء بالاختراق:</strong>
                    <span className="font-mono text-white">إغلاق شمعة أعلى <strong className="text-emerald-400">{formatPrice(fib382)}</strong></span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">مع مضاعف فوليوم &ge; 1.4x</p>
                  </div>
                </div>
              </div>

              {/* Sell & TP Zones Guide */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-blue-900/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-300 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>مناطق البيع وجني الأرباح (Where to Sell):</span>
                </div>
                <div className="space-y-1.5 text-neutral-300 text-[11px]">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-white block">الهدف 1 (قمة الضلع):</strong>
                      <span className="text-[10px] text-neutral-400">إغلاق 50% ونقل الوقف</span>
                    </div>
                    <span className="font-mono text-white font-bold">{formatPrice(isLong ? swingHigh : swingLow)}</span>
                  </div>

                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-white block">الهدف 2 (امتداد 1.272):</strong>
                      <span className="text-[10px] text-neutral-400">امتداد تصاعدي</span>
                    </div>
                    <span className="font-mono text-teal-300 font-bold">{formatPrice(fibExt1272)}</span>
                  </div>

                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-white block">الهدف 3 (الامتداد الذهبي 1.618):</strong>
                      <span className="text-[10px] text-neutral-400">خروج كامل بأقصى ربح</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">{formatPrice(fibExt1618)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Complete Fib Matrix Table */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500">
                    <th className="py-1 px-2">مستوى فيبوناتشي</th>
                    <th className="py-1 px-2">السعر المحسوب</th>
                    <th className="py-1 px-2">الوصف الفني</th>
                    <th className="py-1 px-2">كود Pine Script</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  <tr>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">Fib 1.618 (الامتداد الذهبي)</td>
                    <td className="py-1.5 px-2 text-white font-bold">{formatPrice(fibExt1618)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">هدف ربح أقصى ممتاز</td>
                    <td className="py-1.5 px-2 text-neutral-500">hi_fib + (fib_range * 0.618)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-teal-400">Fib 1.272 (امتداد أولي)</td>
                    <td className="py-1.5 px-2 text-white">{formatPrice(fibExt1272)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">هدف ربح تكميلي</td>
                    <td className="py-1.5 px-2 text-neutral-500">hi_fib + (fib_range * 0.272)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-neutral-300">Swing High (قمة الضلع 100%)</td>
                    <td className="py-1.5 px-2 text-white">{formatPrice(swingHigh)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">مقاومة القمة / هدف أول</td>
                    <td className="py-1.5 px-2 text-neutral-500">ta.highest(high, 20)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-neutral-400">Fib 0.382 (أول مقاومة)</td>
                    <td className="py-1.5 px-2 text-neutral-200">{formatPrice(fib382)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">اختراقه يؤكد الزخم</td>
                    <td className="py-1.5 px-2 text-neutral-500">hi_fib - (fib_range * 0.382)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-white font-bold">Fib 0.500 (نقطة التوازن)</td>
                    <td className="py-1.5 px-2 text-white font-bold">{formatPrice(fib500)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">منتصف مدى الحركة السعرية</td>
                    <td className="py-1.5 px-2 text-neutral-500">hi_fib - (fib_range * 0.500)</td>
                  </tr>
                  <tr className="bg-yellow-500/5">
                    <td className="py-1.5 px-2 text-yellow-300 font-bold">★ Fib 0.618 الذهبي</td>
                    <td className="py-1.5 px-2 text-yellow-300 font-bold">{formatPrice(fib618)}</td>
                    <td className="py-1.5 px-2 text-yellow-200 font-sans">النسبة الذهبية - أهم ارتداد</td>
                    <td className="py-1.5 px-2 text-yellow-400/80">hi_fib - (fib_range * 0.618)</td>
                  </tr>
                  <tr className="bg-rose-500/5">
                    <td className="py-1.5 px-2 text-rose-400">Fib 0.786 / 0.886 (منطقة القنص OTE)</td>
                    <td className="py-1.5 px-2 text-rose-300">{formatPrice(fib786)} - {formatPrice(fib886)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">أفضل منطقة شراء مؤسسية</td>
                    <td className="py-1.5 px-2 text-neutral-500">hi_fib - (fib_range * 0.786)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-neutral-300">Swing Low (قاع الضلع 0%)</td>
                    <td className="py-1.5 px-2 text-white">{formatPrice(swingLow)}</td>
                    <td className="py-1.5 px-2 text-neutral-400 font-sans">مستوى الوقف الأساسي</td>
                    <td className="py-1.5 px-2 text-neutral-500">ta.lowest(low, 20)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
