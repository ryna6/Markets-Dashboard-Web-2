// components/lastUpdated.js
import { formatEstTime } from '../data/timezone.js';

export function renderLastUpdatedLine(el, lastIso, timeframe, error) {
  if (!lastIso) {
    el.textContent = error
      ? `Last updated: -- (${timeframe}) – error: ${error}`
      : `Last updated: -- (${timeframe})`;
    return;
  }
  const formatted = formatEstTime(lastIso);
  if (error) {
    el.textContent = `Last updated: ${formatted} (${timeframe}) – last refresh failed`;
  } else {
    el.textContent = `Last updated: ${formatted} (${timeframe})`;
  }
}
