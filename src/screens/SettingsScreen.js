import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking, Image, Modal, Platform, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotes } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import OnboardingScreen from './OnboardingScreen';
import AdsBanner from '../components/AdsBanner';
import { getBannerUnitId } from '../config/adMobIds';
import { isTurkeyRegion } from '../services/RegionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { initIap, getProducts, getSubscriptions, buyRemoveAds, buyPremiumMonthly, buyPremiumYearly, restorePurchases, isAdsDisabled, getPremiumStatus, onPremiumStatusChange } from '../services/InAppPurchaseService';

const SettingsScreen = () => {
  const { theme, isDarkMode, themePreference, setThemePreference, spacing, borderRadius } = useTheme();
  const { clearAllNotes } = useNotes();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bannerUnitId = getBannerUnitId();
  const isNarrow = Dimensions.get('window').width <= 400;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showIconsModal, setShowIconsModal] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [adsDisabled, setAdsDisabledState] = useState(false);
  const [iapReady, setIapReady] = useState(false);
  const [product, setProduct] = useState(null);
  const [lifetimePrice, setLifetimePrice] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [monthlyOffer, setMonthlyOffer] = useState(null);
  const [yearlyOffer, setYearlyOffer] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState({ active: false });

  useEffect(() => {
    (async () => {
      const isSupported = Platform.OS === 'android' && Constants?.appOwnership !== 'expo';
      if (isSupported) {
        const ready = await initIap();
        setIapReady(!!ready);
        // On launch, try restore and read flag
        await restorePurchases();
        const status = await getPremiumStatus();
        setAdsDisabledState(!!status.active);
        setPremiumStatus(status);
        const products = await getProducts();
        const p = products?.find((x) => x.productId === 'premium_lifetime' || x.productId === 'remove_ads_lifetime' || x.productId === 'remove_ads' || x.id === 'premium_lifetime') || products?.[0] || null;
        setProduct(p);
        try {
          const lp = p?.displayPrice
            || p?.oneTimePurchaseOfferDetailsAndroid?.formattedPrice
            || p?.oneTimePurchaseOfferDetails?.priceFormatted
            || p?.priceFormatted
            || null;
          setLifetimePrice(lp);
        } catch {}
        const subs = await getSubscriptions();
        const s = subs?.[0] || null;
        setSubscription(s);
        try {
          const details = s?.subscriptionOfferDetailsAndroid || s?.subscriptionOfferDetails || [];
          const findOffer = (base) => details.find((d) => d?.basePlanId === base) || null;
          const m = findOffer('monthly') || findOffer('monthly-plan');
          const y = findOffer('yearly') || findOffer('yearly-plan');
          const firstPhase = (o) => o?.pricingPhases?.pricingPhaseList?.[0] || null;
          const fmt = (p) => p?.formattedPrice || p?.priceFormatted || null;
          setMonthlyOffer(m ? { price: fmt(firstPhase(m)) } : null);
          setYearlyOffer(y ? { price: fmt(firstPhase(y)) } : null);
        } catch {}
      } else {
        const disabled = await isAdsDisabled();
        setAdsDisabledState(disabled);
        const status = await getPremiumStatus();
        setPremiumStatus(status);
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const status = await getPremiumStatus();
        setAdsDisabledState(!!status.active);
        setPremiumStatus(status);
      })();
      return () => {};
    }, [])
  );

  useEffect(() => {
    const off = onPremiumStatusChange((status) => {
      setAdsDisabledState(!!status?.active);
      setPremiumStatus(status || { active: false });
    });
    return () => { off && off(); };
  }, []);

  // SettingsScreen.js içinde bu fonksiyonu bul ve güncelle:

