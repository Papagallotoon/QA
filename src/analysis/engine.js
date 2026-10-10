// src/analysis/engine.js
// ======================
// UTILITAIRES DE BASE
// ======================

// Moyenne mobile simple
function sma(values, window) {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / window;
  });
}

// EMA
function ema(values, period) {
  const k = 2 / (period + 1);
  let prev = null;
  return values.map((v) => {
    if (prev == null) prev = v;
    else prev = v * k + prev * (1 - k);
    return prev;
  });
}

// RSI 14
function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  gains /= period;
  losses /= period;

  let rs = losses === 0 ? 0 : gains / losses;
  out[period] = losses === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    gains = (gains * (period - 1) + gain) / period;
    losses = (losses * (period - 1) + loss) / period;

    rs = losses === 0 ? 0 : gains / losses;
    out[i] = losses === 0 ? 100 : 100 - 100 / (1 + rs);
  }
  return out;
}

// MACD 12/26/9
function macd(values) {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - signal[i]);
  return { macdLine, signal, hist };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(n) {
  return typeof n === "number" && !Number.isNaN(n);
}

// ======================
// ATR / ATR%
// ======================
function atr(candles, period = 14) {
  if (!candles || candles.length < period + 2) return null;
  let sumTR = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sumTR += tr;
  }
  return sumTR / period;
}

function atrPercent(candles, period = 14) {
  const a = atr(candles, period);
  const lastClose = candles?.[candles.length - 1]?.close;
  if (!safeNum(a) || !safeNum(lastClose) || lastClose === 0) return null;
  return (a / lastClose) * 100;
}

// ======================
// ADX / DI (Wilder)
// ======================
function wilderSmooth(arr, period) {
  if (!arr || arr.length < period) return null;
  // seed = somme des period premières valeurs
  let seed = 0;
  for (let i = 0; i < period; i++) seed += arr[i];
  const out = [seed];
  for (let i = period; i < arr.length; i++) {
    const prev = out[out.length - 1];
    out.push(prev - prev / period + arr[i]);
  }
  return out;
}

function adxDI(candles, period = 14) {
  if (!candles || candles.length < period + 2) return null;

  const trs = [];
  const dmPlus = [];
  const dmMinus = [];

  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }

  const trS = wilderSmooth(trs, period);
  const dmpS = wilderSmooth(dmPlus, period);
  const dmmS = wilderSmooth(dmMinus, period);
  if (!trS || !dmpS || !dmmS) return null;

  const diPlus = [];
  const diMinus = [];
  const dx = [];

  for (let i = 0; i < trS.length; i++) {
    const trv = trS[i];
    if (!safeNum(trv) || trv === 0) {
      diPlus.push(0);
      diMinus.push(0);
      dx.push(0);
      continue;
    }
    const dip = (100 * dmpS[i]) / trv;
    const dim = (100 * dmmS[i]) / trv;
    diPlus.push(dip);
    diMinus.push(dim);

    const d = Math.abs(dip - dim);
    const s = dip + dim;
    dx.push(s === 0 ? 0 : (100 * d) / s);
  }

  // ADX = Wilder smooth DX, puis /period pour normaliser le seed (convention)
  const adxS = wilderSmooth(dx, period);
  if (!adxS) return null;

  const lastADX = adxS[adxS.length - 1] / period;
  const lastDIp = diPlus[diPlus.length - 1];
  const lastDIm = diMinus[diMinus.length - 1];

  return {
    adx: lastADX,
    diPlus: lastDIp,
    diMinus: lastDIm,
  };
}

