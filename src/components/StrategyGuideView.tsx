import React from 'react';
import { BookOpen, ShieldCheck, TrendingUp, TrendingDown, Layers, Zap, Scale, CheckCircle2 } from 'lucide-react';

export const StrategyGuideView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">دليل استراتيجية SOSSKA1 للتحليل الكمي وقنص الزخم</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              الشرح الرياضي والفني المتكامل لقواعد نظام التداول الكمي وإدارة المخاطر على Binance Futures.
            </p>
          </div>
        </div>
      </div>

      {/* 5 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Pillar 1 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">1. فلتر نظام السوق الكلي (Macro Bitcoin Filter)</h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            العملات البديلة (Altcoins) ترتبط تاريخياً بحركة البيتكوين بنسبة تتجاوز 75%. الدخول في صفقات شراء بينما البيتكوين يهبط يعد من أكبر أسباب الخسائر المتكررة في أسواق الكريبتو (Bull Traps).
          </p>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1.5 font-mono">
            <div className="text-emerald-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>BTC &gt; EMA(100) on 15m &rarr; يسمح بصفقات LONG فقط</span>
            </div>
            <div className="text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>BTC &lt; EMA(100) on 15m &rarr; يسمح بصفقات SHORT فقط</span>
            </div>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">2. محاذاة الاتجاه (EMA 5 / 15 + EMA 50)</h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            استخدام مزيج من متوسط سريع (EMA 5) ومتوسط وسيط (EMA 15) لاقتناص اللحظة الدقيقة لبداية الزخم اللحظي، مع اشتراط أن يكون السعر أعلى من خط الأساس EMA 50 للشراء (أو أدنى منه للبيع) لتأكيد أن الحركة ليست مجرد ارتداد عشوائي ضد الاتجاه العام.
          </p>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1 font-mono text-neutral-300">
            <div>&bull; تقاطع صاعد: EMA(5) &gt; EMA(15) مع إغلاق &gt; EMA(50)</div>
            <div>&bull; تقاطع هابط: EMA(5) &lt; EMA(15) مع إغلاق &lt; EMA(50)</div>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">3. انفجار الفوليوم (Volume Confirmation &ge; 1.4x)</h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            الحجم هو وقود حركة الأسعار في العقود الآجلة. اشتراط أن يكون حجم تداول شمعة الإشارة أعلى من 1.4 ضعف متوسط آخر 20 شمعة يضمن دخول سيولة حقيقية وصناع سوق، ويقضي تماماً على إشارات الاختراق الوهمية ذات السيولة الضعيفة.
          </p>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs font-mono text-amber-300">
            Volume(current) &ge; 1.4 * SMA(Volume, 20)
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Layers className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">4. نطاق الزخم الصحي لمؤشر RSI(14)</h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            العديد من المتداولين يقعون في فخ الشراء عند قمم التشبع (&gt; 70) أو البيع عند قيعان التشبع (&lt; 30). استراتيجية SOSSKA1 تحصر الدخول في ممر القوة الصحي الذي يعكس اندفاعاً مستمراً دون إجهاد:
          </p>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1 font-mono">
            <div className="text-emerald-400">&bull; في صفقات الشراء LONG: يجب أن يكون RSI بين 52 و 68</div>
            <div className="text-rose-400">&bull; في صفقات البيع SHORT: يجب أن يكون RSI بين 32 و 48</div>
          </div>
        </div>

      </div>

      {/* Pillar 5: Dynamic Risk Management */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <Scale className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">5. الحساب الديناميكي للأهداف والوقف عبر مؤشر ATR(14)</h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          تحديد وقف خسارة بنسبة ثابتة (مثل 2% أو 3%) خطأ كمي فادح، لأن تقلب عملة مثل PEPE أو WIF يختلف جذرياً عن تقلب SOL أو BTC. يعتمد محرك SOSSKA1 على حساب متوسط المدى الحقيقي (Average True Range - ATR 14) ليتكيف الهدف والوقف مع سيولة وتقلب كل زوج على حدة.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-500/20 space-y-2">
            <h4 className="font-bold text-emerald-400 text-sm">حسابات الشراء (LONG):</h4>
            <div className="text-neutral-300">&bull; الوقف (Stop Loss): <code className="text-rose-400">Entry - (1.8 * ATR 14)</code></div>
            <div className="text-neutral-300">&bull; الهدف الأول (TP1): <code className="text-emerald-400">Entry + (2.5 * ATR 14)</code> <span className="text-neutral-500 font-sans">[عائد/مخاطرة 1 : 1.39]</span></div>
            <div className="text-neutral-300">&bull; الهدف الثاني (TP2): <code className="text-teal-400">Entry + (5.0 * ATR 14)</code> <span className="text-neutral-500 font-sans">[عائد/مخاطرة 1 : 2.78]</span></div>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-rose-500/20 space-y-2">
            <h4 className="font-bold text-rose-400 text-sm">حسابات البيع (SHORT):</h4>
            <div className="text-neutral-300">&bull; الوقف (Stop Loss): <code className="text-rose-400">Entry + (1.8 * ATR 14)</code></div>
            <div className="text-neutral-300">&bull; الهدف الأول (TP1): <code className="text-emerald-400">Entry - (2.5 * ATR 14)</code> <span className="text-neutral-500 font-sans">[عائد/مخاطرة 1 : 1.39]</span></div>
            <div className="text-neutral-300">&bull; الهدف الثاني (TP2): <code className="text-teal-400">Entry - (5.0 * ATR 14)</code> <span className="text-neutral-500 font-sans">[عائد/مخاطرة 1 : 2.78]</span></div>
          </div>
        </div>
      </div>

    </div>
  );
};
