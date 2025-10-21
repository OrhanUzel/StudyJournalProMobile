import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotes } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';

const SettingsScreen = () => {
  const { theme, isDarkMode, toggleTheme, spacing, borderRadius } = useTheme();
  const { clearAllNotes } = useNotes();
  const { t, language, setLanguage } = useLanguage();
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  
  const handleClearNotes = () => {
    setShowClearConfirm(true);
  };

  const DEV_LINKS = {
    github: 'https://github.com/yourusername',
    linkedin: 'https://www.linkedin.com/in/yourusername',
    mail: 'mailto:yourmail@example.com',
    coffee: 'https://buymeacoffee.com/yourusername',
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
        
        {/* Data Management Section removed */}
        <></>
        
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

              {/* Developer Contact Information */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('settings.dev_contact')}
              </Text>
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={[styles.contactButton, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
                  onPress={() => Linking.openURL(DEV_LINKS.github)}
                >
                  <Ionicons name="logo-github" size={20} color={theme.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: theme.text }]}>{t('common.github')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactButton, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
                  onPress={() => Linking.openURL(DEV_LINKS.linkedin)}
                >
                  <Ionicons name="logo-linkedin" size={20} color={theme.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: theme.text }]}>{t('common.linkedin')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactButton, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
                  onPress={() => Linking.openURL(DEV_LINKS.mail)}
                >
                  <Ionicons name="mail" size={20} color={theme.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: theme.text }]}>{t('common.mail')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactButton, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
                  onPress={() => Linking.openURL(DEV_LINKS.coffee)}
                >
                  <Ionicons name="cafe" size={20} color={theme.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: theme.text }]}>{t('common.buy_me_a_coffee')}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              <Text style={[styles.copyright, { color: theme.textSecondary }]}> 
                {t('settings.copyright')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showClearConfirm}
        title={t('settings.clear_all_notes')}
        message={t('home.delete_alert_body')}
        cancelText={t('common.cancel')}
        confirmText={t('settings.clear_all_notes')}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setShowClearConfirm(false);
          clearAllNotes();
          Alert.alert(t('stopwatch.success'), t('records.title') + ' ' + t('settings.clear_all_notes'));
        }}
      />
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
  contactRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    flex: 1,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
  },
  copyright: {
    fontSize: 12,
  },
});

export default SettingsScreen;