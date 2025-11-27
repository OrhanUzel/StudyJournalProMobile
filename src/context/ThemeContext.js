import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme/theme';

// Create theme context
const ThemeContext = createContext();

// Custom hook for using theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const normalizedScheme = systemScheme || 'light';
  const [themePreference, setThemePreference] = useState('system');
  const isDarkMode =
    themePreference === 'dark' ||
    (themePreference === 'system' && normalizedScheme === 'dark');
  const palette = isDarkMode ? theme.dark : theme.light;

  // Aliases to keep backward-compatibility across screens
  const normalizedTheme = {
    ...palette,
    // primary keys
    backgroundColor: palette.background,
    cardBackground: palette.card,
    borderColor: palette.border,
    textColor: palette.text,
    textSecondary: palette.textSecondary,
    primaryColor: palette.primary,
    accentColor: palette.accent,
    successColor: palette.success,
    dangerColor: palette.error,
    // add warning color (amber) for start/pause button
    warningColor: '#F59E0B',
  };
  
  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('themePreference');
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setThemePreference(storedTheme);
        } else {
          setThemePreference('system');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Save theme preference when it changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem('themePreference', themePreference);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };
    
    saveThemePreference();
  }, [themePreference]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setThemePreference(prev => (prev === 'dark' ? 'light' : 'dark'));
  };
  
  // Context value
  const value = {
    isDarkMode,
    themePreference,
    setThemePreference,
    toggleTheme,
    theme: normalizedTheme,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    typography: theme.typography,
    shadow: theme.shadow,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;