// ======================
// Supertrend (ATR, bandes finales)
// ======================
function supertrend(candles, period = 10, mult = 3) {
  if (!candles || candles.length < period + 2) return null;

  // ATR "simple" moyen pour chaque bougie (suffisant pour supertrend ici)
  function atrSeries(c, p) {
    const out = Array(c.length).fill(null);
    if (c.length < p + 2) return out;

    for (let i = p; i < c.length; i++) {
      let sumTR = 0;
      for (let j = i - p + 1; j <= i; j++) {
        const cur = c[j];
        const prev = c[j - 1];
        const tr = Math.max(
          cur.high - cur.low,
          Math.abs(cur.high - prev.close),
          Math.abs(cur.low - prev.close)
        );
        sumTR += tr;
      }
      out[i] = sumTR / p;
    }
    return out;
  }

  const atrArr = atrSeries(candles, period);

  const finalUpper = Array(candles.length).fill(null);
  const finalLower = Array(candles.length).fill(null);
  const st = Array(candles.length).fill(null);
  const dirArr = Array(candles.length).fill(null); // "haussier"/"baissier"

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const a = atrArr[i];
    if (!safeNum(a)) continue;

    const hl2 = (c.high + c.low) / 2;
    const basicUpper = hl2 + mult * a;
    const basicLower = hl2 - mult * a;

    if (i === 0 || finalUpper[i - 1] == null) {
      finalUpper[i] = basicUpper;
      finalLower[i] = basicLower;
      st[i] = basicUpper;
      dirArr[i] = "baissier";
      continue;
    }

    // Final bands
    finalUpper[i] =
      basicUpper < finalUpper[i - 1] || candles[i - 1].close > finalUpper[i - 1]
        ? basicUpper
        : finalUpper[i - 1];

    finalLower[i] =
      basicLower > finalLower[i - 1] || candles[i - 1].close < finalLower[i - 1]
        ? basicLower
        : finalLower[i - 1];

    // Supertrend line
    if (st[i - 1] === finalUpper[i - 1]) {
      st[i] = c.close <= finalUpper[i] ? finalUpper[i] : finalLower[i];
    } else {
      st[i] = c.close >= finalLower[i] ? finalLower[i] : finalUpper[i];
    }

    dirArr[i] = st[i] === finalLower[i] ? "haussier" : "baissier";
  }

  const lastIdx = candles.length - 1;
  return {
    dir: dirArr[lastIdx],
    line: st[lastIdx],
    upper: finalUpper[lastIdx],
    lower: finalLower[lastIdx],
  };
}

// ======================
// Detection patterns (étendu)
// ======================
function bodySize(c) {
  return Math.abs(c.close - c.open);
}
function upperWick(c) {
  return c.high - Math.max(c.open, c.close);
}
function lowerWick(c) {
  return Math.min(c.open, c.close) - c.low;
}
function isBull(c) {
  return c.close > c.open;
}
function isBear(c) {
  return c.close < c.open;
}
function approxEqual(x, y, tolPct = 0.15) {
  // tolPct en pourcentage du prix y
  const tol = (Math.abs(y) * tolPct) / 100;
  return Math.abs(x - y) <= tol;
}

