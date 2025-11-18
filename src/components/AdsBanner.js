import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTurkeyRegion } from '../services/RegionService';
import NetInfo from '@react-native-community/netinfo';

export default function AdsBanner({ unitId, size, containerStyle }) {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo || isTurkeyRegion()) {
    return null;
  }

  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
  const finalSize = size || BannerAdSize.ADAPTIVE_BANNER;
  const [adsDisabled, setAdsDisabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('adsDisabled')
      .then(v => {
        if (mounted) setAdsDisabled(v === 'true');
      })
      .catch(() => {});
    NetInfo.fetch().then(state => {
      if (mounted) setIsOnline(!!state.isConnected && (state.isInternetReachable !== false));
    }).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(state => {
      if (mounted) setIsOnline(!!state.isConnected && (state.isInternetReachable !== false));
    });
    return () => { mounted = false; };
  }, []);

  if (adsDisabled || !isOnline) {
    return null;
  }
  return (
    <View style={[{ alignItems: 'center', overflow: 'hidden', width: '100%' }, containerStyle]}>
      <BannerAd unitId={unitId} size={finalSize} />
    </View>
  );
}