const handleBuyRemoveAds = async () => {
    setPurchaseLoading(true);
    
    // DÜZELTME: Bulduğumuz 'product' objesini veya ID'sini fonksiyona gönderiyoruz.
    // Eğer product henüz yüklenmediyse null gidebilir, servis içinde default kontrolü ekledim.
    const ok = await buyRemoveAds(product); 
    
    setPurchaseLoading(false);
    if (ok) {
      setAdsDisabledState(true);
      Alert.alert(t('stopwatch.success'), t('iap.ads_removed'));
    } else {
      Alert.alert(t('common.error'), t('iap.purchase_failed'));
    }
};

  const handleBuyMonthly = async () => {
    setPurchaseLoading(true);
    const ok = await buyPremiumMonthly();
    const status = await getPremiumStatus();
    setPurchaseLoading(false);
    setAdsDisabledState(!!status.active);
    setPremiumStatus(status);
    if (ok || status.active) {
      Alert.alert(t('stopwatch.success'), t('iap.premium_enabled'));
    } else {
      Alert.alert(t('common.error'), t('iap.subscription_failed'));
    }
  };

  const handleBuyYearly = async () => {
    setPurchaseLoading(true);
    const ok = await buyPremiumYearly();
    const status = await getPremiumStatus();
    setPurchaseLoading(false);
    setAdsDisabledState(!!status.active);
    setPremiumStatus(status);
    if (ok || status.active) {
      Alert.alert(t('stopwatch.success'), t('iap.premium_enabled'));
    } else {
      Alert.alert(t('common.error'), t('iap.subscription_failed'));
    }
  };

  const handleRestorePurchases = async () => {
    setRestoreLoading(true);
    const ok = await restorePurchases();
    setRestoreLoading(false);
    setAdsDisabledState(!!ok);
    Alert.alert(
      t('iap.restore_purchases'),
      ok ? t('iap.restore_ok') : t('iap.restore_none')
    );
  };
  
  const handleClearNotes = () => {
    setShowClearConfirm(true);
  };

  const DEV_LINKS = {
    github: 'https://github.com/orhanuzel',
    linkedin: 'https://www.linkedin.com/in/orhanuzel/',
    mail: 'mailto:orhanuzel@yahoo.com',
    coffee: 'https://buymeacoffee.com/orhanuzel',
  };

  // 2x2 grid için asset tabanlı iletişim öğeleri
  const CONTACT_ITEMS = [
    { key: 'github', label: t('common.github'), url: DEV_LINKS.github, icon: require('../../assets/github32.png') },
    { key: 'linkedin', label: t('common.linkedin'), url: DEV_LINKS.linkedin, icon: require('../../assets/linkedin.png') },
    { key: 'mail', label: t('common.mail'), url: DEV_LINKS.mail, icon: require('../../assets/mail32.png') },
    { key: 'coffee', label: t('common.buy_me_a_coffee'), url: DEV_LINKS.coffee, icon: require('../../assets/bmc-logo-yellow2.png') },
  ];

  const ContactButton = ({ item }) => (
    <TouchableOpacity
      style={[styles.contactCard, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
      onPress={() => Linking.openURL(item.url)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Image source={item.icon} style={styles.contactImage} resizeMode="contain" />
      <Text style={[styles.contactLabel, { color: theme.text }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('settings.subtitle')}
        </Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Banner above Ads & Purchases */}
        {!isTurkeyRegion() && (
          <AdsBanner
            unitId={bannerUnitId}
            containerStyle={{
              paddingHorizontal: 8,
              paddingTop: 8,
              paddingBottom: 8,
              marginTop: 8,
              marginBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            }}
          />
        )}
        {/* Ads & Purchases / Premium Section */}
        {!isTurkeyRegion() && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}> 
              {t('iap.premium_title')}
            </Text>
            <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: borderRadius.lg }]}> 
              {adsDisabled ? (
                <View style={[styles.premiumCTA, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                  <Ionicons name="checkmark-circle-outline" size={24} color={theme.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ctaTitle, { color: theme.text }]}> 
                      {t('premium.active')}
                    </Text>
                    <Text style={[styles.ctaSub, { color: theme.textSecondary }]}> 
                      {premiumStatus?.type === 'lifetime' ? t('premium.lifetime') : t('premium.subscription')}
                    </Text>
                    {!!premiumStatus?.expiryTime && premiumStatus?.type !== 'lifetime' && (
                      <Text style={[styles.ctaSub, { color: theme.textSecondary }]}> 
                        {t('premium.valid_until', { date: new Date(Number(premiumStatus.expiryTime)).toLocaleDateString(language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar' : 'tr-TR'))) })}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.premiumCTA, { borderColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => setShowPlansModal(true)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="sparkles-outline" size={24} color={theme.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ctaTitle, { color: theme.text }]}> 
                      {t('iap.go_premium')}
                    </Text>
                    <Text style={[styles.ctaSub, { color: theme.textSecondary }]}> 
                      {t('iap.ad_free_experience')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                onPress={handleRestorePurchases}
                disabled={restoreLoading}
                activeOpacity={0.85}
              >
                <View style={styles.settingInfo}>
                  <Ionicons name="refresh" size={22} color={theme.primary} style={styles.settingIcon} />
                  <Text style={[styles.settingText, { color: theme.text }]}> 
                    {t('iap.restore_purchases')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Appearance Section */}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.appearance')}
          </Text>
          
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons 
                  name={isDarkMode ? "moon" : "sunny"} 
                  size={22} 
                  color={theme.primary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.theme_mode')}
                </Text>
              </View>
            </View>
            <View style={styles.themeOptionsContainer}>
              {[
                { key: 'light', label: t('settings.theme_light'), icon: 'sunny-outline' },
                { key: 'dark', label: t('settings.theme_dark'), icon: 'moon' },
                { key: 'system', label: t('settings.theme_system'), icon: 'phone-portrait-outline' },
              ].map((option) => {
                const active = themePreference === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.surface : theme.card,
                      },
                    ]}
                    onPress={() => setThemePreference(option.key)}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={active ? theme.primary : theme.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        { color: active ? theme.primary : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setOnboardingVisible(true)}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={22} 
                  color={theme.primary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.onboarding_show_now')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.language')}
          </Text>
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguage('tr')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'tr' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.tr')}
                </Text>
              </View>
              {language === 'tr' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguage('en')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'en' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.en')}
                </Text>
              </View>
              {language === 'en' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguage('es')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'es' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.es')}
                </Text>
              </View>
              {language === 'es' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguage('ar')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'ar' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.ar')}
                </Text>
              </View>
              {language === 'ar' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Data Management Section removed */}
        <></>
        
        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}> 
            {t('settings.about')}
          </Text>
          
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <View style={styles.aboutContent}>
              <Text style={[styles.appName, { color: theme.text }]}> 
                {t('settings.app_name')}
              </Text>
              <Text style={[styles.appVersion, { color: theme.textSecondary }]}> 
                {t('settings.version')}
              </Text>
              <Text style={[styles.appDescription, { color: theme.textSecondary }]}> 
                {t('settings.description')}
              </Text>
              
              <View style={styles.divider} />

              {/* Developer Contact Information */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}> 
                {t('settings.dev_contact')}
              </Text>
              <View style={styles.contactGrid}>
                {CONTACT_ITEMS.map(item => (
                  <ContactButton key={item.key} item={item} />
                ))}
              </View>

              {/* Icons and References Link */}
              <TouchableOpacity onPress={() => setShowIconsModal(true)}>
                <Text style={[styles.iconsLink, { color: theme.primary }]}> 
                  {t('settings.icons_refs_link')}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <Text style={[styles.copyright, { color: theme.textSecondary }]}> 
                {t('settings.copyright')}
              </Text>
            </View>
        </View>
      </View>

      

      </ScrollView>

      {/* Icons & References Modal */}
      <Modal visible={showIconsModal} transparent animationType="fade" onRequestClose={() => setShowIconsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: borderRadius.lg }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('settings.icons_refs_title')}</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/icon.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/calendar')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Calendar icons created by Freepik - Flaticon</Text>
                </TouchableOpacity>
              </View>
               <View style={styles.attrItem}>
                <Image source={require('../../assets/mail32.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/email')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Email icons created by ChilliColor - Flaticon</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/github32.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/github')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>GitHub icons created by Ruslan Babkin - Flaticon</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/linkedin.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/linkedin')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Linkedin icons created by riajulislam - Flaticon</Text>
                </TouchableOpacity>
              </View>
             
              <View style={styles.attrItem}>
                <Image source={require('../../assets/bmc-logo-yellow2.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.buymeacoffee.com')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Buy Me a Coffee logo</Text>
                </TouchableOpacity>
              </View>
            
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowIconsModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPlansModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlansModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}> 
            <Text style={[styles.title, { color: theme.text }]}> 
              {t('iap.choose_plan_title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}> 
              {t('iap.choose_plan_subtitle')}
            </Text>
          </View>

          <ScrollView contentContainerStyle={[styles.content, { paddingTop: 12 }]}> 
            <View style={styles.premiumGrid}>
              <TouchableOpacity
                style={[
                  styles.premiumCard,
                  { width: '100%' },
                  { borderColor: theme.border, backgroundColor: isDarkMode ? '#1b2538' : '#eef2ff' }
                ]}
                onPress={adsDisabled ? undefined : async () => { setShowPlansModal(false); await handleBuyMonthly(); }}
                disabled={adsDisabled || !iapReady || purchaseLoading}
                activeOpacity={0.9}
              >
                <View style={styles.planHeaderRow}>
                  <Text style={[styles.planEmoji]}>📅</Text>
                  {!!monthlyOffer?.price && (
                    <View style={[styles.planBadge, { backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb' }]}>
                      <Text style={styles.planBadgeText}>{monthlyOffer.price}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.premiumTitle, { color: isDarkMode ? '#e6edf3' : '#0b1220' }]}> 
                  {t('iap.premium_monthly_title')}
                </Text>
                <View style={styles.planFeatures}>
                  <Text style={[styles.featureItem, { color: isDarkMode ? '#c9d1d9' : '#475569' }]}>• {t('iap.ad_free_experience')}</Text>
                </View>
                <View style={[styles.buyButton, { backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb' }]}> 
                  {/* <Ionicons name="cart-outline" size={18} color="#fff" style={styles.buyButtonIcon} /> */}
                  <Text style={styles.buyButtonText}>{t('iap.subscribe')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.premiumCard,
                  { width: '100%' },
                  { borderColor: theme.border, backgroundColor: isDarkMode ? '#1b2e2a' : '#ecfdf5' }
                ]}
                onPress={adsDisabled ? undefined : async () => { setShowPlansModal(false); await handleBuyYearly(); }}
                disabled={adsDisabled || !iapReady || purchaseLoading}
                activeOpacity={0.9}
              >
                <View style={styles.planHeaderRow}>
                  <Text style={styles.planEmoji}>🏆</Text>
                  {!!yearlyOffer?.price && (
                    <View style={[styles.planBadge, { backgroundColor: isDarkMode ? '#22c55e' : '#16a34a' }]}>
                      <Text style={styles.planBadgeText}>{yearlyOffer.price}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.premiumTitle, { color: isDarkMode ? '#e6edf3' : '#0b1220' }]}> 
                  {t('iap.premium_yearly_title')}
                </Text>
                <View style={styles.planFeatures}>
                  <Text style={[styles.featureItem, { color: isDarkMode ? '#c9d1d9' : '#475569' }]}>• {t('iap.ad_free_experience')}</Text>
                </View>
                <View style={[styles.buyButton, { backgroundColor: isDarkMode ? '#22c55e' : '#16a34a' }]}> 
                  <Ionicons name="cart-outline" size={18} color="#fff" style={styles.buyButtonIcon} />
                  <Text style={styles.buyButtonText}>{t('iap.subscribe')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.premiumCard,
                  { width: '100%' },
                  { borderColor: theme.border, backgroundColor: isDarkMode ? '#2b1d2f' : '#fdf4ff' }
                ]}
                onPress={adsDisabled ? undefined : async () => { setShowPlansModal(false); await handleBuyRemoveAds(); }}
                disabled={adsDisabled || !iapReady || purchaseLoading}
                activeOpacity={0.9}
              >
                <View style={styles.planHeaderRow}>
                  <Text style={styles.planEmoji}>💎</Text>
                  {!!lifetimePrice && (
                    <View style={[styles.planBadge, { backgroundColor: isDarkMode ? '#a855f7' : '#9333ea' }]}>
                      <Text style={styles.planBadgeText}>{lifetimePrice}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.premiumTitle, { color: isDarkMode ? '#e6edf3' : '#0b1220' }]}> 
                  {t('iap.remove_ads_lifetime_title')}
                </Text>
                <View style={styles.planFeatures}>
                  <Text style={[styles.featureItem, { color: isDarkMode ? '#c9d1d9' : '#475569' }]}>• {t('iap.one_time_purchase')}</Text>
                  <Text style={[styles.featureItem, { color: isDarkMode ? '#c9d1d9' : '#475569' }]}>• {t('iap.ad_free_forever')}</Text>
                </View>
                <View style={[styles.buyButton, { backgroundColor: isDarkMode ? '#a855f7' : '#9333ea' }]}> 
                  <Ionicons name="cart-outline" size={18} color="#fff" style={styles.buyButtonIcon} />
                  <Text style={styles.buyButtonText}>{t('iap.buy')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.buyButton, { backgroundColor: theme.primary, alignSelf: 'center', marginTop: 8 }]}
              onPress={() => setShowPlansModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.buyButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Onboarding Fullscreen Modal */}
      <Modal 
        visible={onboardingVisible} 
        animationType="slide" 
        presentationStyle="fullScreen" 
        onRequestClose={() => setOnboardingVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <OnboardingScreen onDone={() => setOnboardingVisible(false)} />
        </View>
      </Modal>

      <ConfirmDialog
        visible={showClearConfirm}
        title={t('settings.clear_all_notes')}
        message={t('home.delete_alert_body')}
        cancelText={t('common.cancel')}
        confirmText={t('settings.clear_all_notes')}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setShowClearConfirm(false);
          clearAllNotes();
          Alert.alert(t('stopwatch.success'), t('records.title') + ' ' + t('settings.clear_all_notes'));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  themeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  themeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  premiumCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  planHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planEmoji: {
    fontSize: 28,
  },
  planBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  premiumSub: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  planFeatures: {
    width: '100%',
    marginTop: 4,
    marginBottom: 12,
    gap: 4,
  },
  featureItem: {
    fontSize: 13,
  },
  aboutContent: {
    padding: 16,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginVertical: 16,
  },
  contactRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    flex: 1,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    minWidth: 130,
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buyButtonIcon: {
    marginRight: 8,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Yeni grid ve kart stilleri
  contactGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactCard: {
    width: '48%',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactImage: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconsLink: {
    marginTop: 8,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  // Modal stilleri
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  attrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attrIcon: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  attrText: {
    fontSize: 14,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  ctaSub: {
    fontSize: 13,
  },
});

export default SettingsScreen;