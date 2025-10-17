/**
 * Theme configuration for Study Journal Pro Mobile
 * Defines colors, spacing, and typography for both light and dark themes
 */

const theme = {
  dark: {
    background: '#1E1E1E',
    surface: '#2A2A2A',
    primary: '#6366F1',
    accent: '#818CF8',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    success: '#10B981',
    error: '#EF4444',
    card: '#2A2A2A',
    border: '#3A3A3A',
  },
  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    primary: '#6366F1',
    accent: '#818CF8',
    text: '#111827',
    textSecondary: '#6B7280',
    success: '#10B981',
    error: '#EF4444',
    card: '#FFFFFF',
    border: '#E5E7EB',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 30,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

export default theme;