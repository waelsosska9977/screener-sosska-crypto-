import React, { useState } from 'react';
import { 
  Send, Bot, Shield, CheckCircle, AlertTriangle, Copy, Check, 
  Clock, Trash2, HelpCircle, Activity, Volume2, Sparkles, AlertCircle 
} from 'lucide-react';
import { TelegramConfig, CooldownItem, BreakoutSignal } from '../types/scanner';
import { testTelegramDiagnostics, TelegramTestResult, sendSignalToTelegram } from '../services/telegramService';

interface TelegramSimulatorViewProps {
  config: TelegramConfig;
  onSaveConfig: (config: TelegramConfig) => void;
  activeSignals: BreakoutSignal[];
}

export const TelegramSimulatorView: React.FC<TelegramSimulatorViewProps> = ({
  config,
  onSaveConfig,
  activeSignals
}) => {
  const [token, setToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [autoSend, setAutoSend] = useState(config.autoSendSignals ?? true);
  const [soundAlerts, setSoundAlerts] = useState(config.soundAlerts ?? true);
  const [isSending, setIsSending] = useState(false);
  const [diagResult, setDiagResult] = useState<TelegramTestResult | null>(null);
  const [copiedType, setCopiedType] = useState<'long' | 'short' | null>(null);
  const [sendingSignalSymbol, setSendingSignalSymbol] = useState<string | null>(null);
  const [signalSendMsg, setSignalSendMsg] = useState<{ symbol: string; text: string; success: boolean } | null>(null);

  // Cooldown cache state
  const [cooldowns, setCooldowns] = useState<CooldownItem[]>(() => {
    return [
      { key: 'SOLUSDT:LONG', symbol: 'SOL/USDT', direction: 'LONG', timestamp: Date.now() - 25 * 60 * 1000, expiresAt: Date.now() + 65 * 60 * 1000 },
      { key: 'AVAXUSDT:LONG', symbol: 'AVAX/USDT', direction: 'LONG', timestamp: Date.now() - 40 * 60 * 1000, expiresAt: Date.now() + 50 * 60 * 1000 },
      { key: 'NEARUSDT:SHORT', symbol: 'NEAR/USDT', direction: 'SHORT', timestamp: Date.now() - 15 * 60 * 1000, expiresAt: Date.now() + 75 * 60 * 1000 }
    ];
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ 
      botToken: token.trim(), 
      chatId: chatId.trim(),
      autoSendSignals: autoSend,
      soundAlerts
    });
    setDiagResult({ success: true, message: 'تم حفظ إعدادات التيليجرام وخيارات البوت بنجاح.' });
    setTimeout(() => setDiagResult(null), 3500);
  };

  const handleTestDiagnostics = async () => {
    setIsSending(true);
    setDiagResult(null);
    try {
      const res = await testTelegramDiagnostics(token, chatId);
      setDiagResult(res);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendActiveSignal = async (sig: BreakoutSignal) => {
    if (!token.trim() || !chatId.trim()) {
      setDiagResult({
        success: false,
        message: 'يرجى حفظ Bot Token و Chat ID أولاً لإرسال الإشارة.'
      });
      return;
    }

    setSendingSignalSymbol(sig.symbol);
    setSignalSendMsg(null);
    try {
      const res = await sendSignalToTelegram(sig, { botToken: token.trim(), chatId: chatId.trim() }, true);
      setSignalSendMsg({ symbol: sig.symbol, text: res.message, success: res.success });
      setTimeout(() => setSignalSendMsg(null), 4000);
    } finally {
      setSendingSignalSymbol(null);
    }
  };

  const copyText = (text: string, type: 'long' | 'short') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const clearCooldowns = () => {
    setCooldowns([]);
  };

  const sampleLongMarkdown = 
`🟢 *تنبيه صفقة شراء (LONG)* 🚀
━━━━━━━━━━━━━━━━━━━━━━
⚡ *الاستراتيجية:* \`SOSSKA1 + Auto Fibonacci Engine\`
💎 *الزوج:* \`SOL/USDT\` (Binance Futures)
⏱ *الإطار الزمني:* \`15m\`
💰 *سعر الدخول (Entry):* \`$105.67\`

🛡 *إدارة المخاطر (Dynamic ATR 14):*
🛑 *وقف الخسارة (SL):* \`$101.26\` \`(-4.17%)\`
🎯 *الهدف الأول (TP1):* \`$111.80\` \`(+5.80% | R:R 1:1.39)\`
🏆 *الهدف الثاني (TP2):* \`$117.92\` \`(+11.59% | R:R 1:2.78)\`

📐 *تحليل ضلع الفيبوناتشي (20 شمعة) ومناطق البيع/الشراء:*
• *قمة الضلع (High):* \`$112.50\`
• *قاع الضلع (Low):* \`$98.20\`
• *★ النسبة الذهبية (Fib 0.618):* \`$103.66\`
• *نقطة التوازن (Fib 0.500):* \`$105.35\`
• *مستوى المقاومة (Fib 0.382):* \`$107.04\`
• *الامتداد الذهبي (Fib 1.618 Ext):* \`$121.34\`

🎯 *توجيه مناطق الدخول والخروج:*
🟢 *منطقة الشراء:* النسبة الذهبية OTE ($101.25 إلى $103.66) أو اختراق $107.04
🔴 *مناطق البيع وجني الربح:* قمة الضلع $112.50 ثم امتداد 1.618 عند $121.34

📊 *الشروط الفنية المكتملة:*
• *المتوسطات:* تقاطع ▲ صاعد \`EMA(5)\` مع \`EMA(15)\` وتأكيد \`EMA(50)\` ✅
• *انفجار الفوليوم:* \`1.85x\` ضعف متوسط 20 شمعة ✅
• *مؤشر القوة (RSI):* \`59.4\` ✅
• *نظام السوق الكلي:* البيتكوين \`BULLISH (صاعد)\` ✅

🕒 *التوقيت:* \`${new Date().toISOString().replace('T', ' ').substring(0, 19)}\` UTC
━━━━━━━━━━━━━━━━━━━━━━
⚠️ *تذكير:* التزم بحجم العقد المناسب للمخاطرة (1-2% كحد أقصى).`;

  return (
    <div className="space-y-6 text-right">
      
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">إعدادات وتشخيص بوت تيليجرام (Telegram Bot Diagnostics)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              ربط مباشر مع تيليجرام لإرسال توصيات الفيبوناتشي والكسر اللحظي، مع تشخيص أسباب عدم وصول الرسائل وإصلاحها.
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Alert Box - Highlights Why Bot Might Not Receive Signals */}
      <div className="bg-gradient-to-l from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-300">
              لماذا لا يستقبل البوت أي توصيات أو إشارات؟ (أهم 3 أسباب وحلولها):
            </h3>
            <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">السبب الأول (الأكثر شيوعاً):</strong> لم تضغط على زر <code className="bg-neutral-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">/start</code> في محادثة البوت على تيليجرام! (تيليجرام يحظر أي بوت من مراسلتك حتى تفتح محادثته وتضغط Start).
              </li>
              <li>
                <strong className="text-white">السبب الثاني:</strong> إذا كنت ترسل لقناة أو مجموعة، يجب إضافة البوت كـ <strong className="text-white">Admin (مشرف)</strong> ومنحه صلاحية <strong className="text-emerald-400">Post Messages</strong>.
              </li>
              <li>
                <strong className="text-white">السبب الثالث:</strong> هدوء حركة السوق أو تذبذب البيتكوين؛ حيث تلتزم الاستراتيجية بشروط فنية صارمة. يمكنك التبديل إلى <strong>"وضع الاقتناص النشط"</strong> في الماسح لاقتناص أي تحرك صاعد أو هابط بسرعة.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Connection Diagnostic */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>بيانات اتصال Telegram Bot</span>
              <span className="text-[11px] font-normal text-neutral-400">إرسال لحظي بدون وسيط</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                />
                <span className="text-[11px] text-neutral-500 block mt-1">
                  احصل عليه من بوت <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline">@BotFather</a> مجاناً.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="مثال: 987654321 أو @your_channel"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                />
                <span className="text-[11px] text-neutral-500 block mt-1">
                  معرف حسابك الشخصي (من <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline">@userinfobot</a>) أو معرف قناتك.
                </span>
              </div>

              {/* Bot Automation Toggles */}
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-white block">الإرسال التلقائي الفوري (Auto-Dispatch)</span>
                    <span className="text-[11px] text-neutral-400">إرسال الصفقات المؤكدة فور اكتشافها بالماسح إلى تيليجرام</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSend}
                    onChange={e => setAutoSend(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-500 bg-neutral-900 border-neutral-700 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-neutral-800/60">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">التنبيه الصوتي (Sound Alert)</span>
                      <span className="text-[11px] text-neutral-400">تشغيل نغمة تنبيه صوتية عند اكتشاف إشارة جديدة في المتصفح</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={e => setSoundAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-500 bg-neutral-900 border-neutral-700 focus:ring-0"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={handleTestDiagnostics}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-neutral-950 hover:bg-sky-400 transition-colors disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isSending ? 'جاري الفحص التشخيصي...' : 'فحص الاتصال وإرسال رسالة تجريبية'}</span>
                </button>
              </div>
            </form>

            {/* Diagnostic Result Callout */}
            {diagResult && (
              <div className={`mt-4 p-4 rounded-xl text-xs space-y-2 border ${
                diagResult.success 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {diagResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{diagResult.message}</span>
                </div>
                {diagResult.botUsername && (
                  <div className="text-[11px] font-mono text-neutral-300">
                    معرف البوت: <strong className="text-sky-400">{diagResult.botUsername}</strong>
                  </div>
                )}
                {diagResult.troubleshootHint && (
                  <div className="p-2.5 rounded bg-black/40 text-[11px] leading-relaxed border border-white/10 text-neutral-200">
                    💡 <strong>توجيه الإصلاح:</strong> {diagResult.troubleshootHint}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Anti-Spam Cache Monitor Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">ذاكرة الكاش ومنع التكرار (Cooldown)</h3>
              </div>
              {cooldowns.length > 0 && (
                <button
                  onClick={clearCooldowns}
                  className="text-xs text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ الكاش</span>
                </button>
              )}
            </div>

            <p className="text-xs text-neutral-400 mb-3">
              يقوم النظام بتسجيل أي عملة أرسلت إشارة ويحظر تكرار تنبيهها لنفس الاتجاه لمدة 60 دقيقة لمنع إزعاجك برسائل متكررة.
            </p>

            <div className="space-y-2">
              {cooldowns.length === 0 ? (
                <div className="p-4 rounded-lg bg-neutral-950 text-center text-xs text-neutral-500">
                  لا توجد عملات في وضع الحظر المؤقت حالياً.
                </div>
              ) : (
                cooldowns.map(item => {
                  const remainingMin = Math.max(0, Math.round((item.expiresAt - Date.now()) / 60000));
                  return (
                    <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.direction === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className="font-mono font-bold text-white">{item.symbol}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">({item.direction})</span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        متبقي {remainingMin} دقيقة
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Direct Dispatch from Active Signals + Markdown Preview */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Direct Send from Active Signals */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>إرسال فوري من الصفقات النشطة بالماسح ({activeSignals.length})</span>
              </span>
              <span className="text-xs text-neutral-400">نقرة واحدة للإرسال المباشر</span>
            </h3>

            {signalSendMsg && (
              <div className={`mb-3 p-2.5 rounded text-xs flex items-center gap-2 ${
                signalSendMsg.success ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'
              }`}>
                {signalSendMsg.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{signalSendMsg.text}</span>
              </div>
            )}

            {activeSignals.length === 0 ? (
              <div className="p-5 rounded-lg bg-neutral-950 border border-neutral-800/70 text-center space-y-2">
                <p className="text-xs text-neutral-400">
                  لا توجد صفقات مقتنصة في هذه اللحظة بالشروط المحددة.
                </p>
                <span className="text-[11px] text-neutral-500 block">
                  يمكنك اختبار إرسال النموذج أدناه للتأكد من وصول الرسائل إلى محادثتك.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeSignals.map(sig => (
                  <div key={sig.symbol} className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sig.direction === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className="font-mono font-bold text-white">{sig.cleanSymbol}</span>
                        <span className="text-[11px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                          {sig.fibonacci?.currentZoneLabel || sig.direction}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        دخول: ${sig.entry.toFixed(2)} | TP1: ${sig.tp1.toFixed(2)} | SL: ${sig.stopLoss.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSendActiveSignal(sig)}
                      disabled={sendingSignalSymbol === sig.symbol}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingSignalSymbol === sig.symbol ? 'جاري الإرسال...' : 'إرسال للبوت 🚀'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telegram Markdown Message Preview */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400">نموذج التنبيه الفعلي المرسل على تيليجرام</span>
                <p className="text-[11px] text-neutral-400">تنسيق Markdown يتضمن أهداف الفيبوناتشي ووقف ATR</p>
              </div>
              <button
                onClick={() => copyText(sampleLongMarkdown, 'long')}
                className="p-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
                title="نسخ النص"
              >
                {copiedType === 'long' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>نسخ</span>
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed font-mono text-neutral-300 bg-neutral-950 p-4 rounded-lg border border-neutral-800 whitespace-pre-wrap select-text max-h-96 overflow-y-auto">
              {sampleLongMarkdown}
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
};
