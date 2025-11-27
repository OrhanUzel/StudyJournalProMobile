import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNIap from 'react-native-iap';

// Ürün ID'lerini buraya Google Play Console'daki ile BİREBİR aynı olacak şekilde yazmalısın.
const PRODUCT_IDS = ['premium_lifetime'];
const SUBSCRIPTION_IDS = ['study_journal_pro'];
const ADS_DISABLED_KEY = 'adsDisabled';

let RNIapModule = null;
const premiumListeners = new Set();

function emitPremiumStatus(status) {
  try {
    premiumListeners.forEach((fn) => {
      try { fn(status); } catch {}
    });
  } catch {}
}

export function onPremiumStatusChange(listener) {
  premiumListeners.add(listener);
  return () => premiumListeners.delete(listener);
}

function getIapModule() {
  const isExpoGo = Constants?.appOwnership === 'expo';
  // iOS desteğini şimdilik Android odaklı olduğun için kapattım, istersen açabilirsin.
  if (Platform.OS !== 'android' || isExpoGo) {
    return null;
  }
  if (RNIapModule) return RNIapModule;
  
  try {
    // eslint-disable-next-line global-require
    RNIapModule = require('react-native-iap');
    return RNIapModule;
  } catch (e) {
    return null;
  }
}

const IAP_ENABLED = Platform.OS === 'android' && Constants?.appOwnership !== 'expo';

export async function initIap() {
  if (!IAP_ENABLED) return false;
  try {
    await RNIap.initConnection();
    try { await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.(); } catch {}
    try {
      const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
      emitPremiumStatus({ active: flag === 'true' });
    } catch {}
    return true;
  } catch (e) {
    console.warn('IAP init error:', e);
    return false;
  }
}

export async function getProducts() {
  if (!IAP_ENABLED) return [];
  try {
    let products = [];
    if (typeof RNIap.fetchProducts === 'function') {
      products = await RNIap.fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
    } else if (typeof RNIap.getProducts === 'function') {
      products = await RNIap.getProducts({ skus: PRODUCT_IDS });
    } else {
      console.warn('getProducts not available on RNIap module');
      return [];
    }
    return products || [];
  } catch (e) {
    console.warn('getProducts error:', e);
    return [];
  }
}

export async function getSubscriptions() {
  if (!IAP_ENABLED) return [];
  try {
    let subs = [];
    if (typeof RNIap.fetchProducts === 'function') {
      subs = await RNIap.fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' });
    } else if (typeof RNIap.getSubscriptions === 'function') {
      subs = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_IDS });
    } else {
      console.warn('getSubscriptions not available on RNIap module');
      return [];
    }
    return subs || [];
  } catch (e) {
    console.warn('getSubscriptions error:', e);
    return [];
  }
}

