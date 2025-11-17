// main.js
import { TIMEFRAMES, STORAGE_KEYS } from './data/constants.js';
import { initTabs } from './components/tabs.js';
import { initSp500Heatmap } from './components/sp500Heatmap.js';
import { initSectorHeatmap } from './components/sectorHeatmap.js';
import { initCryptoHeatmap } from './components/cryptoHeatmap.js';
import { initEarningsCalendar } from './components/earningsCalendar.js';

let currentTimeframe =
  localStorage.getItem(STORAGE_KEYS.timeframe) || TIMEFRAMES.ONE_DAY;

export function setTimeframe(tf) {
  if (tf === currentTimeframe) return;
  currentTimeframe = tf;
  localStorage.setItem(STORAGE_KEYS.timeframe, tf);
  // Notify heatmap views:
  window.dispatchEvent(new CustomEvent('timeframe-changed', { detail: tf }));
}

export function getTimeframe() {
  return currentTimeframe;
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs({ getTimeframe, setTimeframe });
  initSp500Heatmap({ getTimeframe });
  initSectorHeatmap({ getTimeframe });
  initCryptoHeatmap({ getTimeframe });
  initEarningsCalendar();
});
