export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketRegime = 'BULLISH' | 'BEARISH';
export type SignalDirection = 'LONG' | 'SHORT';

export interface MacroBtcStatus {
  price: number;
  ema100: number;
  diffPct: number;
  regime: MarketRegime;
  timeframe: string;
  lastChecked: string;
  symbol: string;
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  fibRange: number;
  fib0: number;
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
  fib886: number;
  fib100: number;
  fibExt1272: number;
  fibExt1618: number;
  oteZoneLow: number;
  oteZoneHigh: number;
  goldenZoneLow: number;
  goldenZoneHigh: number;
  buyZone: {
    min: number;
    max: number;
    label: string;
    description: string;
  };
  sellZone: {
    min: number;
    max: number;
    tp1: number;
    tp2: number;
    tp3: number;
    label: string;
    description: string;
  };
  currentZone: 'BUY_ZONE' | 'GOLDEN_POCKET' | 'OTE_PRIME' | 'EQUILIBRIUM' | 'BREAKOUT_ZONE' | 'SELL_ZONE' | 'WEAK_ZONE';
  currentZoneLabel: string;
  recommendation: string;
  confluenceSummary: string;
}

export interface BreakoutSignal {
  symbol: string;
  cleanSymbol: string;
  direction: SignalDirection;
  timeframe: string;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  slPct: number;
  tp1Pct: number;
  tp2Pct: number;
  riskReward1: number;
  riskReward2: number;
  volRatio: number;
  rsi: number;
  rsiRange: string;
  atr: number;
  ema5: number;
  ema15: number;
  ema50: number;
  volume24h: number;
  macroStatus: string;
  btcPrice: number;
  btcEma: number;
  timestamp: string;
  candles: Candle[];
  fibonacci?: FibonacciLevels;
}

export interface PairScanResult {
  symbol: string;
  cleanSymbol: string;
  price: number;
  volume24h: number;
  ema5: number;
  ema15: number;
  ema50: number;
  rsi: number;
  volRatio: number;
  atr: number;
  targetDirection: SignalDirection;
  checks: {
    macroRegimeOk: boolean;
    emaCross: boolean;
    trendBaselineOk: boolean;
    volumeExplosion: boolean;
    rsiHealthy: boolean;
  };
  passedAll: boolean;
  signal?: BreakoutSignal;
  fibonacci?: FibonacciLevels;
  inCooldown?: boolean;
  cooldownRemainingMin?: number;
}

export interface StrategyConfig {
  macroBtcEma: number;
  timeframe: string;
  emaFast: number;
  emaSlow: number;
  emaTrend: number;
  volSmaPeriod: number;
  volExpRatio: number;
  rsiPeriod: number;
  rsiLongMin: number;
  rsiLongMax: number;
  rsiShortMin: number;
  rsiShortMax: number;
  atrPeriod: number;
  atrSlMult: number;
  atrTp1Mult: number;
  atrTp2Mult: number;
  cooldownMinutes: number;
  minVolumeUsdt: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface CooldownItem {
  key: string;
  symbol: string;
  direction: SignalDirection;
  timestamp: number;
  expiresAt: number;
}
