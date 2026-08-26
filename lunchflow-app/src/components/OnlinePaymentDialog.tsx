import { createElement } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { isMobileWebBrowser } from '../lib/firestoreRest';
import {
  getPaymentLaunchUrl,
  markPaymentAppLaunching,
  openPaymentAppImmediately,
  ONLINE_PAYMENT_OPTIONS,
  OnlinePaymentOption,
  usesUpiAppLink,
} from '../services/paymentService';

type Props = {
  visible: boolean;
  amount: number;
  description: string;
  paying?: boolean;
  onSelect: (methodId: string) => void;
  onCancel: () => void;
};

function PaymentMethodOption({
  option,
  amount,
  description,
  paying,
  onSelect,
}: {
  option: OnlinePaymentOption;
  amount: number;
  description: string;
  paying?: boolean;
  onSelect: (methodId: string) => void;
}) {
  const useMobileWebLink = Platform.OS === 'web' && isMobileWebBrowser() && usesUpiAppLink(option.id);
  const launchUrl = useMobileWebLink ? getPaymentLaunchUrl(option.id, amount, description) : null;

  const content = (
    <>
      <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
        <Text style={[styles.optionIconText, { color: option.iconColor }]}>{option.icon}</Text>
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionLabel}>{option.label}</Text>
        <Text style={styles.optionSub}>{option.sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </>
  );

  if (useMobileWebLink && launchUrl) {
    return createElement(
      'a',
      {
        key: option.id,
        href: launchUrl,
        onClick: (event: MouseEvent) => {
          if (paying) {
            event.preventDefault();
            return;
          }
          markPaymentAppLaunching();
          onSelect(option.id);
        },
        style: {
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 14,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: colors.border,
          opacity: paying ? 0.6 : 1,
          pointerEvents: paying ? 'none' : 'auto',
        },
      },
      content,
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed, paying && styles.optionDisabled]}
      onPress={() => {
        if (paying) return;
        openPaymentAppImmediately(option.id, amount, description);
        onSelect(option.id);
      }}
      disabled={paying}
    >
      {content}
    </Pressable>
  );
}

export function OnlinePaymentDialog({ visible, amount, description, paying, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Pay Online</Text>
          <Text style={styles.subtitle}>{description}</Text>
          <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>

          <Text style={styles.section}>Choose payment method</Text>
          {Platform.OS === 'web' && !isMobileWebBrowser() ? (
            <Text style={styles.webHint}>
              UPI apps open on your phone. On desktop, use card or open this page on your mobile browser.
            </Text>
          ) : null}
          {ONLINE_PAYMENT_OPTIONS.map((option) => (
            <PaymentMethodOption
              key={option.id}
              option={option}
              amount={amount}
              description={description}
              paying={paying}
              onSelect={onSelect}
            />
          ))}

          {paying ? (
            <Text style={styles.processing}>
              {Platform.OS === 'web' && !isMobileWebBrowser()
                ? 'Confirming payment…'
                : 'Opening payment app…'}
            </Text>
          ) : null}
          <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={paying}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58, 41, 66, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
  amount: { fontSize: 32, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 8 },
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  webHint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: { opacity: 0.85 },
  optionDisabled: { opacity: 0.6 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconText: { fontSize: 11, fontWeight: '800' },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  optionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  processing: { fontSize: 13, color: colors.green, fontWeight: '600', textAlign: 'center', marginTop: spacing.md },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
