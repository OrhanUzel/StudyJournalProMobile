import React, { useEffect, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTurkeyRegion } from '../services/RegionService';
import NetInfo from '@react-native-community/netinfo';
import { onPremiumStatusChange, isAdsDisabled } from '../services/InAppPurchaseService';

export default function AdsBanner({ unitId, size, containerStyle }) {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo || isTurkeyRegion()) {
    return null;
  }

  const { width: windowWidth = 0 } = useWindowDimensions();
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
  const sizeKey = typeof size === 'string' && BannerAdSize && BannerAdSize[size] ? size : (size ? null : null);
  const adaptiveFactory = BannerAdSize?.ANCHORED_ADAPTIVE_BANNER;
  const adaptiveSize = (!size && adaptiveFactory)
    ? (typeof adaptiveFactory === 'function'
      ? adaptiveFactory(Math.round(windowWidth))
      : adaptiveFactory)
    : null;
  const fallbackSize = BannerAdSize?.FLUID
    || BannerAdSize?.FULL_BANNER
    || BannerAdSize?.BANNER
    || 'BANNER';
  const finalSize = sizeKey
    ? BannerAdSize[sizeKey]
    : (size || adaptiveSize || fallbackSize);
  const [adsDisabled, setAdsDisabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const disabled = await isAdsDisabled();
        if (mounted) setAdsDisabled(!!disabled);
      } catch {}
    })();
    NetInfo.fetch().then(state => {
      if (mounted) setIsOnline(!!state.isConnected && (state.isInternetReachable !== false));
    }).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(state => {
      if (mounted) setIsOnline(!!state.isConnected && (state.isInternetReachable !== false));
    });
    const off = onPremiumStatusChange((status) => {
      if (!mounted) return;
      setAdsDisabled(!!status?.active);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (adsDisabled || !isOnline) {
      setAdLoaded(false);
    }
  }, [adsDisabled, isOnline]);

  if (adsDisabled || !isOnline) {
    return null;
  }
  const reservedHeight = (() => {
    const k = sizeKey || (typeof size === 'string' ? size : (adaptiveSize ? 'ANCHORED' : 'BANNER'));
    if (k === 'LARGE_BANNER') return 100;
    if (k === 'FULL_BANNER') return 60;
    if (k === 'LEADERBOARD') return 90;
    if (k === 'MEDIUM_RECTANGLE') return 250;
    if (k === 'ANCHORED') return 70;
    return 50;
  })();

  return (
    <View style={{ width: '100%' }}>
      <View
        style={[
          {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            width: '100%',
            minHeight: reservedHeight,
          },
          adLoaded ? containerStyle : null,
          !adLoaded && {
            minHeight: 0,
            height: 0,
            opacity: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingVertical: 0,
            paddingHorizontal: 0,
          },
        ]}
      >
        <BannerAd
          unitId={unitId}
          size={finalSize}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={() => setAdLoaded(false)}
        />
      </View>
    </View>
  );
}