import QRCode from 'react-qr-code';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
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
  const qrSize = compact ? 160 : 200;
  const payload = buildQrPayload(order);

  return (
    <View style={styles.card}>
      <Text style={styles.liveTag}>Live · updates in realtime</Text>
      <Text style={styles.qrId}>Lunchbox ID: {order.qrCode}</Text>

      <View style={styles.otpBox}>
        <Text style={styles.otpLabel}>Pickup OTP</Text>
        <Text style={styles.otpValue}>{order.pickupOtp}</Text>
      </View>

      <View style={[styles.qrWrap, { width: qrSize + 24, height: qrSize + 24 }]}>
        <QRCode value={payload} size={qrSize} bgColor={colors.white} fgColor={colors.text} level="M" />
      </View>

      <Text style={styles.muted}>
        {verified
          ? `Verified at pickup · ${order.pickupVerifiedAt}`
          : 'Show this QR code or OTP to the driver at pickup'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: spacing.lg },
  liveTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  qrId: { fontSize: 13, fontWeight: '700', marginBottom: spacing.md },
  otpBox: {
    backgroundColor: colors.orangeLight,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: spacing.md,
    minWidth: 180,
  },
  otpLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  otpValue: { fontSize: 32, fontWeight: '800', color: colors.orange, letterSpacing: 6, marginTop: 4 },
  qrWrap: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    padding: 12,
  },
  muted: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
});