function detectPatterns(candles) {
  const n = candles.length;
  if (n < 3) {
    return {
      doji: false,
      hammer: false,
      morningStar: false,

      // nouveaux
      pinBarBull: false,
      pinBarBear: false,
      bullishHarami: false,
      bearishHarami: false,
      threeWhiteSoldiers: false,
      threeBlackCrows: false,
      tweezerTop: false,
      tweezerBottom: false,
      darkCloudCover: false,
    };
  }

  const c0 = candles[n - 1];
  const c1 = candles[n - 2];
  const c2 = candles[n - 3];

  // --- anciens
  const body = Math.abs(c0.close - c0.open);
  const range = c0.high - c0.low;
  const doji = range > 0 ? body <= range * 0.05 : false;

  const lowerShadow = Math.min(c0.open, c0.close) - c0.low;
  const hammer = range > 0 ? body < range * 0.3 && lowerShadow >= body * 2 : false;

  const bigBear = c2.close < c2.open;
  const smallBody1 = Math.abs(c1.close - c1.open) < Math.abs(c2.close - c2.open) * 0.3;
  const strongUp = c0.close > (c2.open + c2.close) / 2;
  const morningStar = bigBear && smallBody1 && strongUp;

  // --- nouveaux patterns
  // Pin bars
  const pinBarBull = (() => {
    const b = bodySize(c0);
    const lw = lowerWick(c0);
    const uw = upperWick(c0);
    return lw > 2 * b && lw > uw && isBull(c0);
  })();

  const pinBarBear = (() => {
    const b = bodySize(c0);
    const lw = lowerWick(c0);
    const uw = upperWick(c0);
    return uw > 2 * b && uw > lw && isBear(c0);
  })();

  // Harami
  const bullishHarami = (() => {
    const prevBear = isBear(c1);
    const curBull = isBull(c0);
    const prevHigh = Math.max(c1.open, c1.close);
    const prevLow = Math.min(c1.open, c1.close);
    const curHigh = Math.max(c0.open, c0.close);
    const curLow = Math.min(c0.open, c0.close);
    return prevBear && curBull && curHigh <= prevHigh && curLow >= prevLow;
  })();

  const bearishHarami = (() => {
    const prevBull = isBull(c1);
    const curBear = isBear(c0);
    const prevHigh = Math.max(c1.open, c1.close);
    const prevLow = Math.min(c1.open, c1.close);
    const curHigh = Math.max(c0.open, c0.close);
    const curLow = Math.min(c0.open, c0.close);
    return prevBull && curBear && curHigh <= prevHigh && curLow >= prevLow;
  })();

  // Three Soldiers / Crows (3 bougies)
  const threeWhiteSoldiers =
    isBull(c2) && isBull(c1) && isBull(c0) && c1.close > c2.close && c0.close > c1.close;

  const threeBlackCrows =
    isBear(c2) && isBear(c1) && isBear(c0) && c1.close < c2.close && c0.close < c1.close;

  // Tweezers
  const tweezerTop = approxEqual(c1.high, c0.high) && isBull(c1) && isBear(c0);
  const tweezerBottom = approxEqual(c1.low, c0.low) && isBear(c1) && isBull(c0);

  // Dark Cloud Cover (2 bougies)
  const darkCloudCover = (() => {
    if (!isBull(c1) || !isBear(c0)) return false;
    const mid = (c1.open + c1.close) / 2;
    // ouverture au-dessus du haut précédent et clôture sous la moitié du corps précédent
    return c0.open > c1.high * 0.999 && c0.close < mid && c0.close > c1.open * 0.98;
  })();

  return {
    doji,
    hammer,
    morningStar,

    pinBarBull,
    pinBarBear,
    bullishHarami,
    bearishHarami,
    threeWhiteSoldiers,
    threeBlackCrows,
    tweezerTop,
    tweezerBottom,
    darkCloudCover,
  };
}

// ======================
// 2️⃣ ZONES SUPPORT / RÉSISTANCE
// ======================
function computeZones(candles) {
  if (!candles || candles.length < 5) {
    return { supports: [], resistances: [] };
  }

  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const supports = [
    {
      type: "support",
      label: "Support majeur",
      level: parseFloat(min.toFixed(2)),
    },
    {
      type: "support",
      label: "Support intermédiaire",
      level: parseFloat((min + range * 0.25).toFixed(2)),
    },
  ];

  const resistances = [
    {
      type: "resistance",
      label: "Résistance majeure",
      level: parseFloat(max.toFixed(2)),
    },
    {
      type: "resistance",
      label: "Résistance intermédiaire",
      level: parseFloat((max - range * 0.25).toFixed(2)),
    },
  ];

  return { supports, resistances };
}

