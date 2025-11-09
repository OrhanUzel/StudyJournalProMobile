import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdsBanner({ unitId, size, containerStyle }) {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
  const finalSize = size || BannerAdSize.ADAPTIVE_BANNER;
  const [adsDisabled, setAdsDisabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('adsDisabled')
      .then(v => {
        if (mounted) setAdsDisabled(v === 'true');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (adsDisabled) {
    return null;
  }
  return (
    <View style={[{ alignItems: 'center', overflow: 'hidden' }, containerStyle]}>
      <BannerAd unitId={unitId} size={finalSize} />
    </View>
  );
}