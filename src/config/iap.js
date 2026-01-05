import { Platform } from 'react-native';
import Constants from 'expo-constants';

const platformKey = () => (Platform.OS === 'ios' ? 'ios' : 'android');

const fallback = {
  products: {
    android: ['premium_lifetime'],
    ios: ['lifetime_premium'], // App Store Connect Product ID ile eşleşiyor
  },
  subscriptions: {
    android: {
      monthly: { sku: 'study_journal_pro', basePlanId: 'monthly-plan' }, // Google Play Console Base Plan ID ile eşleşiyor
      yearly: { sku: 'study_journal_pro', basePlanId: 'yearly-plan' }, // Google Play Console Base Plan ID ile eşleşiyor
    },
    ios: {
      monthly: { sku: 'monthly_premium' }, // App Store Connect Product ID ile eşleşiyor
      yearly: { sku: 'yearly_premium' }, // App Store Connect Product ID ile eşleşiyor
    },
  },
};

const expoExtra = Constants?.expoConfig?.extra?.iap
  || Constants?.manifest?.extra?.iap
  || {};

const safeClone = (obj) => JSON.parse(JSON.stringify(obj));

const resolveProducts = () => {
  const key = platformKey();
  const list = expoExtra?.products?.[key] || fallback.products[key] || [];
  return Array.isArray(list) ? list.filter(Boolean) : [];
};

const resolveSubscriptions = () => {
  const key = platformKey();
  const config = expoExtra?.subscriptions?.[key] || fallback.subscriptions[key] || {};
  return typeof config === 'object' && config ? safeClone(config) : {};
};

export const getProductIds = () => resolveProducts();

export const getSubscriptionConfig = () => resolveSubscriptions();

export const getSubscriptionIds = () => {
  const cfg = resolveSubscriptions();
  return Array.from(
    new Set(
      Object.values(cfg)
        .map((plan) => plan?.sku)
        .filter(Boolean),
    ),
  );
};

export const getPlanConfig = (planKey) => {
  const cfg = resolveSubscriptions();
  return cfg?.[planKey] || null;
};

export default {
  getProductIds,
  getSubscriptionIds,
  getPlanConfig,
  getSubscriptionConfig,
};


