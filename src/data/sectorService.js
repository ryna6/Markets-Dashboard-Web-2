// src/data/sectorService.js
import { apiClient } from './apiClient.js';
import { STORAGE_KEYS } from './constants.js';
import { toEstIso, isOlderThanMinutes } from './timezone.js';
import { getCompanyProfile } from './companyService.js';

const SECTOR_REFRESH_MINUTES = 10;
const SECTOR_WEEKLY_REFRESH_MINUTES = 60 * 12;

// SPDR sector ETFs
const SECTOR_LIST = [
  { symbol: 'XLF', name: 'Financials' },
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLY', name: 'Consumer Discretionary' },
  { symbol: 'XLV', name: 'Health Care' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLI', name: 'Industrials' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication Services' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLP', name: 'Consumer Staples' },
];

let sectorState = {
  sectors: SECTOR_LIST,
  quotes: {},          // symbol -> { price, changePct1D }
  weeklyChange: {},    // symbol -> { changePct1W }
  marketCaps: {},      // symbol -> number
  lastQuotesFetch: null,
  lastWeeklyFetch: null,
  status: 'idle',
  error: null,
};

function loadCache() {
  const raw = localStorage.getItem(STORAGE_KEYS.sectorCache);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    sectorState.quotes = parsed.quotes || sectorState.quotes;
    sectorState.weeklyChange = parsed.weeklyChange || sectorState.weeklyChange;
    sectorState.marketCaps = parsed.marketCaps || sectorState.marketCaps;
    sectorState.lastQuotesFetch = parsed.lastQuotesFetch || null;
    sectorState.lastWeeklyFetch = parsed.lastWeeklyFetch || null;
  } catch (_) {}
}

function saveCache() {
  const snapshot = {
    quotes: sectorState.quotes,
    weeklyChange: sectorState.weeklyChange,
    marketCaps: sectorState.marketCaps,
    lastQuotesFetch: sectorState.lastQuotesFetch,
    lastWeeklyFetch: sectorState.lastWeeklyFetch,
  };
  localStorage.setItem(STORAGE_KEYS.sectorCache, JSON.stringify(snapshot));
}

loadCache();

function getSectorSymbols() {
  return sectorState.sectors.map((s) => s.symbol);
}

async function refreshSectorQuotesIfNeeded() {
  const nowEstIso = toEstIso(new Date());

  if (
    sectorState.lastQuotesFetch &&
    !isOlderThanMinutes(
      sectorState.lastQuotesFetch,
      SECTOR_REFRESH_MINUTES,
      'America/New_York'
    )
  ) {
    return;
  }

  sectorState.status = 'loading';
  sectorState.error = null;

  const symbols = getSectorSymbols();
  const quotes = {};

  for (const symbol of symbols) {
    try {
      const data = await apiClient.finnhub(
        `/quote?symbol=${encodeURIComponent(symbol)}`
      );

      const price = data.c;
      let pct1D =
        typeof data.dp === 'number'
          ? data.dp
          : typeof data.c === 'number' &&
            typeof data.pc === 'number' &&
            data.pc !== 0
          ? ((data.c - data.pc) / data.pc) * 100
          : null;

      quotes[symbol] = {
        price,
        changePct1D: pct1D,
      };
    } catch (err) {
      console.warn('Sector quote error', symbol, err);
    }
  }

  sectorState.quotes = quotes;
  sectorState.lastQuotesFetch = nowEstIso;
  sectorState.status = 'ready';
  saveCache();
}

async function refreshSectorWeeklyIfNeeded() {
  const nowEstIso = toEstIso(new Date());

  if (
    sectorState.lastWeeklyFetch &&
    !isOlderThanMinutes(
      sectorState.lastWeeklyFetch,
      SECTOR_WEEKLY_REFRESH_MINUTES,
      'America/New_York'
    )
  ) {
    return;
  }

  const symbols = getSectorSymbols();
  const weeklyChange = { ...sectorState.weeklyChange };

  const nowSec = Math.floor(Date.now() / 1000);
  const weekAgoSec = nowSec - 7 * 24 * 60 * 60;

  for (const symbol of symbols) {
    try {
      const data = await apiClient.finnhub(
        `/stock/candle?symbol=${encodeURIComponent(
          symbol
        )}&resolution=D&from=${weekAgoSec}&to=${nowSec}`
      );
      if (data.s !== 'ok' || !Array.isArray(data.c) || data.c.length < 2) {
        continue;
      }

      const closes = data.c;
      const latest = closes[closes.length - 1];
      const weekAgo = closes[0];

      if (!weekAgo || weekAgo === 0) continue;

      const pct = ((latest - weekAgo) / weekAgo) * 100;
      weeklyChange[symbol] = { changePct1W: pct };
    } catch (err) {
      console.warn('Sector weekly candle error', symbol, err);
    }
  }

  sectorState.weeklyChange = weeklyChange;
  sectorState.lastWeeklyFetch = nowEstIso;
  saveCache();
}

async function refreshSectorMarketCapsIfNeeded() {
  const symbols = getSectorSymbols();
  const marketCaps = { ...sectorState.marketCaps };

  for (const symbol of symbols) {
    if (marketCaps[symbol] != null) continue;
    try {
      const profile = await getCompanyProfile(symbol);
      if (profile && typeof profile.marketCap === 'number') {
        marketCaps[symbol] = profile.marketCap;
      }
    } catch (err) {
      console.warn('Sector marketCap error', symbol, err);
    }
  }

  sectorState.marketCaps = marketCaps;
  saveCache();
}

export async function getSectorData(timeframe) {
  try {
    await refreshSectorQuotesIfNeeded();
  } catch (err) {
    sectorState.error = err.message;
  }

  if (timeframe === '1W') {
    try {
      await refreshSectorWeeklyIfNeeded();
    } catch (err) {
      sectorState.error = err.message;
    }
  }

  try {
    await refreshSectorMarketCapsIfNeeded();
  } catch (err) {
    sectorState.error = err.message;
  }

  return {
    sectors: sectorState.sectors,
    quotes: sectorState.quotes,
    weeklyChange: sectorState.weeklyChange,
    marketCaps: sectorState.marketCaps,
    lastQuotesFetch: sectorState.lastQuotesFetch,
    status: sectorState.status,
    error: sectorState.error,
  };
}
