import React from 'react';
import { Play, RefreshCw, Terminal, Download, ShieldCheck } from 'lucide-react';
import { MarketRegime } from '../types/scanner';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRunScan: () => void;
  isScanning: boolean;
  macroRegime: MarketRegime | null;
  confirmedCount: number;
  onDownloadZip: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRunScan,
  isScanning,
  macroRegime,
  confirmedCount,
  onDownloadZip
}) => {
  const navItems = [
    { id: 'scanner', label: 'المسح المباشر' },
    { id: 'signals', label: `الإشارات المؤكدة (${confirmedCount})` },
    { id: 'targets', label: 'أهداف الصفقة والحاسبة' },
    { id: 'telegram', label: 'بوت تيليجرام' },
    { id: 'python', label: 'كود بايثون' },
    { id: 'strategy', label: 'دليل الاستراتيجية' }
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <button
              onClick={() => setActiveTab('scanner')}
              className="text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-amber-400 transition-colors"
            >
              SOSSKA1 Quant Terminal
            </button>
            {macroRegime && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono border ${
                macroRegime === 'BULLISH' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {macroRegime === 'BULLISH' ? '🟢 BTC BULLISH (LONG)' : '🔴 BTC BEARISH (SHORT)'}
              </span>
            )}
          </div>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-400">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                  activeTab === item.id
                    ? 'text-white border-amber-400 font-semibold'
                    : 'border-transparent hover:text-neutral-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onDownloadZip}
              title="تحميل جميع ملفات بايثون (.zip)"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>تحميل ZIP</span>
            </button>

            <button
              onClick={onRunScan}
              disabled={isScanning}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-neutral-950 transition-all whitespace-nowrap shrink-0 shadow-sm ${
                isScanning
                  ? 'bg-amber-400/70 cursor-not-allowed text-neutral-900'
                  : 'bg-amber-400 hover:bg-amber-300 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جاري المسح...' : 'تشغيل المسح الآن'}</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-neutral-900 gap-4 text-xs no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${
                activeTab === item.id ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