// ======================
// 1️⃣ STRATÉGIES AUTO
// ======================
function buildStrategy({ bias, indicators, zones }) {
  const { lastPrice, sma20, sma50, rsi: lastRSI, macd, macdSignal } =
    indicators || {};
  if (!lastPrice || !sma20 || !sma50 || lastRSI == null) {
    return {
      type: "neutre",
      label: "Observation",
      description:
        "Pas assez de données fiables pour une stratégie claire. Surveille simplement le comportement du prix dans les prochaines séances.",
      entry: null,
      stop: null,
      target: null,
      rr: null,
    };
  }

  const { supports = [], resistances = [] } = zones || {};
  const closestSupport =
    supports.length > 0
      ? supports.reduce((acc, s) =>
          Math.abs(s.level - lastPrice) < Math.abs(acc.level - lastPrice)
            ? s
            : acc
        )
      : null;
  const closestResistance =
    resistances.length > 0
      ? resistances.reduce((acc, r) =>
          Math.abs(r.level - lastPrice) < Math.abs(acc.level - lastPrice)
            ? r
            : acc
        )
      : null;

  function makeRR(entry, stop, target) {
    if (!entry || !stop || !target) return null;
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (!risk) return null;
    return parseFloat((reward / risk).toFixed(2));
  }

  if (
    bias === "haussier" &&
    sma20 > sma50 &&
    lastRSI > 35 &&
    lastRSI < 65 &&
    macd != null &&
    macdSignal != null &&
    macd > macdSignal
  ) {
    const entry =
      closestSupport && closestSupport.level < lastPrice
        ? closestSupport.level
        : lastPrice * 0.99;
    const stop = parseFloat((entry * 0.97).toFixed(2));
    const target =
      closestResistance && closestResistance.level > lastPrice
        ? closestResistance.level
        : parseFloat((lastPrice * 1.05).toFixed(2));
    const rr = makeRR(entry, stop, target);

    return {
      type: "swing_long",
      label: "Swing haussier",
      description:
        "Tendance haussière établie avec momentum positif. Idée : se placer sur repli vers un support et viser la zone de résistance.",
      entry: parseFloat(entry.toFixed(2)),
      stop,
      target,
      rr,
    };
  }

  if (
    bias === "haussier" &&
    sma20 > sma50 &&
    lastRSI >= 60 &&
    macd != null &&
    macd > 0
  ) {
    const entry = lastPrice;
    const stop = parseFloat((lastPrice * 0.96).toFixed(2));
    const target = parseFloat((lastPrice * 1.08).toFixed(2));
    const rr = makeRR(entry, stop, target);

    return {
      type: "trend_follow",
      label: "Trend following",
      description:
        "Actif en forte tendance haussière. Stratégie : suivre le flux avec un stop serré sous le dernier creux.",
      entry: parseFloat(entry.toFixed(2)),
      stop,
      target,
      rr,
    };
  }

  if (lastRSI < 30 && bias !== "haussier") {
    const entry =
      closestSupport && closestSupport.level < lastPrice
        ? closestSupport.level
        : lastPrice;
    const stop = parseFloat((entry * 0.95).toFixed(2));
    const target = parseFloat((lastPrice * 1.07).toFixed(2));
    const rr = makeRR(entry, stop, target);

    return {
      type: "revert_long",
      label: "Rebond technique",
      description:
        "Marché survendu, possible rebond technique. Stratégie plus risquée, à réserver aux profils expérimentés.",
      entry: parseFloat(entry.toFixed(2)),
      stop,
      target,
      rr,
    };
  }

  if (bias === "baissier" && lastRSI > 55) {
    const entry = lastPrice;
    const stop = parseFloat((lastPrice * 1.04).toFixed(2));
    const target = parseFloat((lastPrice * 0.94).toFixed(2));
    const rr = makeRR(entry, stop, target);

    return {
      type: "short_or_hedge",
      label: "Couverture / vente à découvert",
      description:
        "Tendance baissière avec risque de poursuite du mouvement. Stratégie défensive (couverture) ou short pour les profils avancés.",
      entry: parseFloat(entry.toFixed(2)),
      stop,
      target,
      rr,
    };
  }

  return {
    type: "neutre",
    label: "Observation",
    description:
      "Les signaux sont mitigés. Patience : laisse se dessiner une structure plus claire (cassure de support/résistance, retournement du RSI…).",
    entry: null,
    stop: null,
    target: null,
    rr: null,
  };
}

