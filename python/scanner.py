#!/usr/bin/env python3
"""
=============================================================================
Binance Quantitative Breakout Scanner with Telegram Alerts & BTC Macro Filter
=============================================================================
Author: Quantitative Trading Engineer
Version: 1.0.0 (Production-Ready)
Platform: Binance Spot (USDT Pairs)

Strategy Overview:
1. Macro Bitcoin Filter:
   - BTC/USDT must be strictly above EMA 100 on BOTH 15m and 1h timeframes.
   - If BTC is bearish, the entire scan is paused to avoid market bull traps.
2. Pair Sniper Criteria (15m Timeframe):
   - Bullish Trend: EMA 5 > EMA 15 (fresh cross) and Price > EMA 50.
   - Bollinger Squeeze Breakout: Bandwidth expansion after compression + solid candle body.
   - Volume Confirmation: Volume > 1.5 * SMA(Volume, 20).
   - Healthy Momentum: 52 <= RSI(14) <= 68 (momentum without overbought exhaustion).
3. Dynamic Risk Management:
   - Stop Loss (SL) = Entry - (1.8 * ATR 14)
   - Take Profit 1 (TP1) = Entry + (2.5 * ATR 14) [R:R ~ 1:1.39]
   - Take Profit 2 (TP2) = Entry + (5.0 * ATR 14) [R:R ~ 1:2.78]
4. Anti-Spam Cooldown:
   - 90 minutes cooldown cache per pair to prevent notification flooding.
   - Built with CCXT enableRateLimit=True and automated 15-minute scheduling.
=============================================================================
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import ccxt
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scanner.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("QuantBreakoutScanner")

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================
CONFIG = {
    # Binance API Settings
    "BINANCE_API_KEY": os.getenv("BINANCE_API_KEY", ""),
    "BINANCE_SECRET_KEY": os.getenv("BINANCE_SECRET_KEY", ""),
    
    # Telegram Settings
    "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN", ""),
    "TELEGRAM_CHAT_ID": os.getenv("TELEGRAM_CHAT_ID", ""),
    
    # Strategy Timeframes & Parameters
    "SCAN_INTERVAL_MINUTES": int(os.getenv("SCAN_INTERVAL_MINUTES", "15")),
    "TIMEFRAME": os.getenv("TIMEFRAME", "15m"),
    "MACRO_TIMEFRAMES": ["15m", "1h"],
    "MACRO_BTC_EMA": 100,
    
    # Pair Selection
    "QUOTE_CURRENCY": "USDT",
    "MIN_24H_VOLUME_USDT": float(os.getenv("MIN_24H_VOLUME_USDT", "3000000")), # $3M min daily volume
    "EXCLUDE_SYMBOLS": ["USDC/USDT", "FDUSD/USDT", "TUSD/USDT", "BUSD/USDT", "EUR/USDT"],
    
    # Indicator Parameters
    "EMA_FAST": 5,
    "EMA_SLOW": 15,
    "EMA_BASELINE": 50,
    "BB_PERIOD": 20,
    "BB_STD": 2.0,
    "BB_SQUEEZE_LOOKBACK": 20,
    "VOLUME_SMA_PERIOD": 20,
    "VOLUME_EXPLOSION_MULT": 1.5,
    "RSI_PERIOD": 14,
    "RSI_MIN": 52.0,
    "RSI_MAX": 68.0,
    "ATR_PERIOD": 14,
    "SL_ATR_MULT": 1.8,
    "TP1_ATR_MULT": 2.5,
    "TP2_ATR_MULT": 5.0,
    
    # Candle Quality Filter
    "MIN_BODY_RATIO": 0.45,  # (abs(close - open) / (high - low)) must be >= 45% (avoids dojis/wick rejections)
    "MIN_UPPER_CLOSE_RATIO": 0.60, # (close - low) / (high - low) must close in upper 40% of candle
    
    # Cooldown Cache
    "COOLDOWN_MINUTES": int(os.getenv("COOLDOWN_MINUTES", "90")),
    "CACHE_FILE": "alert_cache.json"
}


# =============================================================================
# TELEGRAM NOTIFIER
# =============================================================================
class TelegramNotifier:
    """Handles Telegram alerts with rate limits and Markdown formatting."""

    def __init__(self, token: str, chat_id: str):
        self.token = token.strip()
        self.chat_id = chat_id.strip()
        self.base_url = f"https://api.telegram.org/bot{self.token}/sendMessage"

    @property
    def is_configured(self) -> bool:
        return bool(self.token and self.chat_id)

    def send_message(self, text: str, parse_mode: str = "Markdown") -> bool:
        if not self.is_configured:
            logger.warning("[Telegram] Not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID).")
            return False

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }

        try:
            resp = requests.post(self.base_url, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("[Telegram] Alert sent successfully.")
                return True
            else:
                logger.error(f"[Telegram] Failed to send message: HTTP {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            logger.error(f"[Telegram] Network error sending message: {e}")
            return False

    def format_breakout_alert(self, data: Dict[str, Any]) -> str:
        """
        Formats breakout signal in clean, professional Arabic/English Markdown.
        """
        rr1 = round(CONFIG["TP1_ATR_MULT"] / CONFIG["SL_ATR_MULT"], 2)
        rr2 = round(CONFIG["TP2_ATR_MULT"] / CONFIG["SL_ATR_MULT"], 2)

        msg = (
            f"🚀 *إشارة اختراق وانفجار سعري مؤكدة* 🎯\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💎 *الزوج:* `{data['symbol']}`\n"
            f"⏱ *الإطار الزمني:* `{data['timeframe']}`\n"
            f"💰 *سعر الدخول الحالي:* `${data['entry']:.4f}`\n\n"
            
            f"🛡 *إدارة المخاطر (Dynamic ATR {CONFIG['ATR_PERIOD']}):*\n"
            f"🛑 *وقف الخسارة (SL):* `${data['stop_loss']:.4f}` `(-{data['sl_pct']:.2f}%)`\n"
            f"🎯 *الهدف الأول (TP1):* `${data['tp1']:.4f}` `(+{data['tp1_pct']:.2f}% | R:R 1:{rr1})`\n"
            f"🏆 *الهدف الثاني (TP2):* `${data['tp2']:.4f}` `(+{data['tp2_pct']:.2f}% | R:R 1:{rr2})`\n\n"
            
            f"📊 *المؤشرات الفنية للقنص:*\n"
            f"⚡ *انفجار الحجم (Volume):* `{data['vol_mult']:.2f}x` ضعف متوسط 20 شمعة ✅\n"
            f"📈 *الزخم (RSI 14):* `{data['rsi']:.1f}` (نطاق صحي: 52-68) ✅\n"
            f"💥 *انضغاط البولنجر:* Bandwidth `{data['bandwidth']:.2f}%` مع كسر صاعد ✅\n"
            f"🕯 *جسم الشمعة:* نسبة الجسم `{data['body_ratio']:.0f}%` (إغلاق صلب بدون ذيل سلبي) ✅\n"
            f"🔀 *المتوسطات:* EMA 5 (`${data['ema5']:.4f}`) > EMA 15 (`${data['ema15']:.4f}`) > EMA 50 ✅\n\n"
            
            f"👑 *فلتر البيتكوين الحاكم:* صاعد (BTC > EMA 100 على 15m و 1h) ✅\n"
            f"🕒 *توقيت الإشارة:* `{data['timestamp']}` UTC\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *تنبيه:* التزم بإدارة رأس المال وتحديد حجم الصفقة وفق وقف الخسارة."
        )
        return msg


# =============================================================================
# COOLDOWN CACHE
# =============================================================================
class AlertCache:
    """Maintains a persistent 90-minute alert cooldown per pair."""

    def __init__(self, filename: str = CONFIG["CACHE_FILE"], cooldown_minutes: int = CONFIG["COOLDOWN_MINUTES"]):
        self.filename = filename
        self.cooldown_seconds = cooldown_minutes * 60
        self.cache: Dict[str, float] = self._load()

    def _load(self) -> Dict[str, float]:
        if os.path.exists(self.filename):
            try:
                with open(self.filename, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # Clean expired entries on startup
                    now = time.time()
                    return {k: v for k, v in data.items() if now - v < self.cooldown_seconds}
            except Exception as e:
                logger.warning(f"[Cache] Could not load cache file: {e}")
        return {}

    def _save(self):
        try:
            with open(self.filename, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            logger.error(f"[Cache] Failed to save cache file: {e}")

    def is_in_cooldown(self, symbol: str) -> Tuple[bool, float]:
        """Returns (in_cooldown, remaining_minutes)"""
        now = time.time()
        if symbol in self.cache:
            elapsed = now - self.cache[symbol]
            if elapsed < self.cooldown_seconds:
                remaining_min = (self.cooldown_seconds - elapsed) / 60
                return True, remaining_min
            else:
                del self.cache[symbol]
                self._save()
        return False, 0.0

    def record_alert(self, symbol: str):
        self.cache[symbol] = time.time()
        self._save()


# =============================================================================
# TECHNICAL INDICATORS CALCULATION (PURE VECTORIZED PYTHON / PANDAS)
# =============================================================================
class TechnicalAnalysis:
    """Calculates all strategy indicators with zero dependency on TA-Lib."""

    @staticmethod
    def calculate_ema(series: pd.Series, period: int) -> pd.Series:
        return series.ewm(span=period, adjust=False).mean()

    @staticmethod
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        
        avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
        avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
        
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)

    @staticmethod
    def calculate_bollinger_bands(series: pd.Series, period: int = 20, std_dev: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
        middle = series.rolling(window=period).mean()
        std = series.rolling(window=period).std()
        upper = middle + (std_dev * std)
        lower = middle - (std_dev * std)
        bandwidth = (upper - lower) / middle * 100.0  # percentage
        return upper, middle, lower, bandwidth

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df['high']
        low = df['low']
        close = df['close']
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

        atr = tr.ewm(com=period - 1, min_periods=period).mean()
        return atr


# =============================================================================
# QUANTITATIVE BREAKOUT SCANNER ENGINE
# =============================================================================
class BinanceBreakoutScanner:
    """Main scanning engine interacting with Binance via CCXT."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.exchange = ccxt.binance({
            "apiKey": CONFIG["BINANCE_API_KEY"],
            "secret": CONFIG["BINANCE_SECRET_KEY"],
            "enableRateLimit": True,
            "options": {
                "defaultType": "spot",
                "adjustForTimeDifference": True,
            },
            "timeout": 30000,
        })
        self.notifier = TelegramNotifier(CONFIG["TELEGRAM_BOT_TOKEN"], CONFIG["TELEGRAM_CHAT_ID"])
        self.cache = AlertCache()

    def check_macro_btc_filter(self) -> Tuple[bool, Dict[str, Any]]:
        """
        RULE 1: Macro Bitcoin Filter.
        BTC/USDT must be higher than EMA 100 on BOTH 15m and 1h timeframes.
        """
        symbol = "BTC/USDT"
        logger.info(f"[Macro Filter] Checking {symbol} across 15m and 1h for EMA {CONFIG['MACRO_BTC_EMA']}...")

        details = {}
        is_bullish = True

        for tf in CONFIG["MACRO_TIMEFRAMES"]:
            try:
                # Fetch 150 candles to ensure stable EMA 100 calculation
                ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe=tf, limit=150)
                if not ohlcv or len(ohlcv) < 110:
                    logger.error(f"[Macro Filter] Insufficient OHLCV data for {symbol} on {tf}.")
                    return False, {"error": f"Insufficient data on {tf}"}

                df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
                ema100 = TechnicalAnalysis.calculate_ema(df["close"], CONFIG["MACRO_BTC_EMA"])

                current_price = df["close"].iloc[-1]
                current_ema100 = ema100.iloc[-1]
                ratio_pct = ((current_price - current_ema100) / current_ema100) * 100

                tf_bullish = current_price > current_ema100
                details[tf] = {
                    "price": current_price,
                    "ema100": current_ema100,
                    "diff_pct": ratio_pct,
                    "is_bullish": tf_bullish
                }

                if not tf_bullish:
                    is_bullish = False

            except Exception as e:
                logger.error(f"[Macro Filter] Error checking {symbol} on {tf}: {e}")
                return False, {"error": str(e)}

        if is_bullish:
            logger.info(
                f"✅ [Macro BTC PASS] Price is above EMA 100 on both timeframes! "
                f"(15m: ${details['15m']['price']:.1f} vs EMA ${details['15m']['ema100']:.1f} [+ {details['15m']['diff_pct']:.2f}%] | "
                f"1h: ${details['1h']['price']:.1f} vs EMA ${details['1h']['ema100']:.1f} [+ {details['1h']['diff_pct']:.2f}%])"
            )
        else:
            logger.warning(
                f"🛑 [Macro BTC BLOCKED] BTC is below EMA 100! All buy signals disabled to prevent market trap. "
                f"(15m Bullish: {details.get('15m', {}).get('is_bullish')} | "
                f"1h Bullish: {details.get('1h', {}).get('is_bullish')})"
            )

        return is_bullish, details

    def get_candidate_symbols(self, custom_pairs: Optional[List[str]] = None) -> List[str]:
        """Fetches and filters active USDT spot pairs with high 24h trading volume."""
        if custom_pairs:
            return [p.strip().upper() for p in custom_pairs if p.strip()]

        logger.info(f"[Pair Selector] Fetching 24h market tickers from Binance (Min Vol: ${CONFIG['MIN_24H_VOLUME_USDT']:,.0f})...")
        try:
            tickers = self.exchange.fetch_tickers()
            candidates = []

            for symbol, ticker in tickers.items():
                if not symbol.endswith(f"/{CONFIG['QUOTE_CURRENCY']}"):
                    continue
                if symbol in CONFIG["EXCLUDE_SYMBOLS"]:
                    continue

                quote_vol = ticker.get("quoteVolume") or 0.0
                if quote_vol >= CONFIG["MIN_24H_VOLUME_USDT"]:
                    candidates.append((symbol, quote_vol))

            # Sort descending by 24h volume
            candidates.sort(key=lambda x: x[1], reverse=True)
            symbols = [c[0] for c in candidates]
            logger.info(f"[Pair Selector] Found {len(symbols)} active USDT pairs qualifying for scan.")
            return symbols

        except Exception as e:
            logger.error(f"[Pair Selector] Error fetching tickers: {e}")
            return []

    def analyze_pair(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Evaluates a single pair against all breakout criteria:
        1. EMA 5 > EMA 15 & Close > EMA 50
        2. Bollinger Squeeze + Bandwidth expansion + Solid candle body
        3. Volume > 1.5 * SMA(Volume, 20)
        4. RSI(14) between 52 and 68
        5. Dynamic ATR 14 target generation
        """
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe=CONFIG["TIMEFRAME"], limit=80)
            if not ohlcv or len(ohlcv) < 65:
                return None

            df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])

            # Indicators
            df["ema5"] = TechnicalAnalysis.calculate_ema(df["close"], CONFIG["EMA_FAST"])
            df["ema15"] = TechnicalAnalysis.calculate_ema(df["close"], CONFIG["EMA_SLOW"])
            df["ema50"] = TechnicalAnalysis.calculate_ema(df["close"], CONFIG["EMA_BASELINE"])
            
            bb_upper, bb_middle, bb_lower, bb_bandwidth = TechnicalAnalysis.calculate_bollinger_bands(
                df["close"], CONFIG["BB_PERIOD"], CONFIG["BB_STD"]
            )
            df["bb_upper"] = bb_upper
            df["bb_middle"] = bb_middle
            df["bb_lower"] = bb_lower
            df["bb_bandwidth"] = bb_bandwidth

            df["vol_sma20"] = df["volume"].rolling(CONFIG["VOLUME_SMA_PERIOD"]).mean()
            df["rsi"] = TechnicalAnalysis.calculate_rsi(df["close"], CONFIG["RSI_PERIOD"])
            df["atr"] = TechnicalAnalysis.calculate_atr(df, CONFIG["ATR_PERIOD"])

            # We inspect the latest completed candle (iloc[-2]) or current candle (iloc[-1])
            # For real breakout detection, we evaluate iloc[-1] (active bar) with close verification
            curr = df.iloc[-1]
            prev = df.iloc[-2]

            close = curr["close"]
            open_p = curr["open"]
            high = curr["high"]
            low = curr["low"]
            volume = curr["volume"]
            vol_sma20 = curr["vol_sma20"]
            rsi = curr["rsi"]
            atr = curr["atr"]
            bw = curr["bb_bandwidth"]
            prev_bw = prev["bb_bandwidth"]

            # Candle body and wick calculations
            candle_range = max(high - low, 1e-8)
            body_size = abs(close - open_p)
            body_ratio = body_size / candle_range
            upper_close_ratio = (close - low) / candle_range

            # --- Check Condition 1: EMA alignment & bullish crossover ---
            is_bullish_candle = close >= open_p
            ema_cross = (curr["ema5"] > curr["ema15"]) and (close > curr["ema50"])
            # Fresh cross within last 2 bars:
            fresh_ema_cross = (prev["ema5"] <= prev["ema15"] * 1.002) or (curr["ema5"] > curr["ema15"])

            if not (is_bullish_candle and ema_cross and fresh_ema_cross):
                return None

            # --- Check Condition 2: Volume confirmation (> 1.5x SMA 20) ---
            if vol_sma20 <= 0 or (volume < CONFIG["VOLUME_EXPLOSION_MULT"] * vol_sma20):
                return None
            vol_mult = volume / vol_sma20

            # --- Check Condition 3: RSI Momentum in healthy range [52, 68] ---
            if not (CONFIG["RSI_MIN"] <= rsi <= CONFIG["RSI_MAX"]):
                return None

            # --- Check Condition 4: Bollinger Squeeze Breakout & Bandwidth Expansion ---
            # Bollinger Squeeze: Bandwidth was compressed over recent bars
            recent_bw_min = df["bb_bandwidth"].iloc[-CONFIG["BB_SQUEEZE_LOOKBACK"]:-1].min()
            recent_bw_max = df["bb_bandwidth"].iloc[-CONFIG["BB_SQUEEZE_LOOKBACK"]:-1].max()
            
            # Bandwidth is expanding from low values
            bw_expanding = bw > prev_bw
            # Squeeze definition: previous bandwidth was tight or expanding rapidly (> 10% increase)
            squeeze_condition = (prev_bw <= recent_bw_min * 1.35) or (bw > prev_bw * 1.10)

            # Candle breakout: Solid full body closing above middle band or breaking upper band
            breakout_candle = (close > curr["bb_middle"]) and (
                (close >= curr["bb_upper"] * 0.995) or (close > prev["high"])
            )

            # Full candle body check: ensure it's not a long upper shadow rejection
            full_body_ok = (body_ratio >= CONFIG["MIN_BODY_RATIO"]) and (upper_close_ratio >= CONFIG["MIN_UPPER_CLOSE_RATIO"])

            if not (bw_expanding and squeeze_condition and breakout_candle and full_body_ok):
                return None

            # --- Calculate Risk Management Targets (Dynamic ATR 14) ---
            entry_price = close
            sl = entry_price - (CONFIG["SL_ATR_MULT"] * atr)
            tp1 = entry_price + (CONFIG["TP1_ATR_MULT"] * atr)
            tp2 = entry_price + (CONFIG["TP2_ATR_MULT"] * atr)

            sl_pct = ((entry_price - sl) / entry_price) * 100
            tp1_pct = ((tp1 - entry_price) / entry_price) * 100
            tp2_pct = ((tp2 - entry_price) / entry_price) * 100

            timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            return {
                "symbol": symbol,
                "timeframe": CONFIG["TIMEFRAME"],
                "entry": entry_price,
                "stop_loss": sl,
                "tp1": tp1,
                "tp2": tp2,
                "sl_pct": sl_pct,
                "tp1_pct": tp1_pct,
                "tp2_pct": tp2_pct,
                "vol_mult": vol_mult,
                "rsi": rsi,
                "atr": atr,
                "bandwidth": bw,
                "body_ratio": body_ratio * 100,
                "ema5": curr["ema5"],
                "ema15": curr["ema15"],
                "ema50": curr["ema50"],
                "timestamp": timestamp_str
            }

        except Exception as e:
            logger.debug(f"[Analyzer] Error processing {symbol}: {e}")
            return None

    def run_scan(self, custom_pairs: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Executes a complete scanning cycle."""
        logger.info("=" * 60)
        logger.info(f"⚡ Starting New Market Scan at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info("=" * 60)

        # Step 1: Macro BTC Trend Check
        btc_ok, btc_details = self.check_macro_btc_filter()
        if not btc_ok:
            logger.warning("🛑 [ABORT SCAN] BTC Macro Filter failed. Scan cancelled for current cycle.")
            return []

        # Step 2: Retrieve candidate pairs
        symbols = self.get_candidate_symbols(custom_pairs)
        if not symbols:
            logger.warning("[Scanner] No eligible symbols found.")
            return []

        detected_signals = []
        scanned_count = 0

        # Step 3: Scan candidate pairs with rate-limiting
        for symbol in symbols:
            # Skip if symbol is in 90-minute cooldown
            in_cooldown, remaining = self.cache.is_in_cooldown(symbol)
            if in_cooldown:
                logger.debug(f"[Cooldown] Skipping {symbol} (cooldown: {remaining:.1f}m remaining).")
                continue

            signal = self.analyze_pair(symbol)
            scanned_count += 1

            if signal:
                logger.info(
                    f"🎯 [BREAKOUT DETECTED] {signal['symbol']} | Entry: ${signal['entry']:.4f} | "
                    f"Vol: {signal['vol_mult']:.2f}x | RSI: {signal['rsi']:.1f} | SL: ${signal['stop_loss']:.4f}"
                )
                detected_signals.append(signal)

                # Send Telegram Alert
                alert_text = self.notifier.format_breakout_alert(signal)
                if not self.dry_run:
                    sent = self.notifier.send_message(alert_text)
                    if sent:
                        self.cache.record_alert(symbol)
                else:
                    logger.info("[Dry Run] Telegram alert simulated (not sent).")
                    logger.info(f"\n{alert_text}\n")
                    self.cache.record_alert(symbol)

            # Polite pacing between pair scans
            time.sleep(0.08)

        logger.info(
            f"✅ [Scan Complete] Scanned {scanned_count} pairs. Detected {len(detected_signals)} confirmed breakout signals."
        )
        return detected_signals


# =============================================================================
# CLI & SCHEDULER
# =============================================================================
def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Binance Quantitative Breakout Scanner with Telegram Alerts & BTC Macro Filter"
    )
    parser.add_argument("--once", action="store_true", help="Run a single scan iteration and exit")
    parser.add_argument("--dry-run", action="store_true", help="Run without sending real Telegram messages")
    parser.add_argument("--test-telegram", action="store_true", help="Send a test message to verify Telegram config")
    parser.add_argument("--pairs", type=str, default="", help="Comma-separated list of symbols (e.g. BTC/USDT,SOL/USDT)")
    parser.add_argument("--min-volume", type=float, default=None, help="Override minimum 24h quote volume in USDT")
    parser.add_argument("--interval", type=int, default=None, help="Override scan interval in minutes (default 15)")
    return parser.parse_args()


def main():
    args = parse_arguments()

    if args.min_volume:
        CONFIG["MIN_24H_VOLUME_USDT"] = args.min_volume
    if args.interval:
        CONFIG["SCAN_INTERVAL_MINUTES"] = args.interval

    scanner = BinanceBreakoutScanner(dry_run=args.dry_run)

    # Test Telegram connection if requested
    if args.test_telegram:
        logger.info("[Telegram Test] Sending test notification...")
        test_msg = (
            "🤖 *تجربة ربط بوت التنبيهات (Binance Quant Scanner)*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "✅ تم الاتصال بنجاح مع تيليجرام!\n"
            "📊 نظام مسح أزواج USDT جاهز للعمل برصد الفرص.\n"
            f"🕒 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
        )
        success = scanner.notifier.send_message(test_msg)
        if success:
            logger.info("✅ Test notification delivered successfully!")
            sys.exit(0)
        else:
            logger.error("❌ Test notification failed. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")
            sys.exit(1)

    custom_pairs = [p.strip() for p in args.pairs.split(",")] if args.pairs else None

    # Single-run mode
    if args.once:
        scanner.run_scan(custom_pairs=custom_pairs)
        return

    # Continuous 15-minute loop
    logger.info(f"🔄 Starting Continuous Scanning Mode (Interval: {CONFIG['SCAN_INTERVAL_MINUTES']} minutes)...")
    logger.info("Press Ctrl+C to terminate.")

    while True:
        try:
            start_time = time.time()
            scanner.run_scan(custom_pairs=custom_pairs)
            elapsed = time.time() - start_time

            sleep_seconds = max(10, (CONFIG["SCAN_INTERVAL_MINUTES"] * 60) - elapsed)
            logger.info(f"💤 Sleeping for {sleep_seconds / 60:.1f} minutes until next scheduled scan...")
            time.sleep(sleep_seconds)

        except KeyboardInterrupt:
            logger.info("\n🛑 User initiated termination. Exiting gracefully...")
            break
        except Exception as e:
            logger.critical(f"⚠️ Unhandled error in main scan loop: {e}", exc_info=True)
            logger.info("Waiting 60 seconds before retrying...")
            time.sleep(60)


if __name__ == "__main__":
    main()
