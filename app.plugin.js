const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Ensure MainActivity has android:windowSoftInputMode set.
 * Default mode: 'adjustResize'.
 */
function setWindowSoftInputMode(manifest, mode = 'adjustResize') {
  try {
    const app = manifest?.manifest?.application?.[0];
    if (!app) return manifest;

    const activities = app['activity'] ?? [];
    // Heuristic: main activity is the one with LAUNCHER category
    // or name ending with 'MainActivity'.
    const mainActivity = activities.find((activity) => {
      const attrs = activity?.['$'] ?? {};
      const name = attrs['android:name'] ?? '';
      const intentFilters = activity['intent-filter'] ?? [];
      const hasLauncher = intentFilters.some((filter) => {
        const categories = filter['category'] ?? [];
        return categories.some((c) => c?.['$']?.['android:name'] === 'android.intent.category.LAUNCHER');
      });
      return hasLauncher || name.endsWith('MainActivity') || name === '.MainActivity';
    });

    if (mainActivity) {
      mainActivity['$'] = mainActivity['$'] || {};
      mainActivity['$']['android:windowSoftInputMode'] = mode;
    }
  } catch (e) {
    // Silently ignore to avoid breaking prebuild; user can inspect logs if needed
  }
  return manifest;
}

module.exports = function withWindowSoftInputMode(config, props = { mode: 'adjustResize' }) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    cfg.modResults = setWindowSoftInputMode(manifest, props?.mode);

    try {
      const appManifest = cfg.modResults?.manifest || {};
      const usesPermissions = appManifest['uses-permission'] || [];
      const hasBilling = usesPermissions.some((p) => p?.['$']?.['android:name'] === 'com.android.vending.BILLING');
      if (!hasBilling) {
        usesPermissions.push({
          $: { 'android:name': 'com.android.vending.BILLING' },
        });
        appManifest['uses-permission'] = usesPermissions;
      }
    } catch (e) {
      // silent: avoid breaking prebuild
    }

    return cfg;
  });
};