// ======================
// 3️⃣ ALERTES INTELLIGENTES
// ======================
function buildSmartAlerts({ indicators, patterns, bias, score, zones }) {
  const out = [];
  const { rsi: lastRSI, macd, macdSignal, lastPrice, adx14, diPlus14, diMinus14, supertrendDir } =
    indicators || {};
  const { supports = [], resistances = [] } = zones || {};

  function pushAlert({ severity, label, message, tag }) {
    out.push({ severity, label, message, tag });
  }

  if (lastRSI != null) {
    if (lastRSI < 30) {
      pushAlert({
        severity: "warning",
        label: "RSI survendu",
        message:
          "L’actif est en zone de survente (< 30). Risque de rebond technique, mais méfiance sur la tendance globale.",
        tag: "rsi",
      });
    } else if (lastRSI > 70) {
      pushAlert({
        severity: "warning",
        label: "RSI suracheté",
        message:
          "Zone de surachat (> 70). Probabilité accrue de consolidation ou correction.",
        tag: "rsi",
      });
    } else {
      pushAlert({
        severity: "info",
        label: "RSI neutre",
        message: "Pas de signal extrême sur le RSI, dynamique modérée.",
        tag: "rsi",
      });
    }
  }

  if (macd != null && macdSignal != null) {
    if (macd > macdSignal) {
      pushAlert({
        severity: "info",
        label: "Momentum haussier (MACD)",
        message:
          "La MACD est au-dessus de sa ligne de signal : momentum positif.",
        tag: "macd",
      });
    } else {
      pushAlert({
        severity: "info",
        label: "Momentum baissier (MACD)",
        message:
          "La MACD est sous sa ligne de signal : pression vendeuse dominante.",
        tag: "macd",
      });
    }
  }

  // ✅ ADX / DI
  if (adx14 != null && diPlus14 != null && diMinus14 != null) {
    if (adx14 >= 25) {
      pushAlert({
        severity: "info",
        label: "Tendance forte (ADX)",
        message: `ADX ${adx14.toFixed(1)} : la tendance est bien établie.`,
        tag: "adx",
      });
    } else {
      pushAlert({
        severity: "info",
        label: "Tendance faible (ADX)",
        message: `ADX ${adx14.toFixed(1)} : marché plutôt en range / transition.`,
        tag: "adx",
      });
    }

    if (diPlus14 > diMinus14) {
      pushAlert({
        severity: "bullish",
        label: "DI+ dominant",
        message: "DI+ > DI− : pression acheteuse dominante.",
        tag: "adx",
      });
    } else if (diMinus14 > diPlus14) {
      pushAlert({
        severity: "bearish",
        label: "DI− dominant",
        message: "DI− > DI+ : pression vendeuse dominante.",
        tag: "adx",
      });
    }
  }

  // ✅ Supertrend
  if (supertrendDir === "haussier") {
    pushAlert({
      severity: "bullish",
      label: "Supertrend haussier",
      message: "Supertrend indique une tendance haussière active.",
      tag: "supertrend",
    });
  } else if (supertrendDir === "baissier") {
    pushAlert({
      severity: "bearish",
      label: "Supertrend baissier",
      message: "Supertrend indique une tendance baissière active.",
      tag: "supertrend",
    });
  }

  // ✅ Patterns étendus
  if (patterns?.pinBarBull) {
    pushAlert({
      severity: "bullish",
      label: "Pin Bar haussier",
      message: "Rejet du bas (mèche basse) : possible rebond / retournement haussier.",
      tag: "pattern",
    });
  }
  if (patterns?.pinBarBear) {
    pushAlert({
      severity: "bearish",
      label: "Pin Bar baissier",
      message: "Rejet du haut (mèche haute) : risque de retournement / baisse.",
      tag: "pattern",
    });
  }
  if (patterns?.bullishHarami) {
    pushAlert({
      severity: "bullish",
      label: "Harami haussier",
      message: "Pattern de retournement haussier (à confirmer par la bougie suivante).",
      tag: "pattern",
    });
  }
  if (patterns?.bearishHarami) {
    pushAlert({
      severity: "bearish",
      label: "Harami baissier",
      message: "Pattern de retournement baissier (à confirmer).",
      tag: "pattern",
    });
  }
  if (patterns?.threeWhiteSoldiers) {
    pushAlert({
      severity: "strong_bullish",
      label: "Three White Soldiers",
      message: "3 bougies haussières consécutives : momentum haussier solide.",
      tag: "pattern",
    });
  }
  if (patterns?.threeBlackCrows) {
    pushAlert({
      severity: "strong_bearish",
      label: "Three Black Crows",
      message: "3 bougies baissières consécutives : momentum baissier solide.",
      tag: "pattern",
    });
  }
  if (patterns?.tweezerBottom) {
    pushAlert({
      severity: "bullish",
      label: "Tweezer Bottom",
      message: "Double test du bas : support potentiel.",
      tag: "pattern",
    });
  }
  if (patterns?.tweezerTop) {
    pushAlert({
      severity: "bearish",
      label: "Tweezer Top",
      message: "Double test du haut : résistance potentielle.",
      tag: "pattern",
    });
  }
  if (patterns?.darkCloudCover) {
    pushAlert({
      severity: "bearish",
      label: "Dark Cloud Cover",
      message: "Pattern de retournement baissier possible (nuage noir).",
      tag: "pattern",
    });
  }

  // Zones
  if (lastPrice && supports.length && resistances.length) {
    const nearestSupport = supports.reduce((acc, s) =>
      Math.abs(s.level - lastPrice) < Math.abs(acc.level - lastPrice) ? s : acc
    );
    const nearestResistance = resistances.reduce((acc, r) =>
      Math.abs(r.level - lastPrice) < Math.abs(acc.level - lastPrice) ? r : acc
    );

    const distSupport = ((lastPrice - nearestSupport.level) / lastPrice) * 100;
    const distResistance =
      ((nearestResistance.level - lastPrice) / lastPrice) * 100;

    if (distSupport >= 0 && distSupport < 2) {
      pushAlert({
        severity: "info",
        label: "Proche d’un support",
        message: `Le prix évolue à moins de ~${distSupport.toFixed(
          1
        )}% du support clé (${nearestSupport.level}).`,
        tag: "zones",
      });
    }
    if (distResistance >= 0 && distResistance < 2) {
      pushAlert({
        severity: "info",
        label: "Proche d’une résistance",
        message: `Le prix est proche d’une résistance clé (${nearestResistance.level}), prudence sur les achats tardifs.`,
        tag: "zones",
      });
    }
  }

  if (score >= 70 && bias === "haussier") {
    pushAlert({
      severity: "bullish",
      label: "Contexte très favorable",
      message:
        "Plusieurs signaux convergent vers un scénario haussier. Pense à dimensionner ton risque, même en contexte positif.",
      tag: "global",
    });
  } else if (score <= 30 && bias === "baissier") {
    pushAlert({
      severity: "bearish",
      label: "Contexte fragile",
      message:
        "Les signaux sont clairement baissiers. Protéger le capital devient prioritaire (réduction d’exposition, couvertures…).",
      tag: "global",
    });
  }

  return out;
}

