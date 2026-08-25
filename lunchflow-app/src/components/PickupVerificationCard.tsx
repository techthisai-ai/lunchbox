import QRCode from 'react-qr-code';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { DeliveryOrder } from '../types/delivery';

type Props = {
  order: DeliveryOrder;
  compact?: boolean;
};

function buildQrPayload(order: DeliveryOrder): string {
  return JSON.stringify({
    type: 'LUNCHFLOW_PICKUP',
    orderId: order.id,
    code: order.qrCode,
    otp: order.pickupOtp,
  });
}

export function PickupVerificationCard({ order, compact }: Props) {
  const verified = Boolean(order.pickupVerifiedAt);
  const qrSize = compact ? 160 : 188;
  const payload = buildQrPayload(order);

  return (
    <View style={styles.card}>
      <Text style={styles.qrId}>Lunchbox ID · {order.qrCode}</Text>

      <View style={styles.otpBox}>
        <Text style={styles.otpLabel}>Pickup OTP</Text>
        <Text style={styles.otpValue}>{order.pickupOtp}</Text>
      </View>

      <View style={[styles.qrWrap, { width: qrSize + 20, height: qrSize + 20 }]}>
        <QRCode value={payload} size={qrSize} bgColor={colors.white} fgColor={colors.text} level="M" />
      </View>

      <Text style={styles.muted}>
        {verified
          ? `Verified at pickup · ${order.pickupVerifiedAt}`
          : 'Show this QR or OTP to the driver at pickup'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  qrId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  otpBox: {
    backgroundColor: colors.orangeLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.orangeLight,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: spacing.lg,
    minWidth: 200,
  },
  otpLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  otpValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.orange,
    letterSpacing: 8,
    marginTop: 6,
  },
  qrWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    padding: 10,
  },
  muted: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.sm,
  },
});