function extractOfferByBasePlan(subscriptions, basePlanId) {
  try {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return null;
    for (const sub of subscriptions) {
      const details = sub?.subscriptionOfferDetails || sub?.subscriptionOfferDetailsAndroid || [];
      if (!Array.isArray(details)) continue;
      const offer = details.find(o => o?.basePlanId === basePlanId);
      if (offer) {
        const firstPhase = offer?.pricingPhases?.pricingPhaseList?.[0] || null;
        const price = firstPhase?.formattedPrice || firstPhase?.priceFormatted || null;
        const offerToken = offer?.offerToken || offer?.offerIdToken || offer?.offerTokenCode || null;
        const sku = sub?.productId || sub?.id || sub?.sku || null;
        return { sku, offerToken, price };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// DÜZELTME: productOrSku parametresi eklendi.
// Artık SettingsScreen'den bulduğun doğru ürünü buraya göndereceğiz.
export async function buyRemoveAds(productOrSku) {
  if (!IAP_ENABLED) return false;
  
  try {
    let purchase;
    const skuToBuy = (productOrSku && typeof productOrSku === 'object'
      ? (productOrSku.productId || productOrSku.id || productOrSku.sku)
      : productOrSku) || 'premium_lifetime';

    console.log("Satın alma başlatılıyor SKU:", skuToBuy);

    try {
      if (typeof RNIap.requestPurchase !== 'function') {
        console.warn('requestPurchase not available on RNIap module');
        return false;
      }
      purchase = await RNIap.requestPurchase({ request: { android: { skus: [skuToBuy] } }, type: 'in-app' });
    } catch (e) {
      console.warn("requestPurchase hatası:", e);
      return false;
    }

    if (Array.isArray(purchase) ? purchase.length === 0 : !purchase) return false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    const purchaseToken = normalizedPurchase && normalizedPurchase.purchaseToken ? normalizedPurchase.purchaseToken : null;
    
    if (purchaseToken) {
        try {
           if (typeof RNIap.finishTransaction === 'function' && normalizedPurchase) {
             await RNIap.finishTransaction({ purchase: normalizedPurchase, isConsumable: false });
           }
        } catch (e2) {
           console.warn("finishTransaction hatası", e2);
        }
    }

    // Başarılı sayıyoruz
    await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
    emitPremiumStatus({ active: true, type: 'lifetime' });
    return true;

  } catch (e) {
    console.warn('purchase generic error:', e);
    return false;
  }
}

export async function buyPremiumMonthly() {
  if (!IAP_ENABLED) return false;
  
  try {
    const subs = await getSubscriptions();
    console.log("✅ Abonelikler yüklendi:", JSON.stringify(subs, null, 2)); // DEBUG
    
    const offer = extractOfferByBasePlan(subs, 'monthly') || extractOfferByBasePlan(subs, 'monthly-plan');
    console.log("✅ Monthly offer:", offer); // DEBUG
    
    if (!offer) {
        console.warn("❌ Aylık plan teklifi bulunamadı. Mevcut basePlanId'leri kontrol et.");
        // Tüm mevcut basePlanId'leri göster
        if (subs?.[0]?.subscriptionOfferDetails) {
          console.log("Mevcut basePlanId'ler:", 
            subs[0].subscriptionOfferDetails.map(d => d.basePlanId)
          );
        }
        return false;
    }

    if (typeof RNIap.requestPurchase !== 'function') {
      console.warn('requestSubscription not available on RNIap module');
      return false;
    }
    const purchase = await RNIap.requestPurchase({ request: { android: { skus: [offer.sku], subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }] } }, type: 'subs' });

    let success = false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    if (normalizedPurchase) {
      try {
        if (typeof RNIap.finishTransaction === 'function') {
          await RNIap.finishTransaction({ purchase: normalizedPurchase, isConsumable: false });
        }
      } catch {}
    }
    try {
      const active = await restorePurchases();
      success = !!active;
    } catch {}
    if (success) {
      await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
      emitPremiumStatus({ active: true, type: 'monthly' });
      return true;
    }
    return false;
  
  } catch (e) {
    const msg = String(e?.message || '');
    if (/ALREADY_OWNED|already owned|Item already owned/i.test(msg)) {
      try {
        const active = await restorePurchases();
        if (active) {
          await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
          emitPremiumStatus({ active: true, type: 'subscription' });
          return true;
        }
      } catch {}
    }
    console.error('❌ Abonelik hatası detay:', e.message, e);
    return false;
  }
}

export async function buyPremiumYearly() {
  if (!IAP_ENABLED) return false;

  try {
    const subs = await getSubscriptions();
    console.log("✅ Abonelikler yüklendi:", JSON.stringify(subs, null, 2)); // DEBUG
    
    const offer = extractOfferByBasePlan(subs, 'yearly') || extractOfferByBasePlan(subs, 'yearly-plan');
    console.log("✅ Yearly offer:", offer); // DEBUG

    if (!offer) {
        console.warn("❌ Yıllık plan teklifi bulunamadı. Mevcut basePlanId'leri kontrol et.");
        if (subs?.[0]?.subscriptionOfferDetails) {
          console.log("Mevcut basePlanId'ler:", 
            subs[0].subscriptionOfferDetails.map(d => d.basePlanId)
          );
        }
        return false;
    }

    if (typeof RNIap.requestPurchase !== 'function') {
      console.warn('requestSubscription not available on RNIap module');
      return false;
    }
    const purchase = await RNIap.requestPurchase({ request: { android: { skus: [offer.sku], subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }] } }, type: 'subs' });

    let success = false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    if (normalizedPurchase) {
      try {
        if (typeof RNIap.finishTransaction === 'function') {
          await RNIap.finishTransaction({ purchase: normalizedPurchase, isConsumable: false });
        }
      } catch {}
    }
    try {
      const active = await restorePurchases();
      success = !!active;
    } catch {}
    if (success) {
      await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
      emitPremiumStatus({ active: true, type: 'yearly' });
      return true;
    }
    return false;

  } catch (e) {
    const msg = String(e?.message || '');
    if (/ALREADY_OWNED|already owned|Item already owned/i.test(msg)) {
      try {
        const active = await restorePurchases();
        if (active) {
          await AsyncStorage.setItem(ADS_DISABLED_KEY, 'true');
          emitPremiumStatus({ active: true, type: 'subscription' });
          return true;
        }
      } catch {}
    }
    console.error('❌ Abonelik hatası detay:', e.message, e);
    return false;
  }
}

