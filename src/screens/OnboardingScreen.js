import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onDone }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const SKIP_COLOR = '#FF9800';
  const isNarrow = width <= 360;
  const CONTENT_MAX_WIDTH = Math.min(width - 40, 520);

  const slides = [
    { 
      title: t('onboarding.title1'), 
      body: t('onboarding.body1'), 
      iconName: 'timer',
      tips: [t('onboarding.tips1_1'), t('onboarding.tips1_2')],
    },
    { 
      title: t('onboarding.title2'), 
      body: t('onboarding.body2'), 
      iconName: 'document-text-outline',
      tips: [t('onboarding.tips2_1'), t('onboarding.tips2_2')],
    },
    { 
      title: t('onboarding.title3'), 
      body: t('onboarding.body3'), 
      iconName: 'bar-chart-outline',
      tips: [t('onboarding.tips3_1'), t('onboarding.tips3_2')],
    },
    { 
      title: t('onboarding.title4'), 
      body: t('onboarding.body4'), 
      iconName: 'settings-outline',
      tips: [t('onboarding.tips4_1'), t('onboarding.tips4_2')],
    },
  ];

  // Animasyonlar kapatıldı: ikon statik olarak gösterilecek
  

  // Animasyonlar devre dışı: index değişiminde ekstra hareket uygulanmıyor

  const handleNext = () => {
    const next = Math.min(index + 1, slides.length - 1);
    // Index güncellemesini scroll tamamlandığında yapacağız
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    if (index === slides.length - 1) {
      onDone?.();
    }
  };

  const handleSkipOrDone = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch {}
    if (onDone) onDone(); else navigation.goBack();
  };

 

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: 24 + insets.bottom }]}>
      
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const i = Math.round(x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={16}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}> 
            <View style={styles.iconWrapper}>
              <Ionicons name={s.iconName} size={92} color={theme.primaryColor} />
            </View>
            <View style={[styles.contentBlock, { width: CONTENT_MAX_WIDTH }] }>
              <Text style={[styles.title, isNarrow && styles.titleSm, { color: theme.textColor }]}>{s.title}</Text>
              <Text style={[styles.body, isNarrow && styles.bodySm, { color: theme.textSecondary }]}>{s.body}</Text>
              {s.tips && (
                <View style={[styles.tipsContainer, { width: CONTENT_MAX_WIDTH, alignItems: 'center' }] }>
                  {s.tips.map((tip, idx) => (
                    <View key={idx} style={[styles.tipRow, { alignSelf: 'center' }] }>
                      <Text style={[styles.tipBullet, { color: theme.textSecondary }]}>•</Text>
                      <Text style={[styles.tipText, { color: theme.textSecondary, textAlign: 'center' }]}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === index ? theme.primaryColor : theme.borderColor }]}
          />
        ))}
      </View>

      

      {/* Actions */}
      {index < slides.length - 1 ? (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 0) }]}>
          <TouchableOpacity onPress={handleSkipOrDone} style={[styles.button, styles.shadow, { backgroundColor: SKIP_COLOR }]}> 
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              {t('onboarding.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={[styles.buttonPrimary, styles.shadow, { backgroundColor: theme.primaryColor }]}> 
            <Text style={styles.buttonPrimaryText}>{t('onboarding.next')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.actions, styles.actionsCenter, { paddingBottom: Math.max(insets.bottom, 0) }]}>
          <TouchableOpacity onPress={handleSkipOrDone} style={[styles.buttonLarge, styles.shadow, { backgroundColor: SKIP_COLOR }]}> 
            <Text style={styles.buttonLargeText}>{t('onboarding.done')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  slide: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBlock: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  titleSm: {
    fontSize: 20,
  },
  slideIcon: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  iconArea: {
    alignItems: 'center',
    marginBottom: 10,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipsContainer: {
    marginTop: 12,
    alignSelf: 'center',
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tipBullet: {
    width: 16,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginRight: 6,
  },
  tipText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  actionsCenter: {
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonLargeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default OnboardingScreen;