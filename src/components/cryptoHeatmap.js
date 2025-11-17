// components/cryptoHeatmap.js
import { getCryptoData } from '../data/cryptoService.js';
import { renderHeatmap } from './heatmap.js';
import { renderLastUpdatedLine } from './lastUpdated.js';
import { TIMEFRAMES, TIMEFRAME_STORAGE_KEYS } from '../data/constants.js';

export function initCryptoHeatmap() {
  const container = document.getElementById('crypto-view');
  if (!container) return;

  const heatmapContainer = container.querySelector('.heatmap-container');
  const lastUpdatedEl = container.querySelector('.last-updated');
  const dropdown = container.querySelector('.timeframe-select');

  const tfKey =
    (TIMEFRAME_STORAGE_KEYS && TIMEFRAME_STORAGE_KEYS.crypto) ||
    'md_crypto_timeframe';

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

  async function refresh() {
    const tf = currentTimeframe;
    try {
      const data = await getCryptoData();
      const { items, lastFetch, error } = data;

      const tiles = items.map((c) => ({
        symbol: c.symbol,
        label: c.name,
        marketCap: c.marketCap,
        changePct1D: c.changePct1D,
        changePct1W: c.changePct1W,
      }));

      renderHeatmap(heatmapContainer, tiles, tf);
      renderLastUpdatedLine(lastUpdatedEl, lastFetch, tf, error);
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

  // Auto-refresh every 5 minutes
  setInterval(refresh, 5 * 60 * 1000);
}
