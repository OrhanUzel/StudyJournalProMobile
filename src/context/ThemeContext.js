import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme/theme';

// Create theme context
const ThemeContext = createContext();

// Custom hook for using theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // State for dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Get current theme based on mode
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
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
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
        await AsyncStorage.setItem('themePreference', isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };
    
    saveThemePreference();
  }, [isDarkMode]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
  // Context value
  const value = {
    isDarkMode,
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