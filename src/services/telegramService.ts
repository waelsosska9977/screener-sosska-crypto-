import { BreakoutSignal, TelegramConfig } from '../types/scanner';
import { formatPrice } from './marketScanner';

export interface TelegramTestResult {
  success: boolean;
  message: string;
  botUsername?: string;
  chatTitle?: string;
  errorCode?: number;
  troubleshootHint?: string;
}

// In-memory alert history to prevent spamming Telegram during auto-scans
const sentAlertsCache = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes cooldown per pair:direction

export function isSignalInTelegramCooldown(symbol: string, direction: string): boolean {
  const key = `${symbol}:${direction}`;
  const lastSent = sentAlertsCache.get(key);
  if (!lastSent) return false;
  return Date.now() - lastSent < COOLDOWN_MS;
}

export function markSignalSent(symbol: string, direction: string) {
  const key = `${symbol}:${direction}`;
  sentAlertsCache.set(key, Date.now());
}

export function clearTelegramCooldowns() {
  sentAlertsCache.clear();
}

/**
 * Format a breakout signal into a clean, simple, and ultra-readable alert
 * Focused directly on: Entry Price, Stop Loss, and Take Profit targets.
 */
export function buildSignalMarkdown(sig: BreakoutSignal): string {
  const isLong = sig.direction === 'LONG';
  const badge = isLong ? '🟢 *توصية شراء (LONG)* 🚀' : '🔴 *توصية بيع (SHORT)* 🔻';
  const slPctStr = sig.slPct > 0 ? `+${sig.slPct.toFixed(2)}%` : `${sig.slPct.toFixed(2)}%`;
  const tp1PctStr = sig.tp1Pct > 0 ? `+${sig.tp1Pct.toFixed(2)}%` : `${sig.tp1Pct.toFixed(2)}%`;
  const tp2PctStr = sig.tp2Pct > 0 ? `+${sig.tp2Pct.toFixed(2)}%` : `${sig.tp2Pct.toFixed(2)}%`;
  const fibStr = sig.fibonacci ? ` | ★ الفيبو (0.618): \`${formatPrice(sig.fibonacci.fib618)}\`` : '';

  return `${badge}
💎 *العملة:* \`${sig.cleanSymbol}USDT\` (Binance Futures)
━━━━━━━━━━━━━━━━━━━━
💰 *سعر الدخول (Entry):* \`${formatPrice(sig.entry)}\`
🛑 *وقف الخسارة (Stop Loss):* \`${formatPrice(sig.stopLoss)}\` (${slPctStr})
🎯 *الهدف الأول (Take Profit 1):* \`${formatPrice(sig.tp1)}\` (${tp1PctStr})
🏆 *الهدف الثاني (Take Profit 2):* \`${formatPrice(sig.tp2)}\` (${tp2PctStr})
━━━━━━━━━━━━━━━━━━━━
⏱ *الفريم:* \`${sig.timeframe || '15m'}\`${fibStr}
⚡ *إشارة مؤكدة تلقائياً عبر ماسح SOSSKA1*`;
}

/**
 * Send a single BreakoutSignal to Telegram via Bot API
 */
