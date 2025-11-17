// src/data/sectorService.js
import { apiClient } from './apiClient.js';
import { STORAGE_KEYS } from './constants.js';
import { toEstIso, isOlderThanMinutes } from './timezone.js';

// Refresh cadences
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

// Static S&P 500 sector weights (approx., mid-2025)
// Source: public S&P 500 sector weight breakdowns. 
const SECTOR_WEIGHTS = {
  XLK: 34.0,  // Information Technology
  XLF: 13.8,  // Financials
  XLY: 10.4,  // Consumer Discretionary
  XLC: 9.9,   // Communication Services
  XLV: 8.8,   // Health Care
  XLI: 8.6,   // Industrials
  XLP: 5.2,   // Consumer Staples
  XLE: 3.0,   // Energy
  XLU: 2.5,   // Utilities
  XLRE: 2.0,  // Real Estate
  XLB: 1.9,   // Materials (approx.)
};

let sectorState = {
  sectors: SECTOR_LIST,
  quotes: {},          // symbol -> { price, changePct1D }
  weeklyChange: {},    // symbol -> { changePct1W }
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
    sectorState.lastQuotesFetch = parsed.lastQuotesFetch || null;
    sectorState.lastWeeklyFetch = parsed.lastWeeklyFetch || null;
  } catch (_) {}
}

function saveCache() {
  const snapshot = {
    quotes: sectorState.quotes,
    weeklyChange: sectorState.weeklyChange,
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

  // We always return static SECTOR_WEIGHTS as marketCaps for sizing.
  return {
    sectors: sectorState.sectors,
    quotes: sectorState.quotes,
    weeklyChange: sectorState.weeklyChange,
    marketCaps: SECTOR_WEIGHTS,
    lastQuotesFetch: sectorState.lastQuotesFetch,
    status: sectorState.status,
    error: sectorState.error,
  };
}
