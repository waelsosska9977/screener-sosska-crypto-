import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  MacroBtcStatus, PairScanResult, BreakoutSignal, 
  StrategyConfig, TelegramConfig, SensitivityMode 
} from './types/scanner';
import { 
  DEFAULT_CONFIG, POPULAR_FUTURES_PAIRS, 
  runFullMarketScan, formatPrice,
  getImmediateInitialScan 
} from './services/marketScanner';
import { PYTHON_FILES } from './services/pythonScripts';
import { 
  sendSignalToTelegram, 
  isSignalInTelegramCooldown,
  buildSignalMarkdown 
} from './services/telegramService';
import { Header } from './components/Header';
import { LiveScannerView } from './components/LiveScannerView';
import { SignalChartModal } from './components/SignalChartModal';
import { TradeTargetsCalculator } from './components/TradeTargetsCalculator';
import { TelegramSimulatorView } from './components/TelegramSimulatorView';
import { PythonStudioView } from './components/PythonStudioView';
import { StrategyGuideView } from './components/StrategyGuideView';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('scanner');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  
  // Instant snapshot to guarantee zero loading lag or empty screen on first render
  const initialSnapshot = useMemo(() => getImmediateInitialScan(DEFAULT_CONFIG), []);
  const [macro, setMacro] = useState<MacroBtcStatus | null>(() => initialSnapshot.macro);
  const [results, setResults] = useState<PairScanResult[]>(() => initialSnapshot.results);
  const [signals, setSignals] = useState<BreakoutSignal[]>(() => initialSnapshot.signals);
  const [selectedSignal, setSelectedSignal] = useState<BreakoutSignal | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(() => new Date().toISOString().replace('T', ' ').substring(0, 19));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bot Automation & Sensitivity State
  const [sensitivityMode, setSensitivityMode] = useState<SensitivityMode>('BALANCED');
  const [autoBotActive, setAutoBotActive] = useState<boolean>(true);
  const [scanIntervalSec, setScanIntervalSec] = useState<number>(60);

  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    try {
      const saved = localStorage.getItem('sosska1_telegram_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.botToken && parsed.chatId) return parsed;
      }
    } catch {}
    return {
      botToken: '8763950020:AAHwxNoRNjdyKzr-EqbrpOlJ2ixaQqiQD_4',
      chatId: '1076270331',
      autoSendSignals: true,
      soundAlerts: true
    };
  });

  // Ensure persistent storage of user credentials
  useEffect(() => {
    try {
      localStorage.setItem('sosska1_telegram_config', JSON.stringify(telegramConfig));
    } catch {}
  }, [telegramConfig]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const playAlertSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  const saveTelegramConfig = (cfg: TelegramConfig) => {
    setTelegramConfig(cfg);
    try {
      localStorage.setItem('sosska1_telegram_config', JSON.stringify(cfg));
    } catch {}
    showToast('تم حفظ إعدادات تيليجرام');
  };

  // Run Market Scan
  const handleRunScan = useCallback(async (isSilent: boolean = false) => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const res = await runFullMarketScan(POPULAR_FUTURES_PAIRS, {
        ...DEFAULT_CONFIG,
        sensitivityMode
      });
      setMacro(res.macro);
      setResults(res.results);
      setSignals(res.signals);
      setLastScanTime(new Date().toISOString().replace('T', ' ').substring(0, 19));

      // Auto-dispatch to Telegram if credentials are set and autoSend is enabled
      if (telegramConfig.botToken && telegramConfig.chatId && (telegramConfig.autoSendSignals ?? true)) {
        for (const sig of res.signals) {
          if (!isSignalInTelegramCooldown(sig.symbol, sig.direction)) {
            const sendRes = await sendSignalToTelegram(sig, telegramConfig, false);
            if (sendRes.success) {
              if (telegramConfig.soundAlerts ?? true) {
                playAlertSound();
              }
              showToast(`تم إرسال إشارة ${sig.cleanSymbol} تلقائياً إلى التيليجرام 🚀`);
            }
          }
        }
      }

      if (!isSilent) {
        showToast(`تم إكمال المسح (${res.results.length} زوج مفحوص - ${res.signals.length} إشارة مقتنصة).`);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      if (!isSilent) showToast('حدث خطأ أثناء المسح.');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, sensitivityMode, telegramConfig, playAlertSound]);

  // Initial Scan on Mount
  useEffect(() => {
    handleRunScan(true);
  }, [sensitivityMode]);

  // Auto-Bot Periodic Background Runner
  useEffect(() => {
    if (!autoBotActive) return;
    const intervalMs = Math.max(25, scanIntervalSec) * 1000;
    const timer = setInterval(() => {
      handleRunScan(true);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoBotActive, scanIntervalSec, handleRunScan]);

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

  // Direct Send to Telegram
  const handleSendSignalToTelegram = async (sig: BreakoutSignal) => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      showToast('يرجى إدخال Bot Token و Chat ID في تبويب "بوت تيليجرام" أولاً!');
      setActiveTab('telegram');
      return;
    }
    const res = await sendSignalToTelegram(sig, telegramConfig, true);
    showToast(res.message);
  };

  const handleCopyTelegramAlert = (sig: BreakoutSignal) => {
    const text = buildSignalMarkdown(sig);
    navigator.clipboard.writeText(text);
    showToast(`تم نسخ بيانات صفقة ${sig.cleanSymbol} (سعر الدخول، وقف الخسارة، والتيك بروفيت)`);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunScan={() => handleRunScan(false)}
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
            onRunScan={() => handleRunScan(false)}
            onSelectSignal={setSelectedSignal}
            onCopyTelegram={handleCopyTelegramAlert}
            onSendTelegram={handleSendSignalToTelegram}
            lastScanTime={lastScanTime}
            sensitivityMode={sensitivityMode}
            onChangeSensitivity={setSensitivityMode}
            autoBotActive={autoBotActive}
            onToggleAutoBot={() => setAutoBotActive(!autoBotActive)}
            scanIntervalSec={scanIntervalSec}
            onChangeScanInterval={setScanIntervalSec}
            onOpenTelegramTab={() => setActiveTab('telegram')}
          />
        )}

        {activeTab === 'signals' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">الإشارات المؤكدة المقتنصة ({signals.length})</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  أزواج استوفت جميع شروط استراتيجية SOSSKA1 ومستويات فيبوناتشي مع إمكانية الإرسال الفوري لتيليجرام.
                </p>
              </div>
            </div>

            {signals.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center space-y-4">
                <div className="text-neutral-400 text-sm font-semibold">
                  لا توجد إشارات اختراق مؤكدة في هذه الشمعة الحالية بالوضع الحالي ({sensitivityMode}).
                </div>
                <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                  يمكنك التبديل إلى <strong>وضع الاقتناص النشط (Active)</strong> لاقتناص الصفقات السريعة وموجات السيولة فور حدوثها دون انتظار.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSensitivityMode('AGGRESSIVE');
                      handleRunScan(false);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    التبديل إلى الوضع النشط ⚡
                  </button>
                  <button
                    onClick={() => handleRunScan(false)}
                    disabled={isScanning}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors border border-neutral-700"
                  >
                    إعادة المسح الآن
                  </button>
                </div>
              </div>
            ) : (
              <LiveScannerView
                macro={macro}
                results={results}
                signals={signals}
                isScanning={isScanning}
                onRunScan={() => handleRunScan(false)}
                onSelectSignal={setSelectedSignal}
                onCopyTelegram={handleCopyTelegramAlert}
                onSendTelegram={handleSendSignalToTelegram}
                lastScanTime={lastScanTime}
                sensitivityMode={sensitivityMode}
                onChangeSensitivity={setSensitivityMode}
                autoBotActive={autoBotActive}
                onToggleAutoBot={() => setAutoBotActive(!autoBotActive)}
                scanIntervalSec={scanIntervalSec}
                onChangeScanInterval={setScanIntervalSec}
                onOpenTelegramTab={() => setActiveTab('telegram')}
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
          onSendTelegram={handleSendSignalToTelegram}
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
