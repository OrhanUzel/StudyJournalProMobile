import { Platform } from 'react-native';
import Constants from 'expo-constants';

const platformKey = () => (Platform.OS === 'ios' ? 'ios' : 'android');

// AdMob Standard Test IDs
const testIds = {
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
  },
  interstitial: {
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  },
};

const expoExtra = Constants?.expoConfig?.extra?.adMob
  || Constants?.manifest?.extra?.adMob
  || {};

// .env'deki yerel kimlikleri öncele (hem EXPO_PUBLIC_* hem de düz isimler)
const envOverrides = {
  banner: {
    android: process.env.EXPO_PUBLIC_ANDROID_BANNER_ID || process.env.ANDROID_BANNER_ID,
    ios: process.env.EXPO_PUBLIC_IOS_BANNER_ID || process.env.IOS_BANNER_ID,
  },
  interstitial: {
    android: process.env.EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID || process.env.ANDROID_INTERSTITIAL_ID,
    ios: process.env.EXPO_PUBLIC_IOS_INTERSTITIAL_ID || process.env.IOS_INTERSTITIAL_ID,
  },
  appId: {
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || process.env.ADMOB_ANDROID_APP_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || process.env.ADMOB_IOS_APP_ID,
  },
};

const resolveId = (type) => {
  const key = platformKey();
  if (__DEV__ && testIds[type]?.[key]) {
    return testIds[type][key];
  }
  return (
    envOverrides?.[type]?.[key]
    || expoExtra?.[type]?.[key]
    || ''
  );
};

export const getBannerUnitId = () => resolveId('banner');
export const getInterstitialUnitId = () => resolveId('interstitial');
export const getAppId = () => resolveId('appId');

export default {
  getBannerUnitId,
  getInterstitialUnitId,
  getAppId,
};

