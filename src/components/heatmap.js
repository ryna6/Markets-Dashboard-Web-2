// components/heatmap.js

// tiles: [{ symbol, label?, marketCap?, changePct1D, changePct1W }]
export function renderHeatmap(container, tiles, timeframe) {
  if (!container) return;

  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  const getSizeClass = createSizeClassLookup(tiles);

  tiles.forEach(tile => {
    const el = document.createElement('div');
    const pct =
      timeframe === '1D' ? tile.changePct1D : tile.changePct1W;

    const colorClass = pctColorClass(pct);
    const sizeClass = getSizeClass(tile.symbol);

    el.className = `heatmap-tile ${colorClass} ${sizeClass}`;

    const pctDisplay =
      pct != null && !Number.isNaN(pct) ? `${pct.toFixed(2)}%` : '--';

    el.innerHTML = `
      <div class="tile-symbol">${tile.symbol}</div>
      ${tile.label ? `<div class="tile-label">${tile.label}</div>` : ''}
      <div class="tile-pct">${pctDisplay}</div>
    `;

    grid.appendChild(el);
  });

  container.appendChild(grid);
}

function pctColorClass(pct) {
  if (pct == null || Number.isNaN(pct)) return 'pct-neutral';
  if (pct > 3) return 'pct-strong-pos';
  if (pct > 0.5) return 'pct-pos';
  if (pct < -3) return 'pct-strong-neg';
  if (pct < -0.5) return 'pct-neg';
  return 'pct-neutral';
}

// Build a lookup for size class based on market cap share
function createSizeClassLookup(tiles) {
  const caps = tiles
    .map(t => t.marketCap)
    .filter(c => typeof c === 'number' && c > 0);

  if (!caps.length) {
    // no market caps – fall back to small tiles
    return () => 'size-small';
  }

  const totalCap = caps.reduce((a, b) => a + b, 0);

  return symbol => {
    const tile = tiles.find(t => t.symbol === symbol);
    if (!tile || !tile.marketCap || !totalCap) return 'size-small';

    const share = tile.marketCap / totalCap;

    // tweak thresholds to taste
    if (share >= 0.04) return 'size-large';      // biggest names
    if (share >= 0.015) return 'size-medium';    // mid group
    return 'size-small';
  };
}