export async function restorePurchases() {
  if (!IAP_ENABLED) return false;
  
  try {
    if (typeof RNIap.getAvailablePurchases !== 'function') {
      console.warn('getAvailablePurchases not available on RNIap module');
      return false;
    }
    const purchases = await RNIap.getAvailablePurchases();
    
    // Kullanıcının aktif satın alımlarını kontrol et
    const hasLifetime = Array.isArray(purchases) && purchases.some((p) => {
      const id = p && p.productId;
      return PRODUCT_IDS.includes(id); // Listemizdeki herhangi biri varsa kabul et
    });

    const hasSub = Array.isArray(purchases) && purchases.some((p) => {
      const id = p && p.productId;
      return SUBSCRIPTION_IDS.includes(id);
    });

    const active = !!hasLifetime || !!hasSub;
    await AsyncStorage.setItem(ADS_DISABLED_KEY, active ? 'true' : 'false');
    let type = null;
    let expiry = null;
    let autoRenewing = null;
    if (hasLifetime) type = 'lifetime';
    if (hasSub) {
      type = 'subscription';
      try {
        const sub = purchases.find((p) => SUBSCRIPTION_IDS.includes(p?.productId));
        expiry = sub?.expiryTimeAndroid ? Number(sub.expiryTimeAndroid) : null;
        autoRenewing = typeof sub?.autoRenewingAndroid === 'boolean' ? sub.autoRenewingAndroid : null;
      } catch {}
    }
    emitPremiumStatus({ active, type, expiryTime: expiry, autoRenewing });
    return active;
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

export async function getPremiumStatus() {
  try {
    if (!IAP_ENABLED || typeof RNIap.getAvailablePurchases !== 'function') {
      const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
      return { active: flag === 'true' };
    }
    const purchases = await RNIap.getAvailablePurchases();
    const hasLifetime = Array.isArray(purchases) && purchases.some((p) => PRODUCT_IDS.includes(p?.productId));
    const sub = Array.isArray(purchases) ? purchases.find((p) => SUBSCRIPTION_IDS.includes(p?.productId)) : null;
    const active = !!hasLifetime || !!sub;
    const status = {
      active,
      type: hasLifetime ? 'lifetime' : (sub ? 'subscription' : null),
      expiryTime: sub?.expiryTimeAndroid ? Number(sub.expiryTimeAndroid) : null,
      autoRenewing: typeof sub?.autoRenewingAndroid === 'boolean' ? sub.autoRenewingAndroid : null,
    };
    await AsyncStorage.setItem(ADS_DISABLED_KEY, active ? 'true' : 'false');
    emitPremiumStatus(status);
    return status;
  } catch {
    const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY).catch(() => 'false');
    return { active: flag === 'true' };
  }
}