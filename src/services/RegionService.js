export function isTurkeyRegion() {
  try {
    let Localization = null;
    try {
      // Use dynamic require to avoid hard failure if the package isn't installed yet
      // eslint-disable-next-line global-require
      Localization = require('expo-localization');
    } catch (e) {
      Localization = null;
    }

    if (!Localization) {
      // Best-effort fallback: not enough info, default to false
      return false;
    }

    const getLocales = Localization.getLocales?.bind(Localization);
    const locales = typeof getLocales === 'function' ? getLocales() : [];
    const regionCodes = Array.isArray(locales)
      ? locales.map((l) => (l?.regionCode || '').toUpperCase()).filter(Boolean)
      : [];
    if (regionCodes.includes('TR')) return true;

    const region = (Localization.region || '').toUpperCase();
    if (region === 'TR') return true;

    // Fallback: locale includes Turkish
    const locale = (Localization.locale || '').toLowerCase();
    if (locale.includes('tr-tr') || locale.endsWith('-tr')) return true;

    return false;
  } catch (e) {
    return false;
  }
}