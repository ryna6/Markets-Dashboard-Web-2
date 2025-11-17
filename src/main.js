// main.js
import { initTabs } from './components/tabs.js';
import { initSp500Heatmap } from './components/sp500Heatmap.js';
import { initSectorHeatmap } from './components/sectorHeatmap.js';
import { initCryptoHeatmap } from './components/cryptoHeatmap.js';
import { initEarningsCalendar } from './components/earningsCalendar.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSp500Heatmap();
  initSectorHeatmap();
  initCryptoHeatmap();
  initEarningsCalendar();
});
