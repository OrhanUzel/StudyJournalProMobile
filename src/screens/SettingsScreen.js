import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotes } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * SettingsScreen component for app settings and information
 */
const SettingsScreen = () => {
  const { theme, isDarkMode, toggleTheme, spacing, borderRadius } = useTheme();
  const { clearAllNotes } = useNotes();
  
  // Handle clearing all notes with confirmation
  const handleClearNotes = () => {
    Alert.alert(
      'Clear All Notes',
      'Are you sure you want to delete all notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          onPress: () => {
            clearAllNotes();
            Alert.alert('Success', 'All notes have been cleared.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Customize your experience
        </Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Appearance
          </Text>
          
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons 
                  name={isDarkMode ? "moon" : "sunny"} 
                  size={22} 
                  color={theme.primary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor="#f4f3f4"
              />
            </View>
          </View>
        </View>
        
        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Data Management
          </Text>
          
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={handleClearNotes}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="trash-outline" 
                  size={22} 
                  color={theme.error} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Clear All Notes
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            About
          </Text>
          
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <View style={styles.aboutContent}>
              <Text style={[styles.appName, { color: theme.text }]}>
                Study Journal Pro
              </Text>
              <Text style={[styles.appVersion, { color: theme.textSecondary }]}>
                Version 1.0.0
              </Text>
              <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
                A minimal, elegant app to track your study sessions, take notes, and view progress statistics.
              </Text>
              
              <View style={styles.divider} />
              
              <Text style={[styles.copyright, { color: theme.textSecondary }]}>
                © 2023 Study Journal Pro
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  aboutContent: {
    padding: 16,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginVertical: 16,
  },
  copyright: {
    fontSize: 12,
  },
});

export default SettingsScreen;