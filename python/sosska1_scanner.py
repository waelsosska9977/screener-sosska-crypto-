#!/usr/bin/env python3
"""
=============================================================================
SOSSKA1 Quantitative Trading Scanner (Binance Futures USDT Pairs)
=============================================================================
Author: Quantitative Trading Engineer
Strategy: SOSSKA1 Dual-Direction Momentum & Breakout Strategy
Version: 1.0.0 (Production-Ready)
Platform: Binance USDT-M Futures (العقود الآجلة)
Timeframe: 15m

CORE ARCHITECTURE:
1. Macro Market Regime:
   - BTC/USDT evaluated on 15m timeframe against EMA(100).
   - BULLISH (BTC Close > EMA 100) -> Scans strictly for LONG setups.
   - BEARISH (BTC Close < EMA 100) -> Scans strictly for SHORT setups.

2. Signal Pipeline (15m Candle Close):
   - LONG Setup (when BTC Bullish):
     * Fresh Crossover: EMA(5) crosses above EMA(15)
     * Trend Baseline: Close > EMA(50)
     * Volume Spike: Volume >= 1.4 * SMA(Volume, 20)
     * Healthy Momentum: 52 <= RSI(14) <= 68
   - SHORT Setup (when BTC Bearish):
     * Fresh Crossover: EMA(5) crosses below EMA(15)
     * Trend Baseline: Close < EMA(50)
     * Volume Spike: Volume >= 1.4 * SMA(Volume, 20)
     * Healthy Momentum: 32 <= RSI(14) <= 48

3. Dynamic ATR Risk Management:
   - LONG:  SL = Entry - (1.8 * ATR) | TP1 = Entry + (2.5 * ATR) | TP2 = Entry + (5.0 * ATR)
   - SHORT: SL = Entry + (1.8 * ATR) | TP1 = Entry - (2.5 * ATR) | TP2 = Entry - (5.0 * ATR)

4. Anti-Spam Cache & Delivery:
   - 90-minute cooldown cache per (symbol, direction) to prevent alert flooding.
   - Rich Markdown Telegram alerts with actionable targets and metrics.
   - Resilient continuous execution every 15 minutes.
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

# Load local environment variables from .env
load_dotenv()

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("sosska1_scanner.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("SOSSKA1")

# =============================================================================
# STRATEGY CONSTANTS & SETTINGS
# =============================================================================
CONFIG = {
    # Binance API Credentials (optional for public market reading)
    "BINANCE_API_KEY": os.getenv("BINANCE_API_KEY", ""),
    "BINANCE_SECRET_KEY": os.getenv("BINANCE_SECRET_KEY", ""),

    # Telegram Credentials
    "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN", "8763950020:AAHwxNoRNjdyKzr-EqbrpOlJ2ixaQqiQD_4"),
    "TELEGRAM_CHAT_ID": os.getenv("TELEGRAM_CHAT_ID", "1076270331"),

    # Strategy Parameters
    "TIMEFRAME": "15m",
    "SCAN_INTERVAL_MINUTES": int(os.getenv("SCAN_INTERVAL_MINUTES", "15")),
    "MACRO_SYMBOL": "BTC/USDT:USDT",  # Futures standard CCXT symbol
    "MACRO_BTC_EMA": 100,

    # Indicator Periods
    "EMA_FAST": 5,
    "EMA_SLOW": 15,
    "EMA_TREND": 50,
    "VOL_SMA_PERIOD": 20,
    "VOL_EXP_RATIO": 1.4,
    "RSI_PERIOD": 14,
    "ATR_PERIOD": 14,

    # RSI Windows
    "RSI_LONG_MIN": 52.0,
    "RSI_LONG_MAX": 68.0,
    "RSI_SHORT_MIN": 32.0,
    "RSI_SHORT_MAX": 48.0,

    # ATR Multipliers
    "ATR_SL_MULT": 1.8,
    "ATR_TP1_MULT": 2.5,
    "ATR_TP2_MULT": 5.0,

    # Market Selection
    "MIN_24H_VOLUME_USDT": float(os.getenv("MIN_24H_VOLUME_USDT", "5000000")), # $5M daily volume filter
    "EXCLUDE_SYMBOLS": ["USDC/USDT:USDT", "FDUSD/USDT:USDT", "BTCDOM/USDT:USDT"],

    # Anti-Spam Cache
    "COOLDOWN_MINUTES": int(os.getenv("COOLDOWN_MINUTES", "90")),
    "CACHE_FILE": "sosska1_cache.json",

    # Sensitivity Mode: BALANCED (default), AGGRESSIVE (high frequency), CONSERVATIVE (strict)
    "SENSITIVITY_MODE": os.getenv("SENSITIVITY_MODE", "BALANCED")
}

# Auto-load config.json if present (exported from web app)
if os.path.exists("config.json"):
    try:
        with open("config.json", "r", encoding="utf-8") as _f:
            _ucfg = json.load(_f)
            if _ucfg.get("botToken") and not CONFIG["TELEGRAM_BOT_TOKEN"]:
                CONFIG["TELEGRAM_BOT_TOKEN"] = _ucfg["botToken"]
            if _ucfg.get("chatId") and not CONFIG["TELEGRAM_CHAT_ID"]:
                CONFIG["TELEGRAM_CHAT_ID"] = _ucfg["chatId"]
            logger.info("Loaded Telegram credentials from local config.json")
    except Exception as _e:
        logger.warning(f"Failed to read config.json: {_e}")


def fmt_price(val: float) -> str:
    """Format crypto prices cleanly across all magnitude ranges."""
    if val is None or np.isnan(val):
        return "$0.00"
    if val >= 1000:
        return f"${val:,.2f}"
    elif val >= 1:
        return f"${val:.4f}"
    elif val >= 0.01:
        return f"${val:.4f}"
    elif val >= 0.0001:
        return f"${val:.6f}"
    else:
        return f"${val:.8f}"


# =============================================================================
# TELEGRAM NOTIFIER
# =============================================================================
class TelegramNotifier:
    """Delivers cleanly formatted markdown alerts to Telegram with helpful diagnostic logging."""

    def __init__(self, token: str, chat_id: str):
        self.token = token.strip()
        self.chat_id = chat_id.strip()
        self.api_url = f"https://api.telegram.org/bot{self.token}/sendMessage"

    @property
    def is_ready(self) -> bool:
        return bool(self.token and self.chat_id)

    def send_alert(self, text: str) -> bool:
        if not self.is_ready:
            logger.warning("[Telegram] Missing Bot Token or Chat ID! Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env or config.json.")
            return False

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }

        try:
            res = requests.post(self.api_url, json=payload, timeout=10)
            if res.status_code == 200:
                logger.info("[Telegram] Alert sent successfully to chat.")
                return True
            else:
                body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                desc = body.get("description", res.text)
                
                if res.status_code == 403:
                    logger.error("[Telegram 403] BOT NOT STARTED: The recipient has NOT started a chat with this bot! Please open Telegram, search for your bot, and press 'START' or send /start.")
                elif res.status_code == 400 and "chat not found" in desc.lower():
                    logger.error(f"[Telegram 400] CHAT NOT FOUND: Chat ID '{self.chat_id}' was not found. If this is a channel/group, make sure the bot is an Administrator with 'Post Messages' permission.")
                elif res.status_code == 401:
                    logger.error("[Telegram 401] INVALID BOT TOKEN: Please verify the token obtained from @BotFather.")
                else:
                    logger.error(f"[Telegram Error {res.status_code}]: {desc}")
                return False
        except Exception as err:
            logger.error(f"[Telegram Connection Failure]: {err}")
            return False

    def build_signal_message(self, sig: Dict[str, Any]) -> str:
        """Constructs a clean, simple, and ultra-readable trading message."""
        direction = sig["direction"]
        is_long = direction == "LONG"
        badge = "🟢 *توصية شراء (LONG)* 🚀" if is_long else "🔴 *توصية بيع (SHORT)* 🔻"
        sl_pct_str = f"{sig['sl_pct']:+.2f}%"
        tp1_pct_str = f"{sig['tp1_pct']:+.2f}%"
        tp2_pct_str = f"{sig['tp2_pct']:+.2f}%"

        fib = sig.get("fibonacci", {})
        fib_618 = fib.get("fib_618")
        fib_str = f" | ★ الفيبو (0.618): `{fmt_price(fib_618)}`" if fib_618 else ""

        lines = [
            f"{badge}",
            f"💎 *العملة:* `{sig['clean_symbol']}` (Binance Futures)",
            "━━━━━━━━━━━━━━━━━━━━",
            f"💰 *سعر الدخول (Entry):* `{fmt_price(sig['entry'])}`",
            f"🛑 *وقف الخسارة (Stop Loss):* `{fmt_price(sig['sl'])}` ({sl_pct_str})",
            f"🎯 *الهدف الأول (Take Profit 1):* `{fmt_price(sig['tp1'])}` ({tp1_pct_str})",
            f"🏆 *الهدف الثاني (Take Profit 2):* `{fmt_price(sig['tp2'])}` ({tp2_pct_str})",
            "━━━━━━━━━━━━━━━━━━━━",
            f"⏱ *الفريم:* `{sig['timeframe']}`{fib_str}",
            "⚡ *إشارة مؤكدة تلقائياً عبر ماسح SOSSKA1*"
        ]
        return "\n".join(lines)


# =============================================================================
# COOLDOWN CACHE SYSTEM (ANTI-SPAM 90 MINUTES)
# =============================================================================
class AntiSpamCache:
    """Maintains a persistent 90-minute cooldown per (symbol, direction)."""

    def __init__(self, filename: str = CONFIG["CACHE_FILE"], cooldown_minutes: int = CONFIG["COOLDOWN_MINUTES"]):
        self.filename = filename
        self.cooldown_seconds = cooldown_minutes * 60
        self.cache: Dict[str, float] = self._load()

    def _load(self) -> Dict[str, float]:
        if os.path.exists(self.filename):
            try:
                with open(self.filename, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    now = time.time()
                    # Clean expired keys on startup
                    return {k: v for k, v in data.items() if now - v < self.cooldown_seconds}
            except Exception as e:
                logger.warning(f"[Cache] Unable to read cache file: {e}")
        return {}

    def _save(self):
        try:
            with open(self.filename, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            logger.error(f"[Cache] Unable to write cache file: {e}")

    def is_cooldown_active(self, symbol: str, direction: str) -> Tuple[bool, float]:
        key = f"{symbol}:{direction}"
        now = time.time()
        if key in self.cache:
            elapsed = now - self.cache[key]
            if elapsed < self.cooldown_seconds:
                remaining = (self.cooldown_seconds - elapsed) / 60
                return True, remaining
            else:
                del self.cache[key]
                self._save()
        return False, 0.0

    def register_alert(self, symbol: str, direction: str):
        key = f"{symbol}:{direction}"
        self.cache[key] = time.time()
        self._save()


# =============================================================================
# VECTORIZED TECHNICAL ANALYSIS (NUMPY / PANDAS)
# =============================================================================
class TechnicalIndicators:
    """Calculates all strategy indicators cleanly without TA-Lib binary dependencies."""

    @staticmethod
    def calc_ema(series: pd.Series, span: int) -> pd.Series:
        return series.ewm(span=span, adjust=False).mean()

    @staticmethod
    def calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        diff = series.diff()
        gain = diff.clip(lower=0)
        loss = -diff.clip(upper=0)

        avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
        avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()

        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50.0)

    @staticmethod
    def calc_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df["high"]
        low = df["low"]
        close = df["close"]
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

        return true_range.ewm(com=period - 1, min_periods=period).mean()


# =============================================================================
# SOSSKA1 BINANCE FUTURES SCANNER
# =============================================================================
class Sosska1Scanner:
    """The complete Quantitative Scanner for Binance USDT-M Futures."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        # Initialize Binance Futures CCXT client
        self.exchange = ccxt.binance({
            "apiKey": CONFIG["BINANCE_API_KEY"],
            "secret": CONFIG["BINANCE_SECRET_KEY"],
            "enableRateLimit": True,
            "options": {
                "defaultType": "future",  # Binance USDT-M Futures
                "adjustForTimeDifference": True,
            },
            "timeout": 25000,
        })
        self.notifier = TelegramNotifier(CONFIG["TELEGRAM_BOT_TOKEN"], CONFIG["TELEGRAM_CHAT_ID"])
        self.cache = AntiSpamCache()

    def get_macro_market_regime(self) -> Tuple[Optional[str], Dict[str, Any]]:
        """
        RULE 1: Macro Market Regime Check.
        Examines BTC/USDT on 15m.
        - If BTC close > EMA(100) -> BULLISH (Scan LONG only)
        - If BTC close < EMA(100) -> BEARISH (Scan SHORT only)
        """
        candidates = [CONFIG["MACRO_SYMBOL"], "BTC/USDT", "BTCUSDT"]
        ohlcv = None
        used_symbol = candidates[0]

        for s in candidates:
            try:
                ohlcv = self.exchange.fetch_ohlcv(s, timeframe=CONFIG["TIMEFRAME"], limit=150)
                if ohlcv and len(ohlcv) >= 110:
                    used_symbol = s
                    break
            except Exception:
                continue

        if not ohlcv or len(ohlcv) < 110:
            logger.error("[Macro Check] Unable to fetch BTC OHLCV data.")
            return None, {"error": "Failed to fetch BTC candles"}

        df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        ema100 = TechnicalIndicators.calc_ema(df["close"], CONFIG["MACRO_BTC_EMA"])

        btc_close = df["close"].iloc[-1]
        btc_ema = ema100.iloc[-1]
        diff_pct = ((btc_close - btc_ema) / btc_ema) * 100

        if btc_close > btc_ema:
            regime = "BULLISH"
            logger.info(
                f"🟢 [MACRO REGIME: BULLISH] BTC/USDT ({btc_close:,.1f} USDT) > EMA100 ({btc_ema:,.1f} USDT) [{diff_pct:+.2f}%]. "
                f"-> SEARCHING FOR 'LONG' SETUPS ONLY."
            )
        else:
            regime = "BEARISH"
            logger.info(
                f"🔴 [MACRO REGIME: BEARISH] BTC/USDT ({btc_close:,.1f} USDT) < EMA100 ({btc_ema:,.1f} USDT) [{diff_pct:+.2f}%]. "
                f"-> SEARCHING FOR 'SHORT' SETUPS ONLY."
            )

        details = {
            "regime": regime,
            "btc_price": btc_close,
            "btc_ema100": btc_ema,
            "diff_pct": diff_pct,
            "symbol": used_symbol,
            "timeframe": CONFIG["TIMEFRAME"]
        }
        return regime, details

    def fetch_active_futures_pairs(self, custom_pairs: Optional[List[str]] = None) -> List[str]:
        """Fetches active USDT-M Perpetual Futures pairs sorted by 24h trading volume."""
        if custom_pairs:
            return [p.strip() for p in custom_pairs if p.strip()]

        logger.info("[Market Discovery] Querying Binance Futures active markets...")
        try:
            tickers = self.exchange.fetch_tickers()
            eligible = []

            for symbol, ticker in tickers.items():
                # Filter for USDT futures (e.g. BTC/USDT:USDT or ETH/USDT:USDT)
                if "/USDT" not in symbol:
                    continue
                if symbol in CONFIG["EXCLUDE_SYMBOLS"] or any(ex in symbol for ex in ["USDC", "FDUSD", "BTCDOM"]):
                    continue

                quote_vol = ticker.get("quoteVolume") or 0.0
                if quote_vol >= CONFIG["MIN_24H_VOLUME_USDT"]:
                    eligible.append((symbol, quote_vol))

            eligible.sort(key=lambda x: x[1], reverse=True)
            symbols = [item[0] for item in eligible]
            logger.info(f"[Market Discovery] Found {len(symbols)} high-liquidity USDT Futures pairs to analyze.")
            return symbols

        except Exception as err:
            logger.error(f"[Market Discovery] Failed to retrieve tickers: {err}")
            return []

    def evaluate_pair(self, symbol: str, regime: str, macro_details: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        RULE 2 & 3: Evaluates a candidate pair for SOSSKA1 LONG or SHORT breakout criteria.
        """
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe=CONFIG["TIMEFRAME"], limit=80)
            if not ohlcv or len(ohlcv) < 60:
                return None

            df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])

            # Compute technical indicators
            df["ema5"] = TechnicalIndicators.calc_ema(df["close"], CONFIG["EMA_FAST"])
            df["ema15"] = TechnicalIndicators.calc_ema(df["close"], CONFIG["EMA_SLOW"])
            df["ema50"] = TechnicalIndicators.calc_ema(df["close"], CONFIG["EMA_TREND"])
            df["vol_sma20"] = df["volume"].rolling(CONFIG["VOL_SMA_PERIOD"]).mean()
            df["rsi"] = TechnicalIndicators.calc_rsi(df["close"], CONFIG["RSI_PERIOD"])
            df["atr"] = TechnicalIndicators.calc_atr(df, CONFIG["ATR_PERIOD"])

            curr = df.iloc[-1]
            prev = df.iloc[-2]

            close = curr["close"]
            volume = curr["volume"]
            vol_sma20 = curr["vol_sma20"]
            rsi = curr["rsi"]
            atr = curr["atr"]

            if vol_sma20 <= 0 or np.isnan(atr) or atr <= 0:
                return None

            # Multi-bar volume & sensitivity logic
            prev_vol_ratio = (prev["volume"] / prev["vol_sma20"]) if prev.get("vol_sma20", 0) > 0 else 0
            effective_vol_ratio = max(vol_ratio, prev_vol_ratio * 0.95)

            sensitivity = CONFIG.get("SENSITIVITY_MODE", "BALANCED").upper()
            if sensitivity == "AGGRESSIVE":
                min_vol = 1.05
                rsi_l_min, rsi_l_max = 38.0, 78.0
                rsi_s_min, rsi_s_max = 22.0, 62.0
                lookback = 4
            elif sensitivity == "BALANCED":
                min_vol = 1.15
                rsi_l_min, rsi_l_max = 44.0, 74.0
                rsi_s_min, rsi_s_max = 26.0, 56.0
                lookback = 3
            else:
                min_vol = CONFIG["VOL_EXP_RATIO"]
                rsi_l_min, rsi_l_max = CONFIG["RSI_LONG_MIN"], CONFIG["RSI_LONG_MAX"]
                rsi_s_min, rsi_s_max = CONFIG["RSI_SHORT_MIN"], CONFIG["RSI_SHORT_MAX"]
                lookback = 1

            # Check recent crossover across lookback bars
            recent_cross_up = any(
                df["ema5"].iloc[-k] >= df["ema15"].iloc[-k] and df["ema5"].iloc[-k-1] <= df["ema15"].iloc[-k-1]
                for k in range(1, min(lookback + 1, len(df) - 1))
            ) or (curr["ema5"] > curr["ema15"] and curr["ema15"] > curr["ema50"])

            recent_cross_down = any(
                df["ema5"].iloc[-k] <= df["ema15"].iloc[-k] and df["ema5"].iloc[-k-1] >= df["ema15"].iloc[-k-1]
                for k in range(1, min(lookback + 1, len(df) - 1))
            ) or (curr["ema5"] < curr["ema15"] and curr["ema15"] < curr["ema50"])

            # Compute Auto Fibonacci Retracement Levels (fib_len = 20)
            fib_len = 20
            hi_fib = float(df["high"].rolling(fib_len).max().iloc[-1])
            lo_fib = float(df["low"].rolling(fib_len).min().iloc[-1])
            fib_range = max(hi_fib - lo_fib, 1e-8)

            fib_618 = hi_fib - (fib_range * 0.618)
            fib_500 = hi_fib - (fib_range * 0.500)
            fib_382 = hi_fib - (fib_range * 0.382)
            fib_786 = hi_fib - (fib_range * 0.786)
            fib_886 = hi_fib - (fib_range * 0.886)
            fib_ext1272 = hi_fib + (fib_range * 0.272)
            fib_ext1618 = hi_fib + (fib_range * 0.618)

            # -------------------------------------------------------------
            # CONDITION CHECK: LONG
            # -------------------------------------------------------------
            if regime == "BULLISH" or (sensitivity == "AGGRESSIVE" and curr["ema5"] > curr["ema15"] and close > curr["ema50"]):
                price_trend_ok = close >= curr["ema50"] * 0.998
                vol_ok = effective_vol_ratio >= min_vol
                rsi_ok = rsi_l_min <= rsi <= rsi_l_max

                if recent_cross_up and price_trend_ok and vol_ok and rsi_ok:
                    # Risk Management Targets for LONG
                    sl = close - (CONFIG["ATR_SL_MULT"] * atr)
                    tp1 = close + (CONFIG["ATR_TP1_MULT"] * atr)
                    tp2 = close + (CONFIG["ATR_TP2_MULT"] * atr)

                    sl_pct = ((sl - close) / close) * 100
                    tp1_pct = ((tp1 - close) / close) * 100
                    tp2_pct = ((tp2 - close) / close) * 100

                    clean_name = symbol.split(":")[0] if ":" in symbol else symbol

                    fib_data = {
                        "swing_high": hi_fib,
                        "swing_low": lo_fib,
                        "fib_range": fib_range,
                        "fib_618": fib_618,
                        "fib_500": fib_500,
                        "fib_382": fib_382,
                        "fib_786": fib_786,
                        "fib_886": fib_886,
                        "fib_ext1272": fib_ext1272,
                        "fib_ext1618": fib_ext1618,
                        "buy_zone_desc": f"ارتداد النسبة الذهبية OTE ({fmt_price(fib_886)} إلى {fmt_price(fib_618)}) أو اختراق {fmt_price(fib_382)}",
                        "sell_zone_desc": f"الهدف 1: قمة الضلع {fmt_price(hi_fib)} | الهدف 2: {fmt_price(fib_ext1272)} | الهدف الذهبي: {fmt_price(fib_ext1618)}"
                    }

                    return {
                        "symbol": symbol,
                        "clean_symbol": clean_name,
                        "direction": "LONG",
                        "timeframe": CONFIG["TIMEFRAME"],
                        "entry": close,
                        "sl": sl,
                        "tp1": tp1,
                        "tp2": tp2,
                        "sl_pct": sl_pct,
                        "tp1_pct": tp1_pct,
                        "tp2_pct": tp2_pct,
                        "vol_ratio": effective_vol_ratio,
                        "rsi": rsi,
                        "rsi_range": f"{rsi_l_min:.0f}-{rsi_l_max:.0f}",
                        "atr": atr,
                        "ema5": curr["ema5"],
                        "ema15": curr["ema15"],
                        "ema50": curr["ema50"],
                        "fibonacci": fib_data,
                        "macro_status": "BULLISH (صاعد)",
                        "btc_price": macro_details["btc_price"],
                        "btc_ema": macro_details["btc_ema100"],
                        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    }

            # -------------------------------------------------------------
            # CONDITION CHECK: SHORT
            # -------------------------------------------------------------
            if regime == "BEARISH" or (sensitivity == "AGGRESSIVE" and curr["ema5"] < curr["ema15"] and close < curr["ema50"]):
                price_trend_ok = close <= curr["ema50"] * 1.002
                vol_ok = effective_vol_ratio >= min_vol
                rsi_ok = rsi_s_min <= rsi <= rsi_s_max

                if recent_cross_down and price_trend_ok and vol_ok and rsi_ok:
                    # Risk Management Targets for SHORT
                    sl = close + (CONFIG["ATR_SL_MULT"] * atr)
                    tp1 = close - (CONFIG["ATR_TP1_MULT"] * atr)
                    tp2 = close - (CONFIG["ATR_TP2_MULT"] * atr)

                    sl_pct = ((sl - close) / close) * 100
                    tp1_pct = ((tp1 - close) / close) * 100
                    tp2_pct = ((tp2 - close) / close) * 100

                    clean_name = symbol.split(":")[0] if ":" in symbol else symbol

                    short_fib_618 = lo_fib + (fib_range * 0.618)
                    short_fib_500 = lo_fib + (fib_range * 0.500)
                    short_fib_382 = lo_fib + (fib_range * 0.382)
                    short_ext1618 = lo_fib - (fib_range * 0.618)

                    fib_data = {
                        "swing_high": hi_fib,
                        "swing_low": lo_fib,
                        "fib_range": fib_range,
                        "fib_618": short_fib_618,
                        "fib_500": short_fib_500,
                        "fib_382": short_fib_382,
                        "fib_786": lo_fib + (fib_range * 0.786),
                        "fib_886": lo_fib + (fib_range * 0.886),
                        "fib_ext1272": lo_fib - (fib_range * 0.272),
                        "fib_ext1618": short_ext1618,
                        "buy_zone_desc": f"إغلاق الشورت عند قاع الضلع {fmt_price(lo_fib)} والامتداد {fmt_price(short_ext1618)}",
                        "sell_zone_desc": f"الارتداد للنسبة الذهبية OTE ({fmt_price(short_fib_500)} إلى {fmt_price(short_fib_618)})"
                    }

                    return {
                        "symbol": symbol,
                        "clean_symbol": clean_name,
                        "direction": "SHORT",
                        "timeframe": CONFIG["TIMEFRAME"],
                        "entry": close,
                        "sl": sl,
                        "tp1": tp1,
                        "tp2": tp2,
                        "sl_pct": sl_pct,
                        "tp1_pct": tp1_pct,
                        "tp2_pct": tp2_pct,
                        "vol_ratio": effective_vol_ratio,
                        "rsi": rsi,
                        "rsi_range": f"{rsi_s_min:.0f}-{rsi_s_max:.0f}",
                        "atr": atr,
                        "ema5": curr["ema5"],
                        "ema15": curr["ema15"],
                        "ema50": curr["ema50"],
                        "fibonacci": fib_data,
                        "macro_status": "BEARISH (هابط)",
                        "btc_price": macro_details["btc_price"],
                        "btc_ema": macro_details["btc_ema100"],
                    }

            return None

        except Exception as err:
            logger.debug(f"[Analyzer] Skip {symbol} due to evaluation error: {err}")
            return None

    def execute_scan_cycle(self, custom_pairs: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Runs a complete scanning round."""
        logger.info("━" * 60)
        logger.info(f"🔍 Starting SOSSKA1 Scan Round at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info("━" * 60)

        # Step 1: Macro BTC Regime
        regime, macro_details = self.get_macro_market_regime()
        if not regime:
            logger.warning("⚠️ Skipping scan round due to macro evaluation failure.")
            return []

        # Step 2: Pairs discovery
        pairs = self.fetch_active_futures_pairs(custom_pairs)
        if not pairs:
            logger.warning("No eligible pairs found.")
            return []

        confirmed_signals = []

        # Step 3: Iterate through pairs
        for sym in pairs:
            # Check 90-minute cooldown
            in_cd, remain = self.cache.is_cooldown_active(sym, regime)
            if in_cd:
                logger.debug(f"[Cooldown] {sym} ({regime}) is in cooldown: {remain:.1f} mins left.")
                continue

            sig = self.evaluate_pair(sym, regime, macro_details)
            if sig:
                logger.info(
                    f"🎯 [SIGNAL FOUND] {sig['direction']} on {sig['clean_symbol']} | "
                    f"Entry: {sig['entry']:.4f} USDT | Vol: {sig['vol_ratio']:.2f}x | RSI: {sig['rsi']:.1f}"
                )
                confirmed_signals.append(sig)

                # Send Telegram Notification
                msg = self.notifier.build_signal_message(sig)
                if not self.dry_run:
                    sent = self.notifier.send_alert(msg)
                    if sent:
                        self.cache.register_alert(sym, sig["direction"])
                else:
                    logger.info("[Dry Run] Telegram alert simulated (not sent). Content:")
                    logger.info(f"\n{msg}\n")
                    self.cache.register_alert(sym, sig["direction"])

            # Polite pacing to respect Binance rate limits
            time.sleep(0.06)

        logger.info(f"🏁 [Round Finished] Analyzed {len(pairs)} pairs. Detected {len(confirmed_signals)} valid signals.")
        return confirmed_signals


# =============================================================================
# COMMAND LINE INTERFACE & DAEMON SCHEDULER
# =============================================================================
def parse_args():
    parser = argparse.ArgumentParser(
        description="SOSSKA1 Binance Futures Breakout & Momentum Quantitative Scanner"
    )
    parser.add_argument("--once", action="store_true", help="Execute single scan iteration and exit")
    parser.add_argument("--dry-run", action="store_true", help="Log signals without dispatching real Telegram messages")
    parser.add_argument("--test-telegram", action="store_true", help="Send a test message to verify Telegram setup")
    parser.add_argument("--pairs", type=str, default="", help="Comma-separated symbols (e.g. BTC/USDT,SOL/USDT)")
    parser.add_argument("--min-volume", type=float, default=None, help="Override minimum 24h volume threshold (USDT)")
    parser.add_argument("--interval", type=int, default=None, help="Override interval between scans in minutes (default 15)")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.min_volume:
        CONFIG["MIN_24H_VOLUME_USDT"] = args.min_volume
    if args.interval:
        CONFIG["SCAN_INTERVAL_MINUTES"] = args.interval

    scanner = Sosska1Scanner(dry_run=args.dry_run)

    # Test Telegram delivery if requested
    if args.test_telegram:
        logger.info("[Telegram Test] Sending connection test to Telegram...")
        test_txt = (
            "🤖 *تجربة ربط بوت التنبيهات (SOSSKA1 Futures Scanner)*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "✅ تم الاتصال بنجاح مع تيليجرام!\n"
            "🎯 نظام مسح عقود بينانس الآجلة (Futures) جاهز للعمل في الاتجاهين (LONG & SHORT).\n"
            f"🕒 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
        )
        ok = scanner.notifier.send_alert(test_txt)
        if ok:
            logger.info("✅ Telegram test succeeded!")
            sys.exit(0)
        else:
            logger.error("❌ Telegram test failed. Please verify TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")
            sys.exit(1)

    custom_pairs = [p.strip() for p in args.pairs.split(",")] if args.pairs else None

    # Single-run execution
    if args.once:
        scanner.execute_scan_cycle(custom_pairs=custom_pairs)
        return

    # Continuous 15-minute loop
    logger.info(f"🔄 Starting SOSSKA1 Continuous Scanner Loop (Every {CONFIG['SCAN_INTERVAL_MINUTES']} minutes)...")
    logger.info("Press Ctrl+C to terminate.")

    while True:
        try:
            start_ts = time.time()
            scanner.execute_scan_cycle(custom_pairs=custom_pairs)
            elapsed = time.time() - start_ts

            sleep_duration = max(10, (CONFIG["SCAN_INTERVAL_MINUTES"] * 60) - elapsed)
            logger.info(f"💤 Sleeping for {sleep_duration / 60:.1f} minutes until next 15m candle scan...")
            time.sleep(sleep_duration)

        except KeyboardInterrupt:
            logger.info("\n🛑 User initiated termination. Exiting gracefully...")
            break
        except Exception as err:
            logger.critical(f"⚠️ Unexpected exception in main loop: {err}", exc_info=True)
            logger.info("Waiting 60 seconds before auto-recovering...")
            time.sleep(60)


if __name__ == "__main__":
    main()
