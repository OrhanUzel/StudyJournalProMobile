import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Linking, Image, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotes } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import OnboardingScreen from './OnboardingScreen';
import AdsBanner from '../components/AdsBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const SettingsScreen = () => {
  const { theme, isDarkMode, toggleTheme, spacing, borderRadius } = useTheme();
  const { clearAllNotes } = useNotes();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bannerUnitId = 'ca-app-pub-3940256099942544/9214589741';
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [showIconsModal, setShowIconsModal] = React.useState(false);
  const [onboardingVisible, setOnboardingVisible] = React.useState(false);
  
  const handleClearNotes = () => {
    setShowClearConfirm(true);
  };

  const DEV_LINKS = {
    github: 'https://github.com/orhanuzel',
    linkedin: 'https://www.linkedin.com/in/orhanuzel/',
    mail: 'mailto:orhanuzel@yahoo.com',
    coffee: 'https://buymeacoffee.com/orhanuzel',
  };

  // 2x2 grid için asset tabanlı iletişim öğeleri
  const CONTACT_ITEMS = [
    { key: 'github', label: t('common.github'), url: DEV_LINKS.github, icon: require('../../assets/github32.png') },
    { key: 'linkedin', label: t('common.linkedin'), url: DEV_LINKS.linkedin, icon: require('../../assets/linkedin.png') },
    { key: 'mail', label: t('common.mail'), url: DEV_LINKS.mail, icon: require('../../assets/mail32.png') },
    { key: 'coffee', label: t('common.buy_me_a_coffee'), url: DEV_LINKS.coffee, icon: require('../../assets/bmc-logo-yellow2.png') },
  ];

  const ContactButton = ({ item }) => (
    <TouchableOpacity
      style={[styles.contactCard, { borderColor: theme.border, backgroundColor: theme.surface, borderRadius: borderRadius.md }]}
      onPress={() => Linking.openURL(item.url)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Image source={item.icon} style={styles.contactImage} resizeMode="contain" />
      <Text style={[styles.contactLabel, { color: theme.text }]}>{item.label}</Text>
    </TouchableOpacity>
  );

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
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setOnboardingVisible(true)}
            >
              <View style={styles.settingInfo}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={22} 
                  color={theme.primary} 
                  style={styles.settingIcon}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {t('settings.onboarding_show_now')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
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
              <View style={styles.contactGrid}>
                {CONTACT_ITEMS.map(item => (
                  <ContactButton key={item.key} item={item} />
                ))}
              </View>

              {/* Icons and References Link */}
              <TouchableOpacity onPress={() => setShowIconsModal(true)}>
                <Text style={[styles.iconsLink, { color: theme.primary }]}> 
                  {t('settings.icons_refs_link')}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <Text style={[styles.copyright, { color: theme.textSecondary }]}> 
                {t('settings.copyright')}
              </Text>
            </View>
          </View>
        </View>

        {/* Banner Ad - Ayarlar içeriğinin sonunda */}
        <AdsBanner
          unitId={bannerUnitId}
          containerStyle={{
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          }}
        />

      </ScrollView>

      {/* Icons & References Modal */}
      <Modal visible={showIconsModal} transparent animationType="fade" onRequestClose={() => setShowIconsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: borderRadius.lg }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('settings.icons_refs_title')}</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/icon.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/calendar')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Calendar icons created by Freepik - Flaticon</Text>
                </TouchableOpacity>
              </View>
               <View style={styles.attrItem}>
                <Image source={require('../../assets/mail32.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/email')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Email icons created by ChilliColor - Flaticon</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/github32.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/github')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>GitHub icons created by Ruslan Babkin - Flaticon</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.attrItem}>
                <Image source={require('../../assets/linkedin.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/linkedin')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Linkedin icons created by riajulislam - Flaticon</Text>
                </TouchableOpacity>
              </View>
             
              <View style={styles.attrItem}>
                <Image source={require('../../assets/bmc-logo-yellow2.png')} style={styles.attrIcon} />
                <TouchableOpacity onPress={() => Linking.openURL('https://www.buymeacoffee.com')}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>Buy Me a Coffee logo</Text>
                </TouchableOpacity>
              </View>
            
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowIconsModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Onboarding Fullscreen Modal */}
      <Modal 
        visible={onboardingVisible} 
        animationType="slide" 
        presentationStyle="fullScreen" 
        onRequestClose={() => setOnboardingVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <OnboardingScreen onDone={() => setOnboardingVisible(false)} />
        </View>
      </Modal>

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
  // Yeni grid ve kart stilleri
  contactGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactCard: {
    width: '48%',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactImage: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconsLink: {
    marginTop: 8,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  // Modal stilleri
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  attrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attrIcon: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  attrText: {
    fontSize: 14,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SettingsScreen;