// src/components/sectorHeatmap.js
import { getSectorData } from '../data/sectorService.js';
import { renderHeatmap } from './heatmap.js';
import { getTimeframe, setTimeframe } from '../main.js';
import { renderLastUpdatedLine } from './lastUpdated.js';

export function initSectorHeatmap() {
  const container = document.getElementById('sectors-view');
  if (!container) return;

  const heatmapContainer = container.querySelector('.heatmap-container');
  const lastUpdatedEl = container.querySelector('.last-updated');
  const dropdown = container.querySelector('.timeframe-select');

  if (dropdown) {
    dropdown.value = getTimeframe();
    dropdown.addEventListener('change', () => {
      const tf = dropdown.value;
      setTimeframe(tf);
    });
  }

  async function refresh() {
    const tf = getTimeframe();
    try {
      const data = await getSectorData(tf);
      const { sectors, quotes, weeklyChange, marketCaps, lastQuotesFetch, error } = data;

      // Build tiles with marketCap so treemap can size them
      const tiles = sectors.map((s) => {
        const symbol = s.symbol;
        const q = quotes[symbol] || {};
        const w = weeklyChange[symbol] || {};
        return {
          symbol,
          label: s.name,
          marketCap: marketCaps ? marketCaps[symbol] : null,
          changePct1D: q.changePct1D,
          changePct1W: w.changePct1W,
        };
      });

      renderHeatmap(heatmapContainer, tiles, tf);
      renderLastUpdatedLine(lastUpdatedEl, lastQuotesFetch, tf, error);
    } catch (err) {
      renderLastUpdatedLine(lastUpdatedEl, null, getTimeframe(), err.message);
    }
  }

  // Initial paint
  refresh();
  // Periodic refresh
  setInterval(refresh, 10 * 60 * 1000);

  window.addEventListener('timeframe-changed', () => {
    refresh();
  });
}
