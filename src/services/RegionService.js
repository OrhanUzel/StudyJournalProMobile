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

export function getDefaultLanguage() {
  try {
    let Localization = null;
    try {
      Localization = require('expo-localization');
    } catch (e) {
      Localization = null;
    }
    if (!Localization) return 'en';
    const getLocales = Localization.getLocales?.bind(Localization);
    const locales = typeof getLocales === 'function' ? getLocales() : [];
    const regionCodes = Array.isArray(locales)
      ? locales.map((l) => (l?.regionCode || '').toUpperCase()).filter(Boolean)
      : [];
    const region = (Localization.region || '').toUpperCase();
    const code = (regionCodes[0] || region || '').toUpperCase();
    const arabicRegions = new Set(['PS','AE','SA','IQ','JO','LB','SY','EG','QA','BH','KW','OM','DZ','MA','TN','LY','YE']);
    const spanishRegions = new Set(['ES','MX','CO','AR','CL','PE','VE','EC','GT','CU','DO','HN','NI','CR','PA','UY','PY','BO','SV','PR']);
    if (code === 'TR') return 'tr';
    if (arabicRegions.has(code)) return 'ar';
    if (spanishRegions.has(code)) return 'es';
    const locale = (Localization.locale || '').toLowerCase();
    if (locale.includes('tr') || locale.endsWith('-tr')) return 'tr';
    if (locale.includes('ar') || locale.endsWith('-ar')) return 'ar';
    if (locale.includes('es') || locale.endsWith('-es')) return 'es';
    return 'en';
  } catch (e) {
    return 'en';
  }
}