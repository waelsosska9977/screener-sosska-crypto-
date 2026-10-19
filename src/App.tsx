import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveScannerView } from './components/LiveScannerView';
import { SignalChartModal } from './components/SignalChartModal';
import { TelegramSimulatorView } from './components/TelegramSimulatorView';
import { PythonStudioView } from './components/PythonStudioView';
import { StrategyGuideView } from './components/StrategyGuideView';
import { TradeTargetsCalculator } from './components/TradeTargetsCalculator';
import { runFullMarketScan, POPULAR_FUTURES_PAIRS, DEFAULT_CONFIG, formatPrice } from './services/marketScanner';
import { PYTHON_FILES } from './services/pythonScripts';
import { MacroBtcStatus, PairScanResult, BreakoutSignal, TelegramConfig } from './types/scanner';
import JSZip from 'jszip';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('scanner');
  const [macro, setMacro] = useState<MacroBtcStatus | null>(null);
  const [results, setResults] = useState<PairScanResult[]>([]);
  const [signals, setSignals] = useState<BreakoutSignal[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<BreakoutSignal | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Telegram Config in LocalStorage
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    try {
      const saved = localStorage.getItem('sosska1_telegram_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      botToken: '',
      chatId: ''
    };
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const saveTelegramConfig = (cfg: TelegramConfig) => {
    setTelegramConfig(cfg);
    try {
      localStorage.setItem('sosska1_telegram_config', JSON.stringify(cfg));
    } catch {}
    showToast('تم حفظ إعدادات تيليجرام');
  };

  // Run Market Scan
  const handleRunScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const res = await runFullMarketScan(POPULAR_FUTURES_PAIRS, DEFAULT_CONFIG);
      setMacro(res.macro);
      setResults(res.results);
      setSignals(res.signals);
      setLastScanTime(new Date().toISOString().replace('T', ' ').substring(0, 19));
      showToast(`تم إكمال المسح: تم فحص ${res.results.length} زوج ورصد ${res.signals.length} إشارة.`);
    } catch (err: any) {
      console.error('Scan error:', err);
      showToast('حدث خطأ أثناء المسح.');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  // Initial Scan on Mount
  useEffect(() => {
    handleRunScan();
  }, []);

  // Download all files as a clean ZIP package
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    PYTHON_FILES.forEach(file => {
      zip.file(file.filename, file.content);
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sosska1-binance-scanner.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('تم تحميل حزمة الملفات كاملة (sosska1-binance-scanner.zip)!');
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء إنشاء ملف ZIP.');
    }
  };

  const handleCopyTelegramAlert = (sig: BreakoutSignal) => {
    const isLong = sig.direction === 'LONG';
    const badge = isLong ? '🟢 *تنبيه صفقة شراء (LONG)* 🚀' : '🔴 *تنبيه صفقة بيع (SHORT)* 🔻';
    const arrow = isLong ? '▲ صاعد' : '▼ هابط';
    const rr1 = roundNum(DEFAULT_CONFIG.atrTp1Mult / DEFAULT_CONFIG.atrSlMult, 2);
    const rr2 = roundNum(DEFAULT_CONFIG.atrTp2Mult / DEFAULT_CONFIG.atrSlMult, 2);
    const fib = sig.fibonacci;

    const fibSection = fib ? `
📐 *تحليل ضلع الفيبوناتشي (20 شمعة) ومناطق البيع/الشراء:*
• *قمة الضلع (High):* \`${formatPrice(fib.swingHigh)}\`
• *قاع الضلع (Low):* \`${formatPrice(fib.swingLow)}\`
• *★ النسبة الذهبية (Fib 0.618):* \`${formatPrice(fib.fib618)}\`
• *نقطة التوازن (Fib 0.500):* \`${formatPrice(fib.fib500)}\`
• *مستوى المقاومة (Fib 0.382):* \`${formatPrice(fib.fib382)}\`
• *الامتداد الذهبي (Fib 1.618 Ext):* \`${formatPrice(fib.fibExt1618)}\`

🎯 *توجيه مناطق الدخول والخروج:*
🟢 *منطقة الشراء:* ${fib.buyZone.label} (${formatPrice(fib.buyZone.min)} - ${formatPrice(fib.buyZone.max)})
🔴 *مناطق البيع وجني الربح:* ${fib.sellZone.label} (TP1: ${formatPrice(fib.sellZone.tp1)} | TP2: ${formatPrice(fib.sellZone.tp2)} | TP3: ${formatPrice(fib.sellZone.tp3)})
` : '';

    const text = 
`${badge}
━━━━━━━━━━━━━━━━━━━━━━
⚡ *الاستراتيجية:* \`SOSSKA1 + Auto Fibonacci Engine\`
💎 *الزوج:* \`${sig.cleanSymbol}\` (Binance Futures)
⏱ *الإطار الزمني:* \`${sig.timeframe}\`
💰 *سعر الدخول (Entry):* \`${formatPrice(sig.entry)}\`

🛡 *إدارة المخاطر (Dynamic ATR 14):*
🛑 *وقف الخسارة (SL):* \`${formatPrice(sig.stopLoss)}\` \`(${sig.slPct > 0 ? '+' : ''}${sig.slPct.toFixed(2)}%)\`
🎯 *الهدف الأول (TP1):* \`${formatPrice(sig.tp1)}\` \`(${sig.tp1Pct > 0 ? '+' : ''}${sig.tp1Pct.toFixed(2)}% | R:R 1:${rr1})\`
🏆 *الهدف الثاني (TP2):* \`${formatPrice(sig.tp2)}\` \`(${sig.tp2Pct > 0 ? '+' : ''}${sig.tp2Pct.toFixed(2)}% | R:R 1:${rr2})\`
${fibSection}
📊 *الشروط الفنية المكتملة:*
• *المتوسطات:* تقاطع ${arrow} \`EMA(5)\` مع \`EMA(15)\` وتأكيد \`EMA(50)\` ✅
• *انفجار الفوليوم:* \`${sig.volRatio.toFixed(2)}x\` ضعف متوسط 20 شمعة (المطلوب >= 1.4x) ✅
• *مؤشر القوة (RSI):* \`${sig.rsi.toFixed(1)}\` (المجال المطلوب: ${sig.rsiRange}) ✅
• *نظام السوق الكلي:* البيتكوين \`${sig.macroStatus}\` ✅

🕒 *التوقيت:* \`${sig.timestamp}\` UTC
━━━━━━━━━━━━━━━━━━━━━━
⚠️ *تذكير:* التزم بحجم العقد المناسب للمخاطرة (1-2% كحد أقصى من رأس المال).`;

    navigator.clipboard.writeText(text);
    showToast(`تم نسخ تنبيه ${sig.cleanSymbol} بصيغة Markdown مع مستويات فيبوناتشي`);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunScan={handleRunScan}
        isScanning={isScanning}
        macroRegime={macro?.regime || null}
        confirmedCount={signals.length}
        onDownloadZip={handleDownloadZip}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'scanner' && (
          <LiveScannerView
            macro={macro}
            results={results}
            signals={signals}
            isScanning={isScanning}
            onRunScan={handleRunScan}
            onSelectSignal={setSelectedSignal}
            onCopyTelegram={handleCopyTelegramAlert}
            lastScanTime={lastScanTime}
          />
        )}

        {activeTab === 'signals' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">الإشارات المؤكدة المقتنصة ({signals.length})</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  أزواج استوفت جميع شروط استراتيجية SOSSKA1 في الاتجاه النشط مع حساب الأهداف والوقف ديناميكياً عبر ATR.
                </p>
              </div>
            </div>

            {signals.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center space-y-3">
                <div className="text-neutral-500 text-sm">
                  لا توجد إشارات اختراق مؤكدة في هذه الشمعة الحالية.
                </div>
                <p className="text-xs text-neutral-600 max-w-md mx-auto">
                  تلتزم الاستراتيجية بالانضباط الصارم، ولا تصدر أي إشارة إلا بتحقق الشروط الخمسة معاً لحماية رأس المال.
                </p>
                <button
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-colors"
                >
                  إعادة المسح الآن
                </button>
              </div>
            ) : (
              <LiveScannerView
                macro={macro}
                results={results}
                signals={signals}
                isScanning={isScanning}
                onRunScan={handleRunScan}
                onSelectSignal={setSelectedSignal}
                onCopyTelegram={handleCopyTelegramAlert}
                lastScanTime={lastScanTime}
              />
            )}
          </div>
        )}

        {activeTab === 'targets' && (
          <TradeTargetsCalculator
            signals={signals}
            onSelectSignalForChart={setSelectedSignal}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramSimulatorView
            config={telegramConfig}
            onSaveConfig={saveTelegramConfig}
            activeSignals={signals}
          />
        )}

        {activeTab === 'python' && (
          <PythonStudioView onDownloadAllZip={handleDownloadZip} />
        )}

        {activeTab === 'strategy' && (
          <StrategyGuideView />
        )}
      </main>

      {/* Interactive Candlestick Chart Modal */}
      {selectedSignal && (
        <SignalChartModal
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
          onCopyTelegram={handleCopyTelegramAlert}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-neutral-900 border border-neutral-800 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-300">SOSSKA1 Quant Breakout Engine</span>
            <span>·</span>
            <span>Binance USDT-M Futures (15m)</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <button onClick={() => setActiveTab('python')} className="hover:text-white transition-colors">
              تحميل sosska1_scanner.py
            </button>
            <span>·</span>
            <button onClick={() => setActiveTab('strategy')} className="hover:text-white transition-colors">
              قواعد الاستراتيجية
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

function roundNum(val: number, decimals: number): number {
  return Number(val.toFixed(decimals));
}
