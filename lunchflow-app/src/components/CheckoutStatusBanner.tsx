import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

type Props = {
  paying?: boolean;
  message?: string;
  tone?: 'success' | 'error' | 'info';
};

export function CheckoutStatusBanner({ paying, message, tone = 'info' }: Props) {
  if (!paying && !message) return null;

  const isError = tone === 'error';
  const isSuccess = tone === 'success';

  return (
    <View
      style={[
        styles.banner,
        paying && styles.bannerInfo,
        isSuccess && styles.bannerSuccess,
        isError && styles.bannerError,
      ]}
    >
      {paying ? (
        <>
          <ActivityIndicator size="small" color={colors.orange} />
          <Text style={styles.text}>Processing your subscription…</Text>
        </>
      ) : (
        <>
          <Ionicons
            name={isError ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={isError ? colors.red : colors.greenDark}
          />
          <Text style={[styles.text, isError && styles.textError, isSuccess && styles.textSuccess]}>
            {message}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  bannerInfo: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
  },
  bannerSuccess: {
    backgroundColor: colors.greenLight,
    borderColor: colors.green,
  },
  bannerError: {
    backgroundColor: colors.redLight,
    borderColor: colors.red,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  textSuccess: {
    color: colors.greenDark,
  },
  textError: {
    color: colors.red,
  },
});
