// components/sp500Heatmap.js
import { getSp500Data } from '../data/stocksService.js';
import { renderHeatmap } from './heatmap.js';
import { getTimeframe, setTimeframe } from '../main.js';
import { renderLastUpdatedLine } from './lastUpdated.js';

export function initSp500Heatmap({ getTimeframe: _getTimeframeArg }) {
  const container = document.getElementById('sp500-view');
  if (!container) return;

  const heatmapContainer = container.querySelector('.heatmap-container');
  const lastUpdatedEl = container.querySelector('.last-updated');
  const dropdown = container.querySelector('.timeframe-select');

  if (dropdown) {
    dropdown.value = getTimeframe();
    dropdown.addEventListener('change', () => {
      const tf = dropdown.value;
      // update global timeframe (this will also dispatch timeframe-changed)
      setTimeframe(tf);
    });
  }

  async function refresh() {
    const tf = getTimeframe();
    try {
      const data = await getSp500Data(tf);
      const { symbols, quotes, weeklyChange, marketCaps } = data;

      const tiles = symbols.map(sym => {
        const q = quotes[sym] || {};
        const w = weeklyChange[sym] || {};
        return {
          symbol: sym,
          marketCap: marketCaps ? marketCaps[sym] : null,
          changePct1D: q.changePct1D,
          changePct1W: w.changePct1W
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
        getTimeframe(),
        err.message
      );
    }
  }

  // Initial render
  refresh();

  // Auto-refresh every 10 minutes
  setInterval(refresh, 10 * 60 * 1000);

  // React to timeframe changes from other tabs/dropdowns
  window.addEventListener('timeframe-changed', () => {
    refresh();
  });
}
