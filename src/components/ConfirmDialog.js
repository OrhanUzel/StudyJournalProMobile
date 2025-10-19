import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Themed confirm dialog component with Yes/No style actions.
 * Uses app ThemeContext so it matches light/dark themes.
 */
const ConfirmDialog = ({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}) => {
  const { theme, borderRadius } = useTheme();
  const { t } = useLanguage();

  const cancelLabel = cancelText || t('common.cancel');
  const confirmLabel = confirmText || t('common.ok');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.backdrop, { backgroundColor: theme.backdrop || 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground || theme.card,
              borderColor: theme.border,
              borderRadius: borderRadius?.lg || 12,
            },
          ]}
        >
          {!!title && (
            <Text style={[styles.title, { color: theme.textColor || theme.text }]}>
              {title}
            </Text>
          )}
          {!!message && (
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message}
            </Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: theme.textColor || theme.text }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: theme.primaryColor || '#3B82F6' },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmText]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelText: {
    fontWeight: '600',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ConfirmDialog;