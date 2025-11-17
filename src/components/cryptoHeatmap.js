// components/cryptoHeatmap.js
import { getCryptoData } from '../data/cryptoService.js';
import { renderHeatmap } from './heatmap.js';
import { getTimeframe, setTimeframe } from '../main.js';
import { renderLastUpdatedLine } from './lastUpdated.js';

export function initCryptoHeatmap({ getTimeframe: _getTimeframeArg }) {
  const container = document.getElementById('crypto-view');
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
      const data = await getCryptoData();
      const { items, lastFetch, error } = data;

      const tiles = items.map(c => ({
        symbol: c.symbol,
        label: c.name,
        marketCap: c.marketCap,
        changePct1D: c.changePct1D,
        changePct1W: c.changePct1W
      }));

      renderHeatmap(heatmapContainer, tiles, tf);
      renderLastUpdatedLine(lastUpdatedEl, lastFetch, tf, error);
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

  // Auto-refresh every 5 minutes
  setInterval(refresh, 5 * 60 * 1000);

  // React to timeframe changes
  window.addEventListener('timeframe-changed', () => {
    refresh();
  });
}
