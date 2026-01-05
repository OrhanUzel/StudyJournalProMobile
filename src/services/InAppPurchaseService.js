import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNIap from 'react-native-iap';
import { getProductIds, getSubscriptionIds, getPlanConfig } from '../config/iap';

const PRODUCT_IDS = getProductIds();
const SUBSCRIPTION_IDS = getSubscriptionIds();
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

const isExpoGo = Constants?.appOwnership === 'expo';
const isSupportedPlatform = (Platform.OS === 'android' || Platform.OS === 'ios') && !isExpoGo;

function getIapModule() {
  if (!isSupportedPlatform) {
    return null;
  }
  if (RNIapModule) return RNIapModule;
  try {
    RNIapModule = require('react-native-iap'); // eslint-disable-line global-require
    return RNIapModule;
  } catch {
    return null;
  }
}

const IAP_ENABLED = !!getIapModule();

const firstProductSku = PRODUCT_IDS?.[0] || null;

const parseExpiry = (purchase) => {
  if (!purchase) return null;
  if (Platform.OS === 'android') {
    return purchase?.expiryTimeAndroid ? Number(purchase.expiryTimeAndroid) : null;
  }
  return (
    (purchase?.expirationTime && Number(purchase.expirationTime))
    || (purchase?.expirationDate && Number(purchase.expirationDate))
    || (purchase?.expiresDateMs && Number(purchase.expiresDateMs))
    || null
  );
};

const parseAutoRenewing = (purchase) => {
  if (!purchase) return null;
  if (Platform.OS === 'android') {
    return typeof purchase?.autoRenewingAndroid === 'boolean' ? purchase.autoRenewingAndroid : null;
  }
  if (typeof purchase?.autoRenewingIOS === 'boolean') {
    return purchase.autoRenewingIOS;
  }
  return null;
};

async function finalizePurchase(purchase) {
  if (!purchase) return;
  try {
    if (typeof RNIap.finishTransaction === 'function') {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
      return;
    }
  } catch {}
  if (Platform.OS === 'ios' && typeof RNIap.finishTransactionIOS === 'function') {
    try {
      await RNIap.finishTransactionIOS(purchase?.transactionId || purchase?.transactionIdentifier);
    } catch {}
  }
}

