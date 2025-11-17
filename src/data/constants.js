// constants.js
export const TIMEFRAMES = {
  ONE_DAY: '1D',
  ONE_WEEK: '1W',
};

export const STORAGE_KEYS = {
  // Legacy global timeframe key (no longer used for new code)
  timeframe: 'md_timeframe',
  sp500Cache: 'md_sp500_cache',
  sectorCache: 'md_sector_cache',
  cryptoCache: 'md_crypto_cache',
  earningsCache: 'md_earnings_cache',
  companyProfilesCache: 'companyProfilesCache',
};

export const TIMEFRAME_STORAGE_KEYS = {
  sp500: 'md_sp500_timeframe',
  sectors: 'md_sectors_timeframe',
  crypto: 'md_crypto_timeframe',
};
