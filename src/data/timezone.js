// src/data/timezone.js

export const EST_TIMEZONE = 'America/New_York';

export function toEstIso(date) {
  const estString = date.toLocaleString('en-US', { timeZone: EST_TIMEZONE });
  const estDate = new Date(estString);
  return estDate.toISOString();
}

export function formatEstTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOlderThanMinutes(isoString, minutes, timeZone = EST_TIMEZONE) {
  if (!isoString) return true;
  const now = new Date();
  const nowStr = now.toLocaleString('en-US', { timeZone });
  const nowInZone = new Date(nowStr);
  const thenInZone = new Date(isoString);
  const diffMs = nowInZone - thenInZone;
  return diffMs > minutes * 60 * 1000;
}

export function isDifferentTradingDay(isoA, isoB, timeZone = EST_TIMEZONE) {
  if (!isoA || !isoB) return true;
  const d1 = new Date(new Date(isoA).toLocaleString('en-US', { timeZone }));
  const d2 = new Date(new Date(isoB).toLocaleString('en-US', { timeZone }));
  return d1.toDateString() !== d2.toDateString();
}

// Mon–Fri for the "display week":
// - Mon–Fri before 18:00 EST  => current week
// - Fri after 18:00, Sat, Sun => next week (upcoming Mon–Fri)
export function getCurrentWeekRangeEst(now = new Date()) {
  const estNow = new Date(
    now.toLocaleString('en-US', { timeZone: EST_TIMEZONE })
  );

  const day = estNow.getDay();   // 0=Sun, 1=Mon,...,5=Fri,6=Sat
  const hour = estNow.getHours();

  let reference = new Date(estNow);

  const isAfterFridayClose =
    (day === 5 && hour >= 18) || day === 6 || day === 0;

  if (isAfterFridayClose) {
    // Move reference to next Monday
    const daysToNextMonday = ((8 - day) % 7) || 7;
    reference.setDate(reference.getDate() + daysToNextMonday);
    reference.setHours(0, 0, 0, 0);
  }

  const refDay = reference.getDay();
  const diffToMonday = refDay === 0 ? -6 : 1 - refDay;

  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  return { monday, friday };
}
