// components/sp500Heatmap.js
import { getSp500Data, resetSp500Cache } from '../data/stocksService.js';
import { renderHeatmap } from './heatmap.js';
import { renderLastUpdatedLine } from './lastUpdated.js';
import { TIMEFRAMES, TIMEFRAME_STORAGE_KEYS } from '../data/constants.js';

export function initSp500Heatmap() {
  const container = document.getElementById('sp500-view');
  if (!container) return;

  const heatmapContainer = container.querySelector('.heatmap-container');
  const lastUpdatedEl = container.querySelector('.last-updated');
  const dropdown = container.querySelector('.timeframe-select');
  const refreshBtn = container.querySelector('.sp500-refresh-btn');

  const tfKey =
    (TIMEFRAME_STORAGE_KEYS && TIMEFRAME_STORAGE_KEYS.sp500) ||
    'md_sp500_timeframe';

  let currentTimeframe =
    localStorage.getItem(tfKey) || TIMEFRAMES.ONE_DAY;

  if (dropdown) {
    dropdown.value = currentTimeframe;
    dropdown.addEventListener('change', () => {
      currentTimeframe = dropdown.value;
      localStorage.setItem(tfKey, currentTimeframe);
      refresh();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Clear S&P cache and force a fresh refetch
      resetSp500Cache();
      refresh();
    });
  }

  async function refresh() {
    const tf = currentTimeframe;
    try {
      const data = await getSp500Data(tf);
      const { symbols, quotes, weeklyChange, marketCaps } = data;

      const tiles = symbols.map((sym) => {
        const q = quotes[sym] || {};
        const w = weeklyChange[sym] || {};
        return {
          symbol: sym,
          marketCap: marketCaps ? marketCaps[sym] : null,
          changePct1D: q.changePct1D,
          changePct1W: w.changePct1W,
        };
      });

      renderHeatmap(heatmapContainer, tiles, tf);
      renderLastUpdatedLine(
        lastUpdatedEl,
        data.lastQuotesFetch,
        tf,
        data.error
      );
    } catch (err) {
      renderLastUpdatedLine(
        lastUpdatedEl,
        null,
        currentTimeframe,
        err.message
      );
    }
  }

  // Initial render
  refresh();

  // Auto-refresh every 10 minutes
  setInterval(refresh, 10 * 60 * 1000);
}
