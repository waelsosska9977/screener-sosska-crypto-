import React, { useState } from 'react';
import { 
  Play, RefreshCw, TrendingUp, TrendingDown, CheckCircle2, 
  XCircle, Clock, Eye, Copy, Check, Filter, Search, Zap, 
  Compass, Send, Bot, AlertCircle, Settings2, Sliders, Volume2,
  ShieldAlert, AlertTriangle
} from 'lucide-react';
import { MacroBtcStatus, PairScanResult, BreakoutSignal, SensitivityMode } from '../types/scanner';
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
  onSendTelegram?: (signal: BreakoutSignal) => void;
  lastScanTime: string | null;
  sensitivityMode: SensitivityMode;
  onChangeSensitivity: (mode: SensitivityMode) => void;
  autoBotActive: boolean;
  onToggleAutoBot: () => void;
  scanIntervalSec: number;
  onChangeScanInterval: (sec: number) => void;
  onOpenTelegramTab?: () => void;
}

export const LiveScannerView: React.FC<LiveScannerViewProps> = ({
  macro,
  results,
  signals,
  isScanning,
  onRunScan,
  onSelectSignal,
  onCopyTelegram,
  onSendTelegram,
  lastScanTime,
  sensitivityMode,
  onChangeSensitivity,
  autoBotActive,
  onToggleAutoBot,
  scanIntervalSec,
  onChangeScanInterval,
  onOpenTelegramTab
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'passed' | 'golden'>('all');
  const [showRiskEducation, setShowRiskEducation] = useState(false);

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

  const handleSendTelegram = async (sig: BreakoutSignal) => {
    if (!onSendTelegram) return;
    setSendingId(sig.symbol);
    try {
      await onSendTelegram(sig);
    } finally {
      setTimeout(() => setSendingId(null), 1000);
    }
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* 1. Macro Market Regime Status Banner */}
      <MacroRegimeBanner macro={macro} isLoading={isScanning} onRefresh={onRunScan} />

      {/* 2. Bot Runner & Sensitivity Control Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Sensitivity Modes */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium ml-1">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>حساسية اقتناص الإشارات:</span>
          </div>

          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => onChangeSensitivity('AGGRESSIVE')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1 ${
                sensitivityMode === 'AGGRESSIVE'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="يقتنص الصفقات الحية السريعة والارتدادات الذهبية بدون تفويت أي حركة"
            >
              <Zap className="w-3 h-3" />
              <span>اقتناص نشط (Active)</span>
            </button>

            <button
              onClick={() => onChangeSensitivity('BALANCED')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                sensitivityMode === 'BALANCED'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="توازن ممتاز بين عدد الإشارات ودقة الشروط (موصى به)"
            >
              متوازن (Balanced)
            </button>

            <button
              onClick={() => onChangeSensitivity('CONSERVATIVE')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                sensitivityMode === 'CONSERVATIVE'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="شروط صارمة جداً (فوليوم 1.4x، تقاطع فوري، شمعة واحدة فقط)"
            >
              متحفظ صارم
            </button>
          </div>
        </div>

        {/* Live Auto-Bot Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoBot}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm ${
                autoBotActive 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30' 
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              <Bot className={`w-3.5 h-3.5 ${autoBotActive ? 'text-emerald-400 animate-pulse' : 'text-neutral-400'}`} />
              <span>{autoBotActive ? 'بوت المراقبة الحية: نشط 🟢' : 'تشغيل بوت المراقبة الآلي'}</span>
            </button>

            {autoBotActive && (
              <select
                value={scanIntervalSec}
                onChange={e => onChangeScanInterval(Number(e.target.value))}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-200 focus:outline-none"
              >
                <option value={30}>كل 30 ثانية</option>
                <option value={60}>كل 1 دقيقة</option>
                <option value={180}>كل 3 دقائق</option>
                <option value={300}>كل 5 دقائق</option>
              </select>
            )}
          </div>

          {onOpenTelegramTab && (
            <button
              onClick={onOpenTelegramTab}
              className="px-2.5 py-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>إعدادات وتوصيل تيليجرام</span>
            </button>
          )}
        </div>

      </div>

      {/* 3. Strategy KPI Summary Grid */}
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
          <span className="text-xs font-medium text-neutral-400">الاتجاه المفضل للاقتناص</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-bold font-mono px-2 py-0.5 rounded ${
              isBullish ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {targetDir}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {isBullish ? 'أفضلية شراء مع الاتجاه الصاعد' : 'أفضلية بيع مع الاتجاه الهابط'}
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs font-medium text-neutral-400">الأزواج المفحوصة (15m)</span>
          <div className="text-lg font-bold text-white font-mono mt-1 tabular-nums">
            {results.length} أزواج نشطة
          </div>
          <span className="text-[11px] text-neutral-500">Binance Vision Live Feed</span>
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

      {/* 4. Troubleshooting Callout when 0 Signals Detected */}
      {signals.length === 0 && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-neutral-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              لا توجد صفقات مطابقة في هذه اللحظة بالشروط المحددة. للاقتناص الأسرع، يمكنك تفعيل <strong>الوضع النشط (Active Mode)</strong> أو فحص وصول التنبيهات في تيليجرام.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sensitivityMode !== 'AGGRESSIVE' && (
              <button
                onClick={() => onChangeSensitivity('AGGRESSIVE')}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors font-semibold"
              >
                تفعيل الوضع النشط ⚡
              </button>
            )}
            {onOpenTelegramTab && (
              <button
                onClick={onOpenTelegramTab}
                className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-colors"
              >
                فحص اتصال البوت
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Confirmed Signals Showcase (Visual Cards) */}
      {signals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-base font-bold text-white">
                الإشارات المؤكدة المقتنصة الآن ({signals.length})
              </h3>
            </div>
            <span className="text-xs text-neutral-400">جاهزة للإرسال التلقائي أو الفوري إلى Telegram</span>
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
                      {onSendTelegram && (
                        <button
                          onClick={() => handleSendTelegram(sig)}
                          disabled={sendingId === sig.symbol}
                          title="إرسال فوري إلى Telegram Bot"
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingId === sig.symbol ? '...' : 'إرسال للبوت'}</span>
                        </button>
                      )}

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
                        <span>الشارت والفيبو</span>
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

      {/* 5.5 Risk Management & Unconfirmed Trades Educational Guide */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRiskEducation(!showRiskEducation)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-right bg-gradient-to-r from-rose-950/20 via-neutral-900 to-amber-950/20 hover:bg-neutral-850 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg shrink-0 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>لماذا تخسر إذا دخلت صفقات "غير مؤكدة"؟ (دليل الحماية وإدارة المخاطر)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  هام جداً للمتداولين
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                اضغط هنا للتعرف على القواعد الرياضية والكمية التي تحميك من ضرب وقف الخسارة وفخاخ السيولة
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-neutral-800 px-2.5 py-1 rounded-lg">
            {showRiskEducation ? 'إغلاق الشرح ▲' : 'عرض التشريح الكمي ▼'}
          </span>
        </button>

        {showRiskEducation && (
          <div className="p-5 border-t border-neutral-800 bg-neutral-950/60 text-xs space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>1. فخاخ السيولة (Fakeouts)</span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  عندما يتحرك السعر دون انفجار فوليوم (&gt; 1.20x)، يكون التحرك وهمياً لاختطاف سيولة صغار المتداولين، وسرعان ما ينعكس السعر لضرب الوقف.
                </p>
              </div>

              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>2. التذبذب العرضي الميت</span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  الدخول قبل تأكيد تقاطع EMA 5/15 يعني أن العملة لا تزال تتذبذب في نطاق ضيق بدون اتجاه واضح، مما يسبب خروجك بالخسارة دون تحقيق أهداف.
                </p>
              </div>

              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>3. معاكسة اتجاه البيتكوين</span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  لو كان البيتكوين في مسار هابط أو تذبذب تحت EMA 100، فإن أي محاولة شراء لعملة بديلة محكوم عليها بالفشل لأن البيتكوين يسحب السوق معه.
                </p>
              </div>

              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>4. استنزاف العمولات والانزلاق</span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  الدخول المتكرر في صفقات عشوائية يقتطع رسوم تداول (0.06% للعقود الآجلة) مع الانزلاق السعري في كل ضربة وقف، مما يؤدي لتآكل المحفظة بسرعة.
                </p>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>القاعدة الذهبية:</strong> لا تدخل إلا الصفقات التي يظهر أمامها <strong>"فرصة مؤكدة ⚡"</strong> وتتوافر فيها الشروط الخمسة كاملة، أو فعّل <strong>وضع الاقتناص النشط (Active)</strong> لتسريع التقاط الفرص الحية بأمان.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Complete Pairs Matrix / Scanner Table */}
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
                <th className="py-3 px-4 font-medium">الفوليوم</th>
                <th className="py-3 px-4 font-medium">RSI (14)</th>
                <th className="py-3 px-4 font-medium text-center">القرار</th>
                <th className="py-3 px-4 font-medium text-left">شارت وتيليجرام</th>
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-neutral-950 font-sans shadow-sm">
                            <Zap className="w-3 h-3 fill-neutral-950" />
                            <span>فرصة مؤكدة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700/60 font-sans" title="شروط الاستراتيجية غير مكتملة - غير صالحة للتنفيذ">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            <span>غير مؤكدة (مراقبة)</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center gap-2">
                          {r.signal && onSendTelegram && (
                            <button
                              onClick={() => handleSendTelegram(r.signal!)}
                              className="text-xs text-sky-400 hover:text-sky-300 font-medium font-sans flex items-center gap-1"
                              title="إرسال إشارة تيليجرام"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال</span>
                            </button>
                          )}

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
                                const reasons: string[] = [];
                                if (!r.checks.macroRegimeOk) reasons.push('اتجاه البيتكوين العام الماكرو غير متوافق مع الاتجاه المستهدف.');
                                if (!r.checks.emaCross) reasons.push('لم يحدث تقاطع مؤكد بين متوسط 5 ومتوسط 15 (تذبذب سعري غير اتجاهي).');
                                if (!r.checks.trendBaselineOk) reasons.push(isLongTarget ? 'السعر يتداول أسفل خط اتجاه EMA 50.' : 'السعر يتداول أعلى خط اتجاه EMA 50.');
                                if (!r.checks.volumeExplosion) reasons.push(`الفوليوم ضعيف (${r.volRatio.toFixed(2)}x) ولم يتجاوز متوسط 20 شمعة (غياب السيولة المؤسسية).`);
                                if (!r.checks.rsiHealthy) reasons.push(`مؤشر القوة النسبية RSI (${r.rsi.toFixed(1)}) خارج النطاق الفني للزخم.`);

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
                                  rsiRange: isLongTarget ? '48-72' : '28-54',
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
                                  fibonacci: r.fibonacci,
                                  isConfirmed: false,
                                  checks: r.checks,
                                  unconfirmedReasons: reasons
                                };
                                onSelectSignal(tempSignal);
                              }}
                              className="text-xs text-neutral-400 hover:text-white font-sans underline"
                            >
                              معاينة الفيبو
                            </button>
                          )}
                        </div>
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
