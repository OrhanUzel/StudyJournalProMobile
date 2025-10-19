import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotes } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const SettingsScreen = () => {
  const { theme, isDarkMode, toggleTheme, spacing, borderRadius } = useTheme();
  const { clearAllNotes } = useNotes();
  const { t, language, setLanguage } = useLanguage();
  
  const handleClearNotes = () => {
    Alert.alert(
      t('settings.clear_all_notes'),
      t('home.delete_alert_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.clear_all_notes'), 
          onPress: () => {
            clearAllNotes();
            Alert.alert(t('stopwatch.success'), t('records.title') + ' ' + t('settings.clear_all_notes'));
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('settings.subtitle')}
        </Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.appearance')}
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
                  {t('settings.dark_mode')}
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

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.language')}
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
              onPress={() => setLanguage('tr')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'tr' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.tr')}
                </Text>
              </View>
              {language === 'tr' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguage('en')}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="language" 
                  size={22} 
                  color={language === 'en' ? theme.primary : theme.textSecondary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.lang.en')}
                </Text>
              </View>
              {language === 'en' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}> 
            {t('settings.data')}
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
                  {t('settings.clear_all_notes')}
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
            {t('settings.about')}
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
                {t('settings.app_name')}
              </Text>
              <Text style={[styles.appVersion, { color: theme.textSecondary }]}> 
                {t('settings.version')}
              </Text>
              <Text style={[styles.appDescription, { color: theme.textSecondary }]}> 
                {t('settings.description')}
              </Text>
              
              <View style={styles.divider} />
              
              <Text style={[styles.copyright, { color: theme.textSecondary }]}> 
                {t('settings.copyright')}
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