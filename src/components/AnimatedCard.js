import React, { useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * AnimatedCard component that provides fade-in and slide-up animations
 * for card elements throughout the app
 */
const AnimatedCard = ({ children, index = 0, style }) => {
  // Animation values
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(50);
  
  useEffect(() => {
    // Stagger animation based on index for list items
    const delay = index * 100;
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default AnimatedCard;