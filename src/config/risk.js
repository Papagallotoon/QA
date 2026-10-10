// src/config/risk.js

// Recommandations "générales" (à ajuster selon volatilité / support-résistance).
// - Beaucoup de guides de trading conseillent de limiter le risque par trade à ~1–2% du capital.
// - Un ratio risque/rendement courant est 1:2 (take profit ≈ 2× la distance du stop).

export const DEFAULT_STOP_LOSS_PCT = 2; // 2% depuis le prix d'entrée
export const DEFAULT_TAKE_PROFIT_PCT = 4; // 4% (≈ 2× le stop)

export function computeLevels({ entryPrice, direction = "long", slPct = DEFAULT_STOP_LOSS_PCT, tpPct = DEFAULT_TAKE_PROFIT_PCT }) {
  if (entryPrice == null || !isFinite(entryPrice)) {
    return { stopLoss: null, takeProfit: null };
  }

  const sl = Math.abs(Number(slPct)) / 100;
  const tp = Math.abs(Number(tpPct)) / 100;

  if (direction === "short") {
    return {
      stopLoss: entryPrice * (1 + sl),
      takeProfit: entryPrice * (1 - tp),
    };
  }

  // long
  return {
    stopLoss: entryPrice * (1 - sl),
    takeProfit: entryPrice * (1 + tp),
  };
}
