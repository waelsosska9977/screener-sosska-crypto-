import React, { useState, useEffect } from 'react';
import { Send, Bot, Shield, CheckCircle, AlertTriangle, Copy, Check, Clock, Trash2, ArrowUpRight } from 'lucide-react';
import { TelegramConfig, CooldownItem, BreakoutSignal } from '../types/scanner';

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
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedType, setCopiedType] = useState<'long' | 'short' | null>(null);

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
    onSaveConfig({ botToken: token.trim(), chatId: chatId.trim() });
    setTestResult({ success: true, message: 'تم حفظ إعدادات التيليجرام بنجاح.' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleSendTestMessage = async () => {
    if (!token || !chatId) {
      setTestResult({ success: false, message: 'يرجى إدخال Bot Token و Chat ID أولاً.' });
      return;
    }

    setIsSending(true);
    setTestResult(null);

    const testText = 
`🤖 *تجربة ربط بوت التنبيهات (SOSSKA1 Futures Scanner)*
━━━━━━━━━━━━━━━━━━━━━━
✅ تم الاتصال بنجاح مع تيليجرام!
🎯 نظام مسح عقود بينانس الآجلة (Futures) جاهز لاقتناص فرص LONG و SHORT.
🕒 ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: testText,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({ success: true, message: 'تم إرسال رسالة الاختبار بنجاح إلى التيليجرام! تفقد محادثتك.' });
      } else {
        setTestResult({ success: false, message: `فشل الإرسال: ${data.description || 'تأكد من صحة التوكن والمعرف'}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `تعذر الاتصال بخوادم تيليجرام: ${err.message}` });
    } finally {
      setIsSending(false);
    }
  };

  const sampleLongMarkdown = 
`🟢 *تنبيه صفقة شراء (LONG)* 🚀
━━━━━━━━━━━━━━━━━━━━━━
⚡ *الاستراتيجية:* \`SOSSKA1 + Auto Fibonacci Engine\`
💎 *الزوج:* \`SOL/USDT\` (Binance Futures)
⏱ *الإطار الزمني:* \`15m\`
💰 *سعر الدخول (Entry):* \`$105.6700\`

🛡 *إدارة المخاطر (Dynamic ATR 14):*
🛑 *وقف الخسارة (SL):* \`$101.2600\` \`(-4.17%)\`
🎯 *الهدف الأول (TP1):* \`$111.7950\` \`(+5.80% | R:R 1:1.39)\`
🏆 *الهدف الثاني (TP2):* \`$117.9200\` \`(+11.59% | R:R 1:2.78)\`

📐 *تحليل ضلع الفيبوناتشي (20 شمعة) ومناطق البيع/الشراء:*
• *قمة الضلع (High):* \`$112.5000\`
• *قاع الضلع (Low):* \`$98.2000\`
• *★ النسبة الذهبية (Fib 0.618):* \`$103.6628\`
• *نقطة التوازن (Fib 0.500):* \`$105.3500\`
• *مستوى المقاومة (Fib 0.382):* \`$107.0372\`
• *الامتداد الذهبي (Fib 1.618 Ext):* \`$121.3372\`

🎯 *توجيه مناطق الدخول والخروج:*
🟢 *منطقة الشراء:* ارتداد النسبة الذهبية OTE ($101.25 إلى $103.66) أو اختراق $107.03
🔴 *مناطق البيع وجني الربح:* قمة الضلع $112.50 ثم امتداد 1.618 عند $121.34

📊 *الشروط الفنية المكتملة:*
• *المتوسطات:* تقاطع ▲ صاعد \`EMA(5)\` مع \`EMA(15)\` وتأكيد \`EMA(50)\` ✅
• *انفجار الفوليوم:* \`2.15x\` ضعف متوسط 20 شمعة (المطلوب >= 1.4x) ✅
• *مؤشر القوة (RSI):* \`61.4\` (المجال المطلوب: 52-68) ✅
• *نظام السوق الكلي:* البيتكوين \`BULLISH (صاعد)\` (BTC \`$82,758\` vs EMA100 \`$81,920\`) ✅

🕒 *التوقيت:* \`${new Date().toISOString().replace('T', ' ').substring(0, 19)}\` UTC
━━━━━━━━━━━━━━━━━━━━━━
⚠️ *تذكير:* التزم بحجم العقد المناسب للمخاطرة (1-2% كحد أقصى من رأس المال).`;

  const sampleShortMarkdown = 