export async function initIap() {
  if (!IAP_ENABLED) return false;
  try {
    await RNIap.initConnection();
    try {
      if (Platform.OS === 'android') {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
      } else if (Platform.OS === 'ios') {
        await RNIap.clearTransactionIOS?.();
      }
    } catch {}
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
  if (!PRODUCT_IDS.length) return [];
  try {
    let products = [];
    if (typeof RNIap.fetchProducts === 'function') {
      // iOS ve Android için fetchProducts kullan
      products = await RNIap.fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
    } else if (typeof RNIap.getProducts === 'function') {
      // iOS için productIds, Android için skus kullanılabilir
      if (Platform.OS === 'ios') {
        products = await RNIap.getProducts({ productIds: PRODUCT_IDS });
      } else {
        products = await RNIap.getProducts({ skus: PRODUCT_IDS });
      }
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
  if (!SUBSCRIPTION_IDS.length) return [];
  try {
    let subs = [];
    console.log('getSubscriptions: Fetching subscriptions for IDs:', SUBSCRIPTION_IDS);
    
    if (Platform.OS === 'android') {
      // Android için önce getSubscriptions dene (daha güvenilir)
      if (typeof RNIap.getSubscriptions === 'function') {
        try {
          subs = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_IDS });
          console.log('getSubscriptions: getSubscriptions returned', subs?.length || 0, 'subscriptions');
        } catch (e1) {
          console.warn('getSubscriptions: getSubscriptions failed, trying fetchProducts:', e1);
        }
      }
      
      // Eğer getSubscriptions çalışmadıysa veya sonuç yoksa fetchProducts dene
      if ((!subs || subs.length === 0) && typeof RNIap.fetchProducts === 'function') {
        try {
          subs = await RNIap.fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' });
          console.log('getSubscriptions: fetchProducts returned', subs?.length || 0, 'subscriptions');
        } catch (e2) {
          console.warn('getSubscriptions: fetchProducts also failed:', e2);
        }
      }
    } else {
      // iOS için
      if (typeof RNIap.fetchProducts === 'function') {
        subs = await RNIap.fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' });
        console.log('getSubscriptions: fetchProducts returned', subs?.length || 0, 'subscriptions');
      } else if (typeof RNIap.getSubscriptions === 'function') {
        subs = await RNIap.getSubscriptions({ productIds: SUBSCRIPTION_IDS });
        console.log('getSubscriptions: getSubscriptions returned', subs?.length || 0, 'subscriptions');
      }
    }
    
    if (!subs || subs.length === 0) {
      console.warn('getSubscriptions: No subscriptions returned');
      return [];
    }
    
    if (Platform.OS === 'android' && subs.length > 0) {
      // Android subscription yapısını detaylı debug et
      console.log('getSubscriptions: First subscription keys:', Object.keys(subs[0]));
      console.log('getSubscriptions: First subscription full structure:', JSON.stringify(subs[0], null, 2));
      if (subs[0].subscriptionOfferDetailsAndroid) {
        console.log('getSubscriptions: subscriptionOfferDetailsAndroid count:', subs[0].subscriptionOfferDetailsAndroid.length);
        if (subs[0].subscriptionOfferDetailsAndroid.length > 0) {
          console.log('getSubscriptions: First offer detail:', JSON.stringify(subs[0].subscriptionOfferDetailsAndroid[0], null, 2));
        }
      }
      if (subs[0].subscriptionOfferDetails) {
        console.log('getSubscriptions: subscriptionOfferDetails count:', subs[0].subscriptionOfferDetails.length);
      }
    }
    
    return subs || [];
  } catch (e) {
    console.warn('getSubscriptions error:', e);
    return [];
  }
}

function extractOfferByBasePlan(subscriptions, basePlanId) {
  try {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      console.warn('extractOfferByBasePlan: No subscriptions provided');
      return null;
    }
    
    console.log('extractOfferByBasePlan: Looking for basePlanId:', basePlanId);
    console.log('extractOfferByBasePlan: Subscriptions count:', subscriptions.length);
    
    for (const sub of subscriptions) {
      const sku = sub?.productId || sub?.id || sub?.sku || null;
      console.log('extractOfferByBasePlan: Checking subscription SKU:', sku);
      
      // Android için subscriptionOfferDetailsAndroid, iOS için subscriptionOfferDetails
      // Farklı property isimlerini de kontrol et
      let details = sub?.subscriptionOfferDetailsAndroid 
        || sub?.subscriptionOfferDetails 
        || sub?.offers
        || sub?.subscriptionOffers
        || [];
      
      // Eğer details bir obje ise, array'e çevir
      if (details && !Array.isArray(details) && typeof details === 'object') {
        if (details.pricingPhases || details.basePlanId) {
          // Tek bir offer objesi gibi görünüyor, array'e çevir
          details = [details];
        } else {
          // Belki bir obje içinde array var
          details = Object.values(details).filter(Array.isArray).flat() || [];
        }
      }
      
      if (!Array.isArray(details)) {
        console.warn('extractOfferByBasePlan: Details is not an array for SKU:', sku, 'Type:', typeof details);
        console.warn('extractOfferByBasePlan: Subscription object keys:', Object.keys(sub));
        continue;
      }
      
      console.log('extractOfferByBasePlan: Found', details.length, 'offer details for SKU:', sku);
      
      // Tüm base plan ID'lerini logla
      details.forEach((d, idx) => {
        console.log(`extractOfferByBasePlan: Offer ${idx} basePlanId:`, d?.basePlanId, 'Full offer:', JSON.stringify(d, null, 2));
      });
      
      // Base plan ID'yi bul (hem tam eşleşme hem de alternatif formatları dene)
      const offer = details.find(o => {
        const offerBasePlanId = o?.basePlanId;
        if (!offerBasePlanId) return false;
        // Tam eşleşme
        if (offerBasePlanId === basePlanId) return true;
        // Alternatif formatlar
        if (offerBasePlanId === basePlanId.replace('-plan', '')) return true;
        if (offerBasePlanId === basePlanId.replace('-', '_')) return true;
        if (offerBasePlanId === basePlanId.replace('_', '-')) return true;
        // Tersine kontrol (monthly-plan vs monthly)
        if (basePlanId === offerBasePlanId.replace('-plan', '')) return true;
        return false;
      });
      
      if (offer) {
        const firstPhase = offer?.pricingPhases?.pricingPhaseList?.[0] || null;
        const price = firstPhase?.formattedPrice || firstPhase?.priceFormatted || null;
        const offerToken = offer?.offerToken || offer?.offerIdToken || offer?.offerTokenCode || null;
        console.log('extractOfferByBasePlan: Found matching offer! SKU:', sku, 'OfferToken:', offerToken);
        return { sku, offerToken, price };
      }
    }
    
    console.warn('extractOfferByBasePlan: No matching offer found for basePlanId:', basePlanId);
    return null;
  } catch (e) {
    console.error('extractOfferByBasePlan error:', e);
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
      ? (productOrSku.productId || productOrSku.productIdentifier || productOrSku.id || productOrSku.sku)
      : productOrSku) || firstProductSku;

    console.log("Satın alma başlatılıyor SKU:", skuToBuy, "Platform:", Platform.OS);

    try {
      if (typeof RNIap.requestPurchase !== 'function') {
        console.warn('requestPurchase not available on RNIap module');
        return false;
      }
      
      if (Platform.OS === 'android') {
        // Android için yeni API formatını dene, yoksa eski formatı kullan
        try {
          purchase = await RNIap.requestPurchase({ 
            request: { android: { skus: [skuToBuy] } }, 
            type: 'in-app' 
          });
        } catch (e1) {
          // Eski API formatını dene
          purchase = await RNIap.requestPurchase({ 
            sku: skuToBuy, 
            andDangerousAndroidParams: { showInAppMessages: true } 
          });
        }
      } else if (Platform.OS === 'ios') {
        // iOS için doğru format kontrolü
        if (!skuToBuy) {
          console.warn('iOS: SKU is required for purchase');
          return false;
        }
        
        // iOS'ta requestPurchase için sku property'si kullanılmalı
        try {
          purchase = await RNIap.requestPurchase({ sku: skuToBuy });
        } catch (e1) {
          // Bazı versiyonlarda productId kullanılabilir
          try {
            purchase = await RNIap.requestPurchase({ productId: skuToBuy });
          } catch (e2) {
            console.error('iOS requestPurchase failed with both formats:', e2);
            throw e2;
          }
        }
      } else {
        console.warn('Unsupported platform for IAP');
        return false;
      }
    } catch (e) {
      console.warn("requestPurchase hatası:", e);
      return false;
    }

    if (Array.isArray(purchase) ? purchase.length === 0 : !purchase) return false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    await finalizePurchase(normalizedPurchase);

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
    const planConfig = getPlanConfig('monthly');
    if (!planConfig?.sku) {
      console.warn('Monthly plan configuration missing for current platform.');
      return false;
    }
    let purchase;
    
    if (Platform.OS === 'android') {
      const subs = await getSubscriptions();
      console.log('buyPremiumMonthly: Loaded subscriptions:', subs?.length || 0);
      if (subs?.length > 0) {
        console.log('buyPremiumMonthly: First subscription structure:', JSON.stringify(subs[0], null, 2));
      }
      const offer = extractOfferByBasePlan(subs, planConfig.basePlanId || 'monthly-plan');
      if (!offer) {
        console.warn('Monthly base plan not found. Check Play Console configuration.');
        console.warn('Plan config:', JSON.stringify(planConfig, null, 2));
        return false;
      }
      try {
        // Yeni API formatını dene
        purchase = await RNIap.requestPurchase({ 
          request: { 
            android: { 
              skus: [offer.sku], 
              subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }] 
            } 
          }, 
          type: 'subs' 
        });
      } catch (e1) {
        // Eski API formatını dene
        purchase = await RNIap.requestSubscription({
          sku: offer.sku,
          subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }],
        });
      }
    } else if (Platform.OS === 'ios') {
      // iOS için subscription satın alma - requestSubscription kullan
      if (!planConfig.sku) {
        console.warn('iOS: Subscription SKU is missing');
        return false;
      }
      
      try {
        // iOS'ta subscription'lar için requestSubscription kullanılmalı
        if (typeof RNIap.requestSubscription === 'function') {
          purchase = await RNIap.requestSubscription({ sku: planConfig.sku });
        } else {
          // requestSubscription yoksa, requestPurchase ile dene (bazı versiyonlarda çalışabilir)
          console.warn('iOS: requestSubscription not available, trying requestPurchase');
          purchase = await RNIap.requestPurchase({ sku: planConfig.sku });
        }
      } catch (e1) {
        console.warn('iOS subscription purchase error:', e1);
        // Alternatif formatları dene
        try {
          if (typeof RNIap.requestSubscription === 'function') {
            purchase = await RNIap.requestSubscription({ productId: planConfig.sku });
          } else {
            purchase = await RNIap.requestPurchase({ productId: planConfig.sku });
          }
        } catch (e2) {
          console.error('iOS subscription purchase failed with all methods:', e2);
          throw e2;
        }
      }
    } else {
      console.warn('Unsupported platform for subscription');
      return false;
    }

    let success = false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    if (normalizedPurchase) {
      await finalizePurchase(normalizedPurchase);
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
    const planConfig = getPlanConfig('yearly');
    if (!planConfig?.sku) {
      console.warn('Yearly plan configuration missing for current platform.');
      return false;
    }
    let purchase;
    
    if (Platform.OS === 'android') {
      const subs = await getSubscriptions();
      console.log('buyPremiumYearly: Loaded subscriptions:', subs?.length || 0);
      if (subs?.length > 0) {
        console.log('buyPremiumYearly: First subscription structure:', JSON.stringify(subs[0], null, 2));
      }
      const offer = extractOfferByBasePlan(subs, planConfig.basePlanId || 'yearly-plan');
      if (!offer) {
        console.warn('Yearly base plan not found. Check Play Console configuration.');
        console.warn('Plan config:', JSON.stringify(planConfig, null, 2));
        return false;
      }
      try {
        // Yeni API formatını dene
        purchase = await RNIap.requestPurchase({ 
          request: { 
            android: { 
              skus: [offer.sku], 
              subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }] 
            } 
          }, 
          type: 'subs' 
        });
      } catch (e1) {
        // Eski API formatını dene
        purchase = await RNIap.requestSubscription({
          sku: offer.sku,
          subscriptionOffers: [{ sku: offer.sku, offerToken: offer.offerToken }],
        });
      }
    } else if (Platform.OS === 'ios') {
      // iOS için subscription satın alma
      if (!planConfig || !planConfig.sku) {
        console.error('iOS: Subscription SKU is missing. Plan config:', planConfig);
        return false;
      }
      
      const subscriptionSku = planConfig.sku;
      console.log('iOS: Attempting to purchase subscription with SKU:', subscriptionSku);
      
      try {
        // iOS'ta subscription'lar için requestSubscription kullanılmalı
        if (typeof RNIap.requestSubscription === 'function') {
          console.log('iOS: Using requestSubscription');
          purchase = await RNIap.requestSubscription({ sku: subscriptionSku });
        } else {
          // requestSubscription yoksa, requestPurchase ile dene
          console.log('iOS: requestSubscription not available, using requestPurchase');
          purchase = await RNIap.requestPurchase({ sku: subscriptionSku });
        }
      } catch (e1) {
        console.warn('iOS subscription purchase error (first attempt):', e1?.message || e1);
        // Alternatif formatları dene
        try {
          if (typeof RNIap.requestSubscription === 'function') {
            console.log('iOS: Retrying with productId format');
            purchase = await RNIap.requestSubscription({ productId: subscriptionSku });
          } else {
            console.log('iOS: Retrying requestPurchase with productId format');
            purchase = await RNIap.requestPurchase({ productId: subscriptionSku });
          }
        } catch (e2) {
          console.error('iOS subscription purchase failed with all methods:', e2?.message || e2);
          throw e2;
        }
      }
    } else {
      console.warn('Unsupported platform for subscription');
      return false;
    }

    let success = false;
    const normalizedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;
    if (normalizedPurchase) {
      await finalizePurchase(normalizedPurchase);
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
    // Her platformda connection'ın initialize edildiğinden emin ol
    try {
      await RNIap.initConnection();
    } catch (e) {
      // Zaten initialize edilmişse hata vermez, sadece devam et
      // Ama eğer gerçek bir hata varsa logla
      const errorMsg = String(e?.message || '');
      if (!errorMsg.includes('already') && !errorMsg.includes('initialized')) {
        console.warn('initConnection error in restorePurchases:', e);
      }
    }
    
    if (typeof RNIap.getAvailablePurchases !== 'function') {
      console.warn('getAvailablePurchases not available on RNIap module');
      return false;
    }
    const purchases = await RNIap.getAvailablePurchases();
    
    // Kullanıcının aktif satın alımlarını kontrol et
    // iOS'ta productIdentifier, Android'de productId kullanılır
    const hasLifetime = Array.isArray(purchases) && purchases.some((p) => {
      const id = p && (p.productId || p.productIdentifier);
      return PRODUCT_IDS.includes(id); // Listemizdeki herhangi biri varsa kabul et
    });

    const hasSub = Array.isArray(purchases) && purchases.some((p) => {
      const id = p && (p.productId || p.productIdentifier);
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
        const sub = purchases.find((p) => {
          const id = p && (p.productId || p.productIdentifier);
          return SUBSCRIPTION_IDS.includes(id);
        });
        expiry = parseExpiry(sub);
        autoRenewing = parseAutoRenewing(sub);
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
  // iOS'ta reklamlar her zaman gösterilir (premium özellikler ücretsiz ama reklamlar gösterilir)
  if (Platform.OS === 'ios') {
    return false;
  }
  try {
    const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
    return flag === 'true';
  } catch (e) {
    return false;
  }
}

export async function getPremiumStatus() {
  // iOS için tüm premium özellikler ücretsiz
  if (Platform.OS === 'ios') {
    const status = { active: true, type: 'lifetime' };
    emitPremiumStatus(status);
    return status;
  }
  
  try {
    if (!IAP_ENABLED) {
      const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
      return { active: flag === 'true' };
    }
    
    if (typeof RNIap.getAvailablePurchases !== 'function') {
      const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY);
      return { active: flag === 'true' };
    }
    const purchases = await RNIap.getAvailablePurchases();
    // Android'de productId kullanılır
    const hasLifetime = Array.isArray(purchases) && purchases.some((p) => {
      const id = p && (p.productId || p.productIdentifier);
      return PRODUCT_IDS.includes(id);
    });
    const sub = Array.isArray(purchases) ? purchases.find((p) => {
      const id = p && (p.productId || p.productIdentifier);
      return SUBSCRIPTION_IDS.includes(id);
    }) : null;
    const active = !!hasLifetime || !!sub;
    const status = {
      active,
      type: hasLifetime ? 'lifetime' : (sub ? 'subscription' : null),
      expiryTime: parseExpiry(sub),
      autoRenewing: parseAutoRenewing(sub),
    };
    await AsyncStorage.setItem(ADS_DISABLED_KEY, active ? 'true' : 'false');
    emitPremiumStatus(status);
    return status;
  } catch {
    const flag = await AsyncStorage.getItem(ADS_DISABLED_KEY).catch(() => 'false');
    return { active: flag === 'true' };
  }
}