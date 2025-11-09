import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCT_IDS = ['remove_ads'];
const ADS_DISABLED_KEY = 'adsDisabled';

function getIapModule() {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS !== 'android' || isExpoGo) {
    return null;
  }
  try {
    // Dynamic require to avoid bundling issues on unsupported platforms
    // eslint-disable-next-line global-require
    const RNIap = require('react-native-iap');
    return RNIap;
  } catch (e) {
    return null;
  }
}

export async function initIap() {
  const RNIap = getIapModule();
  if (!RNIap) return false;
  try {
    await RNIap.initConnection();
    return true;
  } catch (e) {
    console.warn('IAP init error:', e);
    return false;
  }
}

export async function getProducts() {
  const RNIap = getIapModule();
  if (!RNIap) return [];
  try {
    const products = await RNIap.getProducts(PRODUCT_IDS);
    return products || [];
  } catch (e) {
    console.warn('getProducts error:', e);
    return [];
  }
}

export async function buyRemoveAds() {
  const RNIap = getIapModule();
  if (!RNIap) {
    console.warn('IAP not available on this environment');
    return false;
  }
  try {
    let purchase;
    try {
      // Newer API: requestPurchase(productId)
      purchase = await RNIap.requestPurchase('remove_ads');
    } catch (e) {
      // Fallback for older API: requestPurchase({ sku })
      purchase = await RNIap.requestPurchase({ sku: 'remove_ads' });
    }
    try {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } catch (e2) {
      // Some versions expect finishTransaction(purchase)
      await RNIap.finishTransaction(purchase, false);
    }
    await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
    return true;
  } catch (e) {
    console.warn('purchase error:', e);
    return false;
  }
}

export async function restorePurchases() {
  const RNIap = getIapModule();
  if (!RNIap) {
    console.warn('IAP not available on this environment');
    return false;
  }
  try {
    const purchases = await RNIap.getAvailablePurchases();
    const hasRemoveAds = Array.isArray(purchases) && purchases.some((p) => p.productId === 'remove_ads' || p.productId === 'remove_ads.android');
    await AsyncStorage.setItem(ADS_DISABLED_KEY, hasRemoveAds ? 'true' : 'false');
    return hasRemoveAds;
  } catch (e) {
    console.warn('restore error:', e);
    return false;
  }
}

export async function isAdsDisabled() {
  try {
    const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
    return flag === 'true';
  } catch (e) {
    return false;
  }
}

export async function setAdsDisabled(value) {
  try {
    await AsyncStorage.setItem(ADS_DISABLED_KEY, value ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
}