// ======================
// 5️⃣ SCORE BOT POUR RANKING
// ======================
function computeBotScoreCore({ score, bias, indicators }) {
  let botScore = score ?? 50;

  if (bias === "haussier") botScore += 5;
  if (bias === "baissier") botScore -= 5;

  const rsiVal = indicators?.rsi;
  if (rsiVal != null) {
    if (rsiVal > 40 && rsiVal < 65) botScore += 4;
    if (rsiVal > 75 || rsiVal < 25) botScore -= 4;
  }

  if (indicators?.macd != null) {
    if (indicators.macd > 0) botScore += 2;
    else botScore -= 2;
  }

  // ✅ petit bonus si supertrend aligné (très utile pour ranking)
  if (indicators?.supertrendDir === "haussier") botScore += 2;
  if (indicators?.supertrendDir === "baissier") botScore -= 2;

  // ✅ petit bonus/malus si tendance forte (ADX)
  if (indicators?.adx14 != null) {
    if (indicators.adx14 >= 25) botScore += 2;
    if (indicators.adx14 < 15) botScore -= 1;
  }

  if (botScore > 100) botScore = 100;
  if (botScore < 0) botScore = 0;

  return Math.round(botScore);
}

// ======================
// FONCTION PRINCIPALE
// ======================
export function analyzeCandles(candles) {
  if (!candles || candles.length < 30) {
    return {
      score: 50,
      bias: "neutre",
      indicators: {},
      alerts: ["Pas assez de données pour une analyse fiable."],
      patterns: {},
      zones: { supports: [], resistances: [] },
      strategy: null,
      smartAlerts: [],
      botScore: 50,
    };
  }

  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];

  const sma20Arr = sma(closes, 20);
  const sma50Arr = sma(closes, 50);
  const sma20 = sma20Arr[sma20Arr.length - 1];
  const sma50 = sma50Arr[sma50Arr.length - 1];

  const rsiArr = rsi(closes, 14);
  const lastRSI = rsiArr[rsiArr.length - 1];

  const { macdLine, signal, hist } = macd(closes);
  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signal[signal.length - 1];
  const lastHist = hist[hist.length - 1];

  // ✅ patterns étendus
  const patterns = detectPatterns(candles);
  const zones = computeZones(candles);

  // ✅ nouveaux indicateurs
  const atr14 = atr(candles, 14);
  const atrPct14 = atrPercent(candles, 14);
  const adxObj = adxDI(candles, 14); // {adx, diPlus, diMinus}
  const st = supertrend(candles, 10, 3); // {dir,line,upper,lower}

  let score = 50;
  const alerts = [];

  // Tendance SMA
  if (sma20 != null && sma50 != null) {
    if (sma20 > sma50) {
      score += 10;
      alerts.push("SMA20 > SMA50 : tendance haussière.");
    } else {
      score -= 10;
      alerts.push("SMA20 < SMA50 : tendance baissière.");
    }
  }

  // RSI
  if (lastRSI != null) {
    if (lastRSI < 30) {
      score += 8;
      alerts.push("RSI < 30 : zone de survente (potentiel rebond).");
    } else if (lastRSI > 70) {
      score -= 8;
      alerts.push("RSI > 70 : zone de surachat (risque de correction).");
    } else {
      alerts.push("RSI neutre.");
    }
  }

  // MACD
  if (lastMACD != null && lastSignal != null) {
    if (lastMACD > lastSignal) {
      score += 8;
      alerts.push("MACD > signal : momentum haussier.");
    } else {
      score -= 8;
      alerts.push("MACD < signal : momentum baissier.");
    }
  }

  // ✅ ADX/DI : score seulement si tendance assez forte
  if (adxObj?.adx != null && adxObj?.diPlus != null && adxObj?.diMinus != null) {
    if (adxObj.adx >= 25) {
      alerts.push(`ADX ≥ 25 : tendance forte (${adxObj.adx.toFixed(1)}).`);
      // bonus selon direction DI
      if (adxObj.diPlus > adxObj.diMinus) {
        score += 4;
        alerts.push("DI+ > DI− : pression acheteuse dominante.");
      } else if (adxObj.diMinus > adxObj.diPlus) {
        score -= 4;
        alerts.push("DI− > DI+ : pression vendeuse dominante.");
      }
    } else {
      alerts.push(`ADX < 25 : tendance faible (${adxObj.adx.toFixed(1)}), marché plutôt en range.`);
    }
  }

  // ✅ Supertrend
  if (st?.dir === "haussier") {
    score += 3;
    alerts.push("Supertrend : haussier.");
  } else if (st?.dir === "baissier") {
    score -= 3;
    alerts.push("Supertrend : baissier.");
  }

  // Patterns (anciens)
  if (patterns.hammer) {
    score += 6;
    alerts.push("Marteau détecté : possible retournement haussier.");
  }
  if (patterns.morningStar) {
    score += 12;
    alerts.push("Étoile du matin : fort signal de retournement haussier.");
  }
  if (patterns.doji) {
    alerts.push("Doji : forte indécision du marché.");
  }

  // ✅ Patterns (nouveaux)
  if (patterns.pinBarBull) {
    score += 6;
    alerts.push("Pin Bar bullish : rejet bas, signal haussier potentiel.");
  }
  if (patterns.pinBarBear) {
    score -= 6;
    alerts.push("Pin Bar bearish : rejet haut, signal baissier potentiel.");
  }
  if (patterns.bullishHarami) {
    score += 6;
    alerts.push("Harami haussier : signal de retournement haussier possible.");
  }
  if (patterns.bearishHarami) {
    score -= 6;
    alerts.push("Harami baissier : signal de retournement baissier possible.");
  }
  if (patterns.threeWhiteSoldiers) {
    score += 10;
    alerts.push("Three White Soldiers : momentum haussier fort.");
  }
  if (patterns.threeBlackCrows) {
    score -= 10;
    alerts.push("Three Black Crows : momentum baissier fort.");
  }
  if (patterns.tweezerBottom) {
    score += 6;
    alerts.push("Tweezer Bottom : support potentiel / rebond possible.");
  }
  if (patterns.tweezerTop) {
    score -= 6;
    alerts.push("Tweezer Top : résistance potentielle / retournement possible.");
  }
  if (patterns.darkCloudCover) {
    score -= 8;
    alerts.push("Dark Cloud Cover : retournement baissier possible.");
  }

  score = clamp(score, 0, 100);

  let bias = "neutre";
  if (score >= 65) bias = "haussier";
  else if (score <= 35) bias = "baissier";

  const indicators = {
    lastPrice: last.close,
    sma20,
    sma50,
    rsi: lastRSI,
    macd: lastMACD,
    macdSignal: lastSignal,
    macdHist: lastHist,

    // ✅ nouveaux indicateurs exposés
    atr14,
    atrPct14,
    adx14: adxObj?.adx ?? null,
    diPlus14: adxObj?.diPlus ?? null,
    diMinus14: adxObj?.diMinus ?? null,
    supertrendDir: st?.dir ?? null,
    supertrendLine: st?.line ?? null,
    supertrendUpper: st?.upper ?? null,
    supertrendLower: st?.lower ?? null,
  };

  const strategy = buildStrategy({ bias, indicators, zones });
  const smartAlerts = buildSmartAlerts({
    indicators,
    patterns,
    bias,
    score,
    zones,
  });
  const botScore = computeBotScoreCore({ score, bias, indicators });

  return {
    score,
    bias,
    indicators,
    patterns,
    alerts,
    zones,
    strategy,
    smartAlerts,
    botScore,
  };
}

// Export optionnel si tu veux utiliser le score bot ailleurs
export function computeBotScoreFromAnalysis(analysis) {
  if (!analysis) return 50;
  return computeBotScoreCore(analysis);
}