`🔴 *تنبيه صفقة بيع (SHORT)* 🔻
━━━━━━━━━━━━━━━━━━━━━━
⚡ *الاستراتيجية:* \`SOSSKA1 + Auto Fibonacci Engine\`
💎 *الزوج:* \`DOGE/USDT\` (Binance Futures)
⏱ *الإطار الزمني:* \`15m\`
💰 *سعر الدخول (Entry):* \`$0.0798\`

🛡 *إدارة المخاطر (Dynamic ATR 14):*
🛑 *وقف الخسارة (SL):* \`$0.0825\` \`(+3.38%)\`
🎯 *الهدف الأول (TP1):* \`$0.0760\` \`(-4.76% | R:R 1:1.39)\`
🏆 *الهدف الثاني (TP2):* \`$0.0722\` \`(-9.52% | R:R 1:2.78)\`

📐 *تحليل ضلع الفيبوناتشي (20 شمعة) ومناطق البيع/الشراء:*
• *قمة الضلع (High):* \`$0.0850\`
• *قاع الضلع (Low):* \`$0.0780\`
• *★ النسبة الذهبية (Fib 0.618):* \`$0.0823\`
• *نقطة التوازن (Fib 0.500):* \`$0.0815\`
• *الامتداد الذهبي الهابط (Fib 1.618 Ext):* \`$0.0737\`

🎯 *توجيه مناطق الدخول والخروج:*
🟢 *مناطق إغلاق الشورت:* عند قاع الضلع $0.0780 ثم الامتداد $0.0737
🔴 *منطقة البيع الهابطة:* الارتداد للنسبة الذهبية $0.0823 أو كسر $0.0807

📊 *الشروط الفنية المكتملة:*
• *المتوسطات:* تقاطع ▼ هابط \`EMA(5)\` مع \`EMA(15)\` وتأكيد \`EMA(50)\` ✅
• *انفجار الفوليوم:* \`1.85x\` ضعف متوسط 20 شمعة (المطلوب >= 1.4x) ✅
• *مؤشر القوة (RSI):* \`38.2\` (المجال المطلوب: 32-48) ✅
• *نظام السوق الكلي:* البيتكوين \`BEARISH (هابط)\` (BTC \`$81,200\` vs EMA100 \`$82,400\`) ✅

🕒 *التوقيت:* \`${new Date().toISOString().replace('T', ' ').substring(0, 19)}\` UTC
━━━━━━━━━━━━━━━━━━━━━━
⚠️ *تذكير:* التزم بحجم العقد المناسب للمخاطرة (1-2% كحد أقصى من رأس المال).`;

  const copyText = (text: string, type: 'long' | 'short') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const clearCooldowns = () => {
    setCooldowns([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">إعدادات بوت التنبيهات ونظام منع التكرار (Telegram & Anti-Spam)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              ربط السكريبت مع حسابك أو قناتك على Telegram وتجربة الإشعارات مع تفعيل الذاكرة المؤقتة (90 دقيقة لكل زوج).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">بيانات اتصال Telegram Bot</h3>

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
                  يمكنك الحصول عليه مجاناً عبر بوت @BotFather على تيليجرام.
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
                  معرف حسابك الشخصي (من بوت @userinfobot) أو معرف القناة الخاصة بك.
                </span>
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
                  onClick={handleSendTestMessage}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-neutral-950 hover:bg-sky-400 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'جاري الإرسال...' : 'إرسال رسالة اختبار حية'}</span>
                </button>
              </div>
            </form>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' 
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
              }`}>
                {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Anti-Spam Cache Monitor Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">ذاكرة الكاش ومنع التكرار (90 دقيقة)</h3>
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
              يقوم السكريبت بتسجيل أي عملة أرسلت إشارة في ملف <code className="text-amber-400 font-mono">sosska1_cache.json</code> ويحظر تكرار تنبيهها لنفس الاتجاه لمدة 90 دقيقة لمنع إزعاج المستخدم بموجات رسائل متكررة.
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

        {/* Right Column: Telegram Chat Preview & Markdown */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">معاينة شكل التنبيهات في تطبيق Telegram</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  تنسيق Markdown احترافي يتضمن أهداف الدخول والوقف المحسوبة عبر مؤشر ATR(14).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* LONG Message Bubble */}
              <div className="bg-neutral-950 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-emerald-400">نموذج تنبيه الشراء (LONG)</span>
                    <button
                      onClick={() => copyText(sampleLongMarkdown, 'long')}
                      className="text-neutral-400 hover:text-white transition-colors"
                      title="نسخ النص"
                    >
                      {copiedType === 'long' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-[11px] leading-relaxed font-mono text-neutral-300 whitespace-pre-wrap select-text">
                    {sampleLongMarkdown}
                  </pre>
                </div>
              </div>

              {/* SHORT Message Bubble */}
              <div className="bg-neutral-950 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-rose-400">نموذج تنبيه البيع (SHORT)</span>
                    <button
                      onClick={() => copyText(sampleShortMarkdown, 'short')}
                      className="text-neutral-400 hover:text-white transition-colors"
                      title="نسخ النص"
                    >
                      {copiedType === 'short' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-[11px] leading-relaxed font-mono text-neutral-300 whitespace-pre-wrap select-text">
                    {sampleShortMarkdown}
                  </pre>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
