// src/components/sectorHeatmap.js
import { getSectorData, resetSectorCache } from '../data/sectorService.js';
import { resetSp500Cache } from '../data/stocksService.js';
import { renderHeatmap } from './heatmap.js';
import { renderLastUpdatedLine } from './lastUpdated.js';

export function initSectorHeatmap() {
  const view = document.getElementById('sectors-view');
  if (!view) {
    console.warn('Sector view container not found');
    return;
  }

  const heatmapEl = view.querySelector('.heatmap-container');
  const lastUpdatedEl = view.querySelector('.last-updated');
  const refreshBtn = view.querySelector('.sectors-refresh-btn');

  if (!heatmapEl) {
    console.warn('Sector heatmap container not found');
    return;
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Clear BOTH Sector and S&P caches
      resetSectorCache();
      resetSp500Cache();
      refresh();
    });
  }

  async function refresh() {
    const timeframe = '1D'; // Sectors only show 1D now
    try {
      const {
        sectors,
        quotes,
        marketCaps,
        lastQuotesFetch,
        error,
      } = await getSectorData();

      const tiles = sectors.map((s) => {
        const symbol = s.symbol;
        const q = quotes[symbol] || {};
        const cap =
          marketCaps &&
          typeof marketCaps[symbol] === 'number' &&
          marketCaps[symbol] > 0
            ? marketCaps[symbol]
            : 1;

        return {
          symbol,
          label: s.name,
          marketCap: cap,
          changePct1D: q.changePct1D,
          // changePct1W unused
        };
      });

      renderHeatmap(heatmapEl, tiles, timeframe);
      renderLastUpdatedLine(lastUpdatedEl, lastQuotesFetch, timeframe, error);
    } catch (err) {
      console.error('Sector refresh error', err);
      renderLastUpdatedLine(
        lastUpdatedEl,
        null,
        '1D',
        err.message
      );
    }
  }

  // Initial paint
  refresh();
  // Periodic refresh every 10 minutes
  setInterval(refresh, 10 * 60 * 1000);
}
