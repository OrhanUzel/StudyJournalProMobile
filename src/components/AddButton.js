import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Floating action button component for adding new items
 * @param {Object} props - Component props
 * @param {Function} props.onPress - Function to call when button is pressed
 * @param {String} props.icon - Icon name from Ionicons (default: 'add')
 * @param {Object} props.style - Additional styles for the button
 */
const AddButton = ({ onPress, icon = 'add', style }) => {
  const { theme, shadow } = useTheme();
  
  // Animation value for button press effect
  const scaleAnim = new Animated.Value(1);
  
  // Handle button press animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          shadow.lg,
          { backgroundColor: theme.primary },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddButton;