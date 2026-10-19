import React, { useState, useMemo } from 'react';
import { 
  X, TrendingUp, TrendingDown, Target, Shield, Copy, Check, 
  BarChart2, Layers, Info, Code2, Compass, Send,
  AlertTriangle, CheckCircle2, XCircle, AlertOctagon 
} from 'lucide-react';
import { BreakoutSignal, FibonacciLevels } from '../types/scanner';
import { calculateEma, calculateSma, calculateFibonacciLevels, formatPrice } from '../services/marketScanner';

interface SignalChartModalProps {
  signal: BreakoutSignal | null;
  onClose: () => void;
  onCopyTelegram: (signal: BreakoutSignal) => void;
  onSendTelegram?: (signal: BreakoutSignal) => void;
}

export const SignalChartModal: React.FC<SignalChartModalProps> = ({
  signal,
  onClose,
  onCopyTelegram,
  onSendTelegram
}) => {
  const [copied, setCopied] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [copiedPine, setCopiedPine] = useState(false);
  const [showFib, setShowFib] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showZones, setShowZones] = useState(true);

  if (!signal) return null;

  const handleSendTelegram = async () => {
    if (!onSendTelegram || !signal) return;
    setIsSendingTelegram(true);
    try {
      await onSendTelegram(signal);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const isLong = signal.direction === 'LONG';
  const candles = signal.candles.slice(-45); // Last 45 candles
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const ema5 = useMemo(() => calculateEma(closes, 5), [closes]);
  const ema15 = useMemo(() => calculateEma(closes, 15), [closes]);
  const ema50 = useMemo(() => calculateEma(closes, 50), [closes]);
  const volSma20 = useMemo(() => calculateSma(volumes, 20), [volumes]);

  // Calculate Fibonacci levels on last 20 bars swing (matching user script fib_len = 20)
  const fib: FibonacciLevels = useMemo(() => {
    return signal.fibonacci || calculateFibonacciLevels(signal.candles, 20, signal.direction);
  }, [signal]);

  // Chart coordinate calculations
  const chartHeight = 310;
  const volHeight = 65;
  const totalSvgHeight = 400;
  const svgWidth = 820;

  const pricesToBound = [
    ...candles.map(c => c.low),
    ...candles.map(c => c.high),
    signal.stopLoss,
    signal.tp1,
    signal.tp2,
    fib.swingLow,
    fib.swingHigh,
    fib.fib886,
    fib.fib786,
    fib.fib618,
    fib.fib382,
    fib.fibExt1272,
    fib.fibExt1618
  ].filter(p => !isNaN(p) && p > 0);

  const minPrice = Math.min(...pricesToBound) * 0.994;
  const maxPrice = Math.max(...pricesToBound) * 1.006;
  const priceRange = Math.max(maxPrice - minPrice, 0.0000001);
  const maxVolume = Math.max(...volumes) || 1;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * (chartHeight - 20) - 10;
  };

  const candleWidth = (svgWidth - 110) / candles.length;

  // Find index of swing high and swing low candles in the slice to draw the Fibonacci leg
  const swingSlice = candles.slice(-20);
  let swingHighIdx = candles.length - 1;
  let swingLowIdx = candles.length - 1;
  let maxH = -Infinity;
  let minL = Infinity;
  candles.forEach((c, idx) => {
    if (idx >= candles.length - 20) {
      if (c.high > maxH) {
        maxH = c.high;
        swingHighIdx = idx;
      }
      if (c.low < minL) {
        minL = c.low;
        swingLowIdx = idx;
      }
    }
  });

  const handleCopy = () => {
    onCopyTelegram(signal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pineScriptCode = `//@version=5
indicator("Auto Fibonacci & SOSSKA1 Trading Levels", overlay=true)

// ==========================================
// رسم فيبوناتشي التلقائي (Auto Fib Levels)
// ==========================================
fib_len = input.int(20, "طول فترة البحث عن القمة والقاع", group="مستويات فيبوناتشي")
show_fib = input.bool(true, "تفعيل رسم فيبوناتشي", group="مستويات فيبوناتشي")

hi_fib = ta.highest(high, fib_len)
lo_fib = ta.lowest(low, fib_len)
fib_range = hi_fib - lo_fib

// حساب أهم المستويات
fib_618 = hi_fib - (fib_range * 0.618)
fib_500 = hi_fib - (fib_range * 0.500)
fib_382 = hi_fib - (fib_range * 0.382)
fib_786 = hi_fib - (fib_range * 0.786)
fib_886 = hi_fib - (fib_range * 0.886)

plot(show_fib ? fib_618 : na, "Fib 0.618 الذهبي", color=color.new(color.yellow, 10), linewidth=2, style=plot.style_linebr)
plot(show_fib ? fib_500 : na, "Fib 0.500", color=color.new(color.white, 30), linewidth=1, style=plot.style_linebr)
plot(show_fib ? fib_382 : na, "Fib 0.382", color=color.new(color.gray, 50), linewidth=1, style=plot.style_linebr)
plot(show_fib ? fib_786 : na, "Fib 0.786 (منطقة القنص)", color=color.new(color.orange, 30), linewidth=1, style=plot.style_linebr)

// أهداف الامتداد
plot(show_fib ? hi_fib + (fib_range * 0.272) : na, "Fib 1.272 Extension", color=color.new(color.teal, 30), linewidth=1, style=plot.style_linebr)
plot(show_fib ? hi_fib + (fib_range * 0.618) : na, "Fib 1.618 Golden Extension", color=color.new(color.green, 20), linewidth=2, style=plot.style_linebr)
`;

  const handleCopyPine = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopiedPine(true);
    setTimeout(() => setCopiedPine(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl text-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${isLong ? 'bg-emerald-400' : 'bg-rose-400'} ring-4 ${isLong ? 'ring-emerald-500/20' : 'ring-rose-500/20'}`}></span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">{signal.cleanSymbol}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded font-bold font-mono ${
                  isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {signal.direction} · {signal.timeframe}
                </span>
                <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  {fib.currentZoneLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                رسم أضلاع فيبوناتشي التلقائية ومستويات الدعم والمقاومة مع مناطق البيع والشراء المؤكدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700"
              title="نسخ كود Pine Script لـ TradingView"
            >
              {copiedPine ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedPine ? 'تم نسخ Pine Script!' : 'كود TradingView'}</span>
            </button>
            {onSendTelegram && (
              <button
                onClick={handleSendTelegram}
                disabled={isSendingTelegram || signal.isConfirmed === false}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
                  signal.isConfirmed === false
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/60'
                    : 'bg-sky-500 hover:bg-sky-400 text-neutral-950 disabled:opacity-50'
                }`}
                title={signal.isConfirmed === false ? 'الصفقة غير مؤكدة - لا يمكن إرسالها للبوت' : 'إرسال التوصية ومستويات الفيبوناتشي مباشرة إلى بوت تيليجرام'}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {signal.isConfirmed === false
                    ? 'غير مؤكدة (محظورة)'
                    : isSendingTelegram
                    ? 'جاري الإرسال...'
                    : 'إرسال للبوت 🚀'}
                </span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ تنبيه تيليجرام'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">

          {/* CRITICAL SAFETY WARNING FOR UNCONFIRMED PAIRS */}
          {signal.isConfirmed === false && (
            <div className="bg-rose-950/40 border-2 border-rose-500/70 rounded-2xl p-4 sm:p-5 text-xs space-y-3 shadow-lg animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-rose-500 text-neutral-950">
                      تنبيه أمان صارم
                    </span>
                    <h4 className="text-sm font-bold text-rose-300">
                      هذا الزوج في حالة "مراقبة غير مؤكدة" - يُمنع الدخول الفعلي في الصفقة!
                    </h4>
                  </div>
                  <p className="text-rose-200/90 leading-relaxed text-xs">
                    سبب خسارتك في الصفقات غير المؤكدة هو دخول السوق قبل اكتمال شروط الاستراتيجية الرياضية (التضافر Confluence). عند غياب الفوليوم المؤسسي أو تقاطع المتوسطات، يكون السعر في مرحلة تذبذب عرضي أو مصيدة سيولة (Fakeout) تؤدي حتماً لضرب وقف الخسارة.
                  </p>
                </div>
              </div>

              {/* Status Breakdown of Technical Conditions */}
              {signal.checks && (
                <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800">
                  <div className="text-[11px] font-bold text-neutral-300 mb-2.5 flex items-center justify-between">
                    <span>تشخيص حالة الشروط الفنية لهذا الزوج:</span>
                    <span className="text-[10px] text-neutral-500 font-normal">يجب تحقق جميع الـ 5 شروط مجتمعة</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                      signal.checks.macroRegimeOk ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}>
                      {signal.checks.macroRegimeOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span>توافق اتجاه البيتكوين (BTC Macro)</span>
                    </div>

                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                      signal.checks.emaCross ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}>
                      {signal.checks.emaCross ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span>تقاطع المتوسطات السريعة (EMA 5/15)</span>
                    </div>

                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                      signal.checks.trendBaselineOk ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}>
                      {signal.checks.trendBaselineOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span>خط الاتجاه الأساسي (EMA 50)</span>
                    </div>

                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                      signal.checks.volumeExplosion ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}>
                      {signal.checks.volumeExplosion ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span>انفجار الفوليوم المؤسسي (&gt; 1.20x)</span>
                    </div>

                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                      signal.checks.rsiHealthy ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}>
                      {signal.checks.rsiHealthy ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span>نطاق زخم RSI المعتدل</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Specific Reasons why it failed */}
              {signal.unconfirmedReasons && signal.unconfirmedReasons.length > 0 && (
                <div className="bg-rose-950/20 rounded-lg p-2.5 border border-rose-900/40 text-[11px] text-rose-300/90 space-y-1">
                  <span className="font-bold">أسباب عدم التأكيد في الشمعة الحالية:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-200/80 mr-2">
                    {signal.unconfirmedReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Target Levels Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl">
              <span className="text-xs text-neutral-400">سعر الدخول (Entry)</span>
              <div className="text-base font-bold font-mono tabular-nums text-white mt-0.5">
                {formatPrice(signal.entry)}
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">عند إغلاق الشمعة الحالية</span>
            </div>

            <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl">
              <span className="text-xs text-rose-400">وقف الخسارة (SL · 1.8 ATR)</span>
              <div className="text-base font-bold font-mono tabular-nums text-rose-300 mt-0.5">
                {formatPrice(signal.stopLoss)}
              </div>
              <span className="text-[11px] font-mono text-rose-400/80">
                {signal.slPct > 0 ? `+${signal.slPct.toFixed(2)}%` : `${signal.slPct.toFixed(2)}%`}
              </span>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl">
              <span className="text-xs text-emerald-400">الهدف 1 (TP1 · 2.5 ATR)</span>
              <div className="text-base font-bold font-mono tabular-nums text-emerald-300 mt-0.5">
                {formatPrice(signal.tp1)}
              </div>
              <span className="text-[11px] font-mono text-emerald-400/80">
                {signal.tp1Pct > 0 ? `+${signal.tp1Pct.toFixed(2)}%` : `${signal.tp1Pct.toFixed(2)}%`} · R:R 1:{signal.riskReward1}
              </span>
            </div>

            <div className="bg-teal-950/20 border border-teal-900/40 p-3 rounded-xl">
              <span className="text-xs text-teal-400">الهدف 2 (TP2 · 5.0 ATR)</span>
              <div className="text-base font-bold font-mono tabular-nums text-teal-300 mt-0.5">
                {formatPrice(signal.tp2)}
              </div>
              <span className="text-[11px] font-mono text-teal-400/80">
                {signal.tp2Pct > 0 ? `+${signal.tp2Pct.toFixed(2)}%` : `${signal.tp2Pct.toFixed(2)}%`} · R:R 1:{signal.riskReward2}
              </span>
            </div>
          </div>

          {/* Chart Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 px-4 py-2.5 rounded-xl border border-neutral-800 text-xs">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-neutral-400 font-medium">الطبقات المعروضة:</span>
              <button
                onClick={() => setShowFib(!showFib)}
                className={`px-2.5 py-1 rounded-md font-mono transition-colors border ${
                  showFib
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                📐 فيبوناتشي التلقائي {showFib ? '✓' : '✗'}
              </button>
              <button
                onClick={() => setShowZones(!showZones)}
                className={`px-2.5 py-1 rounded-md font-mono transition-colors border ${
                  showZones
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                🎯 مناطق البيع والشراء {showZones ? '✓' : '✗'}
              </button>
              <button
                onClick={() => setShowEma(!showEma)}
                className={`px-2.5 py-1 rounded-md font-mono transition-colors border ${
                  showEma
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                〰️ متوسطات EMA {showEma ? '✓' : '✗'}
              </button>
            </div>

            <div className="flex items-center gap-4 text-neutral-400 font-mono text-xs">
              <span>قمة الضلع (High): <strong className="text-white">{formatPrice(fib.swingHigh)}</strong></span>
              <span>قاع الضلع (Low): <strong className="text-white">{formatPrice(fib.swingLow)}</strong></span>
              <span>مدى الضلع (Range): <strong className="text-amber-400">{formatPrice(fib.fibRange)}</strong></span>
            </div>
          </div>

          {/* Interactive SVG Chart Viewport with Fibonacci, Swing Leg, and Buy/Sell Zones */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 relative overflow-x-auto">
            
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                {showFib && (
                  <>
                    <span className="flex items-center gap-1.5 text-yellow-300 font-mono font-bold">
                      <span className="w-3 h-1 bg-yellow-400 inline-block rounded-sm"></span> Fib 0.618 الذهبي
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-200 font-mono">
                      <span className="w-3 h-0.5 bg-neutral-200 inline-block"></span> Fib 0.500 التوازن
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400 font-mono">
                      <span className="w-3 h-0.5 bg-neutral-400 inline-block"></span> Fib 0.382
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-mono">
                      <span className="w-3 h-0.5 bg-rose-500 inline-block"></span> Fib 0.786 / 0.886 OTE
                    </span>
                  </>
                )}
                {showEma && (
                  <span className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                    <span className="text-amber-400">EMA5</span> · 
                    <span className="text-orange-400">EMA15</span> · 
                    <span className="text-blue-400">EMA50</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span>RSI: <strong className="text-amber-400">{signal.rsi.toFixed(1)}</strong></span>
                <span>فوليوم: <strong className="text-white">{signal.volRatio.toFixed(2)}x SMA20</strong></span>
              </div>
            </div>

            <svg viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`} className="w-full h-auto select-none">
              
              {/* Horizontal Price Grid */}
              {[0.15, 0.35, 0.55, 0.75, 0.90].map((ratio, idx) => {
                const y = chartHeight * ratio;
                const p = maxPrice - (ratio * priceRange);
                return (
                  <g key={idx}>
                    <line x1="0" y1={y} x2={svgWidth - 110} y2={y} stroke="#1b1f2b" strokeDasharray="3 3" />
                    <text x={svgWidth - 105} y={y + 3} fill="#4b5563" fontSize="9.5" fontFamily="monospace">
                      {formatPrice(p)}
                    </text>
                  </g>
                );
              })}

              {/* ============================================================== */}
              {/* AUTO FIBONACCI RETRACEMENT & SWING LEG DRAWINGS */}
              {/* ============================================================== */}
              {showFib && (
                <g id="fibonacci-levels">
                  
                  {/* Visual Shaded Buy & Sell Zones */}
                  {showZones && (
                    <>
                      {/* BUY ZONE (منطقة الشراء) */}
                      {(() => {
                        const y1 = getY(fib.buyZone.min);
                        const y2 = getY(fib.buyZone.max);
                        const boxTop = Math.min(y1, y2);
                        const boxH = Math.max(Math.abs(y1 - y2), 14);

                        return (
                          <g>
                            <rect
                              x={0}
                              y={boxTop}
                              width={svgWidth - 110}
                              height={boxH}
                              fill="#10b981"
                              fillOpacity={0.16}
                              stroke="#059669"
                              strokeWidth={1}
                              strokeDasharray="4 2"
                            />
                            <text
                              x={15}
                              y={boxTop + 14}
                              fill="#34d399"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              🟢 منطقة الشراء المؤكدة (Buy Zone) · {formatPrice(fib.buyZone.min)} - {formatPrice(fib.buyZone.max)}
                            </text>
                          </g>
                        );
                      })()}

                      {/* SELL / TAKE PROFIT ZONE (منطقة البيع وجني الأرباح) */}
                      {(() => {
                        const y1 = getY(fib.sellZone.min);
                        const y2 = getY(fib.sellZone.max);
                        const boxTop = Math.min(y1, y2);
                        const boxH = Math.max(Math.abs(y1 - y2), 14);

                        return (
                          <g>
                            <rect
                              x={0}
                              y={boxTop}
                              width={svgWidth - 110}
                              height={boxH}
                              fill="#3b82f6"
                              fillOpacity={0.10}
                              stroke="#2563eb"
                              strokeWidth={1}
                              strokeDasharray="4 2"
                            />
                            <text
                              x={15}
                              y={boxTop + 14}
                              fill="#60a5fa"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              🎯 منطقة البيع وجني الأرباح (Sell & TP Zone) · {formatPrice(fib.sellZone.tp1)} إلى {formatPrice(fib.sellZone.tp3)}
                            </text>
                          </g>
                        );
                      })()}
                    </>
                  )}

                  {/* ضلع الفيبوناتشي (Diagonal Swing Leg line between High and Low) */}
                  {(() => {
                    const xLow = swingLowIdx * candleWidth + candleWidth / 2;
                    const yLow = getY(fib.swingLow);
                    const xHigh = swingHighIdx * candleWidth + candleWidth / 2;
                    const yHigh = getY(fib.swingHigh);

                    return (
                      <g id="swing-leg">
                        <line
                          x1={xLow}
                          y1={yLow}
                          x2={xHigh}
                          y2={yHigh}
                          stroke="#a855f7"
                          strokeWidth="2"
                          strokeDasharray="5 3"
                          opacity="0.85"
                        />
                        <circle cx={xLow} cy={yLow} r="4" fill="#a855f7" />
                        <circle cx={xHigh} cy={yHigh} r="4" fill="#a855f7" />
                        <text
                          x={Math.min(xLow, xHigh) + Math.abs(xHigh - xLow) / 2 - 40}
                          y={Math.min(yLow, yHigh) + Math.abs(yHigh - yLow) / 2 - 8}
                          fill="#c084fc"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          ضلع الفيبوناتشي (20 شمعة)
                        </text>
                      </g>
                    );
                  })()}

                  {/* Fib 1.618 Golden Extension Target (الامتداد الذهبي) */}
                  <line x1="0" y1={getY(fib.fibExt1618)} x2={svgWidth - 110} y2={getY(fib.fibExt1618)} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
                  <text x={svgWidth - 105} y={getY(fib.fibExt1618) + 3} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    1.618 Ext ({formatPrice(fib.fibExt1618)})
                  </text>

                  {/* Fib 1.272 Extension Target */}
                  <line x1="0" y1={getY(fib.fibExt1272)} x2={svgWidth - 110} y2={getY(fib.fibExt1272)} stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.75" />
                  <text x={svgWidth - 105} y={getY(fib.fibExt1272) + 3} fill="#2dd4bf" fontSize="9" fontFamily="monospace">
                    1.272 Ext ({formatPrice(fib.fibExt1272)})
                  </text>

                  {/* Fib 0.0% / Swing High */}
                  <line x1="0" y1={getY(fib.swingHigh)} x2={svgWidth - 110} y2={getY(fib.swingHigh)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={svgWidth - 105} y={getY(fib.swingHigh) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace">
                    High ({formatPrice(fib.swingHigh)})
                  </text>

                  {/* Fib 0.382 (color.gray) */}
                  <line x1="0" y1={getY(fib.fib382)} x2={svgWidth - 110} y2={getY(fib.fib382)} stroke="#9ca3af" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.7" />
                  <text x={svgWidth - 105} y={getY(fib.fib382) + 3} fill="#9ca3af" fontSize="9.5" fontFamily="monospace">
                    Fib 0.382 ({formatPrice(fib.fib382)})
                  </text>

                  {/* Fib 0.500 (color.white) */}
                  <line x1="0" y1={getY(fib.fib500)} x2={svgWidth - 110} y2={getY(fib.fib500)} stroke="#f3f4f6" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.85" />
                  <text x={svgWidth - 105} y={getY(fib.fib500) + 3} fill="#f3f4f6" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    Fib 0.500 ({formatPrice(fib.fib500)})
                  </text>

                  {/* Fib 0.618 الذهبي (color.yellow) - PROMINENT GLOWING LINE */}
                  <line x1="0" y1={getY(fib.fib618)} x2={svgWidth - 110} y2={getY(fib.fib618)} stroke="#eab308" strokeWidth="2.5" strokeDasharray="4 2" />
                  <text x={svgWidth - 105} y={getY(fib.fib618) + 3} fill="#facc15" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    ★ Fib 0.618 الذهبي ({formatPrice(fib.fib618)})
                  </text>

                  {/* Fib 0.786 & 88.6% OTE Zone Lines */}
                  <line x1="0" y1={getY(fib.fib786)} x2={svgWidth - 110} y2={getY(fib.fib786)} stroke="#f97316" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x={svgWidth - 105} y={getY(fib.fib786) + 3} fill="#fb923c" fontSize="9" fontFamily="monospace">
                    Fib 0.786 OTE ({formatPrice(fib.fib786)})
                  </text>

                  <line x1="0" y1={getY(fib.fib886)} x2={svgWidth - 110} y2={getY(fib.fib886)} stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x={svgWidth - 105} y={getY(fib.fib886) + 3} fill="#fb7185" fontSize="9" fontFamily="monospace">
                    Fib 0.886 OTE ({formatPrice(fib.fib886)})
                  </text>

                  {/* Fib 1.0 / Swing Low */}
                  <line x1="0" y1={getY(fib.swingLow)} x2={svgWidth - 110} y2={getY(fib.swingLow)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={svgWidth - 105} y={getY(fib.swingLow) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace">
                    Low ({formatPrice(fib.swingLow)})
                  </text>
                </g>
              )}

              {/* Dynamic Target Level Lines (SL, TP1, TP2, Entry) */}
              <line x1="0" y1={getY(signal.entry)} x2={svgWidth - 110} y2={getY(signal.entry)} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="0" y1={getY(signal.stopLoss)} x2={svgWidth - 110} y2={getY(signal.stopLoss)} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="0" y1={getY(signal.tp1)} x2={svgWidth - 110} y2={getY(signal.tp1)} stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="0" y1={getY(signal.tp2)} x2={svgWidth - 110} y2={getY(signal.tp2)} stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="4 2" />

              {/* EMA Lines */}
              {showEma && (
                <>
                  <path
                    d={ema50.map((p: number, i: number) => `${i === 0 ? 'M' : 'L'} ${i * candleWidth + candleWidth / 2} ${getY(p)}`).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                  <path
                    d={ema15.map((p: number, i: number) => `${i === 0 ? 'M' : 'L'} ${i * candleWidth + candleWidth / 2} ${getY(p)}`).join(' ')}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.3"
                    opacity="0.85"
                  />
                  <path
                    d={ema5.map((p: number, i: number) => `${i === 0 ? 'M' : 'L'} ${i * candleWidth + candleWidth / 2} ${getY(p)}`).join(' ')}
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="1.6"
                  />
                </>
              )}

              {/* Candlesticks */}
              {candles.map((candle, idx) => {
                const x = idx * candleWidth + candleWidth * 0.15;
                const width = Math.max(candleWidth * 0.7, 2);
                const isGreen = candle.close >= candle.open;
                const openY = getY(candle.open);
                const closeY = getY(candle.close);
                const highY = getY(candle.high);
                const lowY = getY(candle.low);
                const bodyY = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);
                const color = isGreen ? '#10b981' : '#f43f5e';
                const isSignalCandle = idx === candles.length - 1;

                return (
                  <g key={idx}>
                    <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={color} strokeWidth={1} />
                    <rect
                      x={x}
                      y={bodyY}
                      width={width}
                      height={bodyHeight}
                      fill={color}
                      stroke={isSignalCandle ? '#ffffff' : color}
                      strokeWidth={isSignalCandle ? 1.5 : 0}
                      rx={0.5}
                    />
                    {isSignalCandle && (
                      <circle cx={x + width / 2} cy={highY - 6} r={2.5} fill="#fbbf24" />
                    )}
                  </g>
                );
              })}

              {/* Divider between Price and Volume */}
              <line x1="0" y1={chartHeight} x2={svgWidth} y2={chartHeight} stroke="#262626" />

              {/* Volume Bars */}
              {candles.map((candle, idx) => {
                const x = idx * candleWidth + candleWidth * 0.15;
                const width = Math.max(candleWidth * 0.7, 2);
                const barHeight = (candle.volume / maxVolume) * (volHeight - 15);
                const y = totalSvgHeight - barHeight;
                const isGreen = candle.close >= candle.open;
                const isSignalCandle = idx === candles.length - 1;

                return (
                  <rect
                    key={`v-${idx}`}
                    x={x}
                    y={y}
                    width={width}
                    height={barHeight}
                    fill={isSignalCandle ? '#f59e0b' : isGreen ? '#059669' : '#e11d48'}
                    opacity={isSignalCandle ? 0.95 : 0.5}
                    rx={0.5}
                  />
                );
              })}

              {/* Volume SMA 20 curve */}
              <path
                d={volSma20.map((v: number, i: number) => {
                  const barHeight = (v / maxVolume) * (volHeight - 15);
                  const y = totalSvgHeight - barHeight;
                  return `${i === 0 ? 'M' : 'L'} ${i * candleWidth + candleWidth / 2} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <text x={10} y={chartHeight + 15} fill="#a3a3a3" fontSize="10" fontFamily="monospace">
                فوليوم العقود (Volume) مع خط SMA(20) المنقط
              </text>
            </svg>
          </div>

          {/* ============================================================== */}
          {/* DETAILED BUY & SELL ZONES + FIBONACCI LEG ANALYSIS */}
          {/* ============================================================== */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>تحليل ضلع الفيبوناتشي وتحديد مناطق البيع والشراء المؤكدة</span>
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
                الحالة الحالية: <strong className="text-amber-400">{fib.currentZoneLabel}</strong>
              </span>
            </div>

            {/* 3 Major Analytical Columns: Buy Zone / Sell Zone / Fib Leg */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              
              {/* 1. Buy Zones Card (مناطق الشراء) */}
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-bold text-emerald-300 text-sm">🟢 أين تشتري؟ (مناطق الشراء)</span>
                </div>
                
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                  <div className="text-[11px] text-emerald-400 font-semibold">1. منطقة الارتداد الذهبية (OTE Retracement):</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {formatPrice(fib.fib886)} - {formatPrice(fib.fib618)}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                    بين Fib 0.618 و Fib 0.886؛ أفضل منطقة لدخول المستثمرين مع حماية الوقف أسفل القاع.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <div className="text-[11px] text-neutral-300 font-semibold">2. منطقة الشراء بالاختراق (Breakout Buy):</div>
                  <div className="text-xs font-bold font-mono text-emerald-300 mt-0.5">
                    إغلاق شمعة كاملة أعلى {formatPrice(fib.fib382)}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                    اختراق مستوى 38.2% للأعلى مع انفجار فوليوم &ge; 1.4x SMA20 لتأكيد استمرار الزخم.
                  </p>
                </div>
              </div>

              {/* 2. Sell & Profit Taking Zones Card (مناطق البيع وجني الأرباح) */}
              <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <span className="font-bold text-blue-300 text-sm">🔴 أين تبيع؟ (مناطق جني الأرباح)</span>
                </div>
                
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400">الهدف الأول (TP1 - قمة الضلع):</span>
                    <div className="text-xs font-bold font-mono text-white">{formatPrice(fib.sellZone.tp1)}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">Swing High</span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400">الهدف الثاني (TP2 - امتداد 127.2%):</span>
                    <div className="text-xs font-bold font-mono text-teal-300">{formatPrice(fib.sellZone.tp2)}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">Ext 1.272</span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400">الهدف الثالث (TP3 - الامتداد الذهبي):</span>
                    <div className="text-xs font-bold font-mono text-emerald-400">{formatPrice(fib.sellZone.tp3)}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Golden Ext 1.618</span>
                </div>

                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  اغلق 50% عند TP1 وانقل الوقف لنقطة الدخول (Breakeven)، ثم اترك الباقي للامتداد الذهبي 1.618.
                </p>
              </div>

              {/* 3. Fibonacci Leg & Confluence Summary (ضلع الفيبوناتشي والتحليل الفني) */}
              <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="font-bold text-amber-300 text-sm">📐 تحليل ضلع الفيبوناتشي (Swing)</span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">طول فترة البحث:</span>
                    <span className="text-white font-bold">20 شمعة (15m)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">قمة الضلع (High):</span>
                    <span className="text-white">{formatPrice(fib.swingHigh)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">قاع الضلع (Low):</span>
                    <span className="text-white">{formatPrice(fib.swingLow)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">مدى الضلع (Range):</span>
                    <span className="text-amber-400 font-bold">{formatPrice(fib.fibRange)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-neutral-400">النسبة الذهبية (0.618):</span>
                    <span className="text-yellow-400 font-bold">{formatPrice(fib.fib618)}</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                  {fib.confluenceSummary}
                </div>
              </div>

            </div>

            {/* Strategic Action Recommendation */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-neutral-200">
                  <strong>نصيحة وخطة الدخول:</strong> {fib.recommendation}
                </span>
              </div>
              <span className="font-mono text-neutral-400 text-left">
                تزامن الفيبو مع ATR: <strong className="text-emerald-400">TP1 ATR {signal.tp1.toFixed(4)} ≃ Fib {formatPrice(fib.sellZone.tp1)}</strong>
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/70 flex items-center justify-between text-xs text-neutral-400">
          <span>التوقيت: {signal.timestamp} UTC</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors border border-neutral-700"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
