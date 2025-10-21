import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Simple themed toast component.
 * Props:
 * - visible: boolean
 * - message: string
 * - duration?: number (ms)
 * - onHide?: function
 */
const Toast = ({ visible, message, duration = 2000, onHide }) => {
  const { theme, shadow } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    let timer;
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();

      timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (onHide) onHide();
          translateY.setValue(-10);
        });
      }, duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, duration, opacity, translateY, onHide]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <Animated.View
        style={[
          styles.toast,
          shadow?.md,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={[styles.text, { color: theme.textColor }]}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
    elevation: 50,
  },
  toast: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});

export default Toast;