export async function sendSignalToTelegram(
  sig: BreakoutSignal,
  config: TelegramConfig,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  if (!config.botToken?.trim() || !config.chatId?.trim()) {
    return {
      success: false,
      message: 'لم يتم حفظ إعدادات التيليجرام (Bot Token أو Chat ID مفقود).'
    };
  }

  const token = config.botToken.trim();
  const chatId = config.chatId.trim();

  // Check cooldown if not forced manually
  if (!force && isSignalInTelegramCooldown(sig.symbol, sig.direction)) {
    return {
      success: false,
      message: `تم تخطي إرسال ${sig.cleanSymbol} لوجودها في فترة منع التكرار (Cooldown).`
    };
  }

  const text = buildSignalMarkdown(sig);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      markSignalSent(sig.symbol, sig.direction);
      return {
        success: true,
        message: `تم إرسال إشارة ${sig.cleanSymbol} إلى التيليجرام بنجاح!`
      };
    }

    // Analyze specific Telegram error
    const desc = data.description || 'فشل غير معروف';
    let hint = '';
    if (data.error_code === 403 || desc.includes('blocked') || desc.includes('bot can\'t initiate')) {
      hint = 'تنبيه: يجب فتح محادثة مع البوت في تيليجرام والضغط على زر /start أولاً حتى يتمكن البوت من مراسلتك!';
    } else if (data.error_code === 400 && desc.includes('chat not found')) {
      hint = 'تنبيه: Chat ID غير موجود أو أن البوت ليس عضواً في القناة أو المحادثة.';
    } else if (data.error_code === 401 || desc.includes('Unauthorized')) {
      hint = 'تنبيه: رمز البوت Bot Token غير صحيح. تأكد من نسخه بدقة من @BotFather.';
    }

    return {
      success: false,
      message: `فشل إرسال الإشارة عبر تيليجرام: ${desc} ${hint ? `(${hint})` : ''}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `تعذر الاتصال بخوادم تيليجرام: ${err.message}`
    };
  }
}

/**
 * Perform a thorough test and diagnostic of Telegram credentials
 */
export async function testTelegramDiagnostics(
  botToken: string,
  chatId: string
): Promise<TelegramTestResult> {
  const token = botToken.trim();
  const chat = chatId.trim();

  if (!token) {
    return {
      success: false,
      message: 'يرجى إدخال Bot Token أولاً.',
      troubleshootHint: 'احصل عليه من بوت @BotFather على تيليجرام مجاناً.'
    };
  }

  // 1. Validate Bot Token via getMe
  let botUsername = '';
  try {
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const getMeData = await getMeRes.json();
    if (!getMeRes.ok || !getMeData.ok) {
      return {
        success: false,
        errorCode: getMeData.error_code || 401,
        message: `رمز البوت غير صالح: ${getMeData.description || 'Unauthorized'}`,
        troubleshootHint: 'تأكد من نسخ الـ Token كاملاً من @BotFather بدون مسافات إضافية.'
      };
    }
    botUsername = getMeData.result?.username ? `@${getMeData.result.username}` : 'Bot';
  } catch (err: any) {
    return {
      success: false,
      message: `فشل الاتصال بخادم تيليجرام: ${err.message}`,
      troubleshootHint: 'تحقق من اتصال الإنترنت أو استخدم VPN إذا كان تيليجرام محجوباً في منطقتك.'
    };
  }

  if (!chat) {
    return {
      success: false,
      botUsername,
      message: `تم التحقق من البوت (${botUsername}) بنجاح! لكن يجب إدخال Chat ID للمتابعة.`,
      troubleshootHint: 'احصل على معرفك من @userinfobot في تيليجرام.'
    };
  }

  // 2. Test sending a message to Chat ID
  const testMessage = `🤖 *فحص اتصال بوت التداول (SOSSKA1 Scanner)*
━━━━━━━━━━━━━━━━━━━━━━
✅ *البوت متصل بنجاح!*
👤 *اسم البوت:* ${botUsername}
🎯 *الحالة:* جاهز لاستقبال إشارات الفيبوناتشي والصفقات الآلية.
🕒 *التوقيت:* \`${new Date().toISOString().replace('T', ' ').substring(0, 19)}\` UTC
━━━━━━━━━━━━━━━━━━━━━━
إذا ظهرت هذه الرسالة، فإن البوت مهيأ لاستلام التوصيات فور حدوثها! 🚀`;

  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: testMessage,
        parse_mode: 'Markdown'
      })
    });

    const sendData = await sendRes.json();

    if (sendRes.ok && sendData.ok) {
      return {
        success: true,
        botUsername,
        chatTitle: sendData.result?.chat?.title || sendData.result?.chat?.username || chat,
        message: `تهانينا! تم إرسال رسالة الاختبار بنجاح إلى (${botUsername}) في المحادثة!`
      };
    }

    const desc = sendData.description || '';
    let troubleshootHint = '';

    if (sendData.error_code === 403 || desc.includes('blocked') || desc.includes('bot can\'t initiate')) {
      troubleshootHint = `السبب الرئيسي: لم تقم ببدء المحادثة مع البوت! ادخل إلى ${botUsername} في تيليجرام واضغط على زر "Start" أو أرسل كلمة /start، ثم جرب الإرسال مجدداً.`;
    } else if (sendData.error_code === 400 && desc.includes('chat not found')) {
      troubleshootHint = `معرف المحادثة (${chat}) غير موجود. إذا كانت قناة أو مجموعة، تأكد من إضافة البوت كـ Admin فيها أولاً. أما إذا كان حساب شخصي، تأكد من نسخه بدقة من @userinfobot.`;
    } else if (sendData.error_code === 400 && desc.includes('user not found')) {
      troubleshootHint = 'المستخدم غير موجود. تأكد من كتابة الـ Chat ID كأرقام فقط (مثال: 123456789).';
    } else {
      troubleshootHint = `خطأ من تيليجرام: ${desc}`;
    }

    return {
      success: false,
      errorCode: sendData.error_code,
      botUsername,
      message: `فشل إرسال الرسالة: ${desc}`,
      troubleshootHint
    };
  } catch (err: any) {
    return {
      success: false,
      botUsername,
      message: `خطأ في الشبكة أثناء إرسال رسالة الاختبار: ${err.message}`,
      troubleshootHint: 'تأكد من استقرار الإنترنت.'
    };
  }
}
