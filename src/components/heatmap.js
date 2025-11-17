// src/components/heatmap.js

// tiles: [{ symbol, label?, marketCap?, changePct1D, changePct1W, logoUrl? }]
export function renderHeatmap(container, tiles, timeframe) {
  if (!container) return;

  container.innerHTML = '';

  // Filter to valid market caps
  const valid = tiles.filter(
    (t) => typeof t.marketCap === 'number' && t.marketCap > 0
  );
  if (!valid.length) return;

  // Sort descending by market cap so big names dominate top-left region
  const sorted = [...valid].sort((a, b) => b.marketCap - a.marketCap);

  const totalCap = sorted
    .map((t) => t.marketCap)
    .reduce((a, b) => a + b, 0);
  if (!totalCap) return;

  const nodes = sorted.map((t) => ({
    tile: t,
    weight: t.marketCap,
  }));

  // Compute normalized [0,1] treemap rectangles
  const rects = squarifiedTreemap(nodes, 0, 0, 1, 1);

  rects.forEach(({ tile, x, y, w, h }) => {
    const el = document.createElement('div');

    // Pick the right % change based on timeframe, fallback if missing
    const primary =
      timeframe === '1D' ? tile.changePct1D : tile.changePct1W;
    const fallback =
      timeframe === '1D' ? tile.changePct1W : tile.changePct1D;

    const pct =
      primary != null && !Number.isNaN(primary)
        ? primary
        : fallback != null && !Number.isNaN(fallback)
        ? fallback
        : null;

    const colorClass = pctColorClass(pct);

    el.className = `heatmap-tile ${colorClass}`;
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
    el.style.width = `${w * 100}%`;
    el.style.height = `${h * 100}%`;

    const pctDisplay =
      pct != null && !Number.isNaN(pct) ? `${pct.toFixed(2)}%` : '--';

    const logoHtml = tile.logoUrl
      ? `<img class="tile-logo" src="${tile.logoUrl}" alt="${tile.symbol} logo" />`
      : '';

    // New centered column layout: logo (top), ticker (middle), % (bottom)
    el.innerHTML = `
      <div class="tile-content">
        ${logoHtml}
        <div class="tile-symbol">${tile.symbol}</div>
        <div class="tile-pct">${pctDisplay}</div>
      </div>
    `;

    container.appendChild(el);
  });
}

function pctColorClass(pct) {
  if (pct == null || Number.isNaN(pct)) return 'pct-neutral';

  if (pct > 3) return 'pct-strong-pos';
  if (pct > 0.5) return 'pct-pos';
  if (pct < -3) return 'pct-strong-neg';
  if (pct < -0.5) return 'pct-neg';
  return 'pct-neutral';
}

/**
 * Squarified treemap layout
 * - nodes: [{ tile, weight }]
 * - x, y, w, h: numbers in [0,1] representing the rectangle
 * Returns: [{ tile, x, y, w, h }]
 */
function squarifiedTreemap(nodes, x, y, w, h) {
  const result = [];
  const sorted = nodes.filter((n) => n.weight > 0);

  if (!sorted.length) return result;

  // Already sorted by caller (marketCap desc), but ensure it here
  sorted.sort((a, b) => b.weight - a.weight);

  function layoutRow(row, rowSum, originX, originY, width, height, horizontal) {
    const total = rowSum || 1;
    if (horizontal) {
      const rowHeight = (rowSum / totalWeight) * hTotal;
      let xCursor = originX;
      for (const n of row) {
        const fraction = n.weight / rowSum;
        const rw = fraction * width;
        result.push({
          tile: n.tile,
          x: xCursor,
          y: originY,
          w: rw,
          h: rowHeight,
        });
        xCursor += rw;
      }
      return rowHeight;
    } else {
      const rowWidth = (rowSum / totalWeight) * wTotal;
      let yCursor = originY;
      for (const n of row) {
        const fraction = n.weight / rowSum;
        const rh = fraction * height;
        result.push({
          tile: n.tile,
          x: originX,
          y: yCursor,
          w: rowWidth,
          h: rh,
        });
        yCursor += rh;
      }
      return rowWidth;
    }
  }

  // Implementation adapted into a simpler form:
  // we keep track of "short side" and add items to a row while
  // it improves aspect ratio, then lay out the row and continue.

  let x0 = x;
  let y0 = y;
  let wTotal = w;
  let hTotal = h;
  let totalWeight = sorted.reduce((acc, n) => acc + n.weight, 0);

  let row = [];
  let rowSum = 0;
  let horizontal = wTotal >= hTotal; // first split along longer side

  const remaining = [...sorted];

  function worstAspect(row, rowSum, shortSide) {
    if (!row.length || rowSum === 0) return Infinity;
    let max = -Infinity;
    let min = Infinity;
    for (const n of row) {
      if (n.weight > max) max = n.weight;
      if (n.weight < min) min = n.weight;
    }
    const s2 = shortSide * shortSide;
    return Math.max((s2 * max) / (rowSum * rowSum), (rowSum * rowSum) / (s2 * min));
  }

  while (remaining.length) {
    const n = remaining[0];
    const shortSide = horizontal ? hTotal : wTotal;

    if (!row.length) {
      row.push(n);
      rowSum = n.weight;
      remaining.shift();
      continue;
    }

    const currentAspect = worstAspect(row, rowSum, shortSide);
    const newAspect = worstAspect([...row, n], rowSum + n.weight, shortSide);

    if (newAspect <= currentAspect) {
      // Adding this node improves or keeps aspect ratio
      row.push(n);
      rowSum += n.weight;
      remaining.shift();
    } else {
      // Lay out current row
      const totalRowWeight = rowSum;
      const total = totalWeight || 1;

      if (horizontal) {
        const rowHeight = (totalRowWeight / total) * hTotal;
        let xCursor = x0;
        for (const r of row) {
          const frac = r.weight / totalRowWeight;
          const rw = frac * wTotal;
          result.push({
            tile: r.tile,
            x: xCursor,
            y: y0,
            w: rw,
            h: rowHeight,
          });
          xCursor += rw;
        }
        y0 += rowHeight;
        hTotal -= rowHeight;
      } else {
        const rowWidth = (totalRowWeight / total) * wTotal;
        let yCursor = y0;
        for (const r of row) {
          const frac = r.weight / totalRowWeight;
          const rh = frac * hTotal;
          result.push({
            tile: r.tile,
            x: x0,
            y: yCursor,
            w: rowWidth,
            h: rh,
          });
          yCursor += rh;
        }
        x0 += rowWidth;
        wTotal -= rowWidth;
      }

      totalWeight -= totalRowWeight;
      row = [];
      rowSum = 0;
      horizontal = wTotal >= hTotal;
    }
  }

  // Layout any remaining row
  if (row.length && totalWeight > 0) {
    const totalRowWeight = rowSum;
    const total = totalWeight || 1;

    if (horizontal) {
      const rowHeight = (totalRowWeight / total) * hTotal;
      let xCursor = x0;
      for (const r of row) {
        const frac = r.weight / totalRowWeight;
        const rw = frac * wTotal;
        result.push({
          tile: r.tile,
          x: xCursor,
          y: y0,
          w: rw,
          h: rowHeight,
        });
        xCursor += rw;
      }
    } else {
      const rowWidth = (totalRowWeight / total) * wTotal;
      let yCursor = y0;
      for (const r of row) {
        const frac = r.weight / totalRowWeight;
        const rh = frac * hTotal;
        result.push({
          tile: r.tile,
          x: x0,
          y: yCursor,
          w: rowWidth,
          h: rh,
        });
        yCursor += rh;
      }
    }
  }

  return result;
}
