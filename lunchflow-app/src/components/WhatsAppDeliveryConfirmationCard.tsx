import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { DeliveryOrder } from '../types/delivery';

type Props = {
  order: DeliveryOrder;
};

function formatDeliveredTime(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const trimmed = raw.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parsed = Date.parse(`1970-01-01 ${trimmed}`);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return trimmed;
}

function DeliveryProofPreview({
  proofImageUrl,
  driverName,
  studentName,
}: {
  proofImageUrl?: string;
  driverName: string;
  studentName: string;
}) {
  if (proofImageUrl) {
    return (
      <View style={styles.proofWrap}>
        <Image source={{ uri: proofImageUrl }} style={styles.proofImage} resizeMode="cover" />
        <View style={styles.proofCaption}>
          <Ionicons name="camera" size={12} color={colors.onPrimary} />
          <Text style={styles.proofCaptionText}>Delivery proof</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.proofWrap}>
      <View style={styles.proofPlaceholder}>
        <View style={styles.proofScene}>
          <View style={styles.proofPerson}>
            <View style={styles.proofAvatarDriver}>
              <Ionicons name="bicycle" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.proofPersonLabel} numberOfLines={1}>
              {driverName}
            </Text>
            <Text style={styles.proofPersonRole}>Delivery Executive</Text>
          </View>
          <View style={styles.proofHandoff}>
            <Ionicons name="fast-food" size={22} color="#E91E63" />
          </View>
          <View style={styles.proofPerson}>
            <View style={styles.proofAvatarStudent}>
              <Ionicons name="school" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.proofPersonLabel} numberOfLines={1}>
              {studentName}
            </Text>
            <Text style={styles.proofPersonRole}>Student</Text>
          </View>
        </View>
      </View>
      <View style={styles.proofCaption}>
        <Ionicons name="camera" size={12} color={colors.onPrimary} />
        <Text style={styles.proofCaptionText}>Delivery proof attached</Text>
      </View>
    </View>
  );
}

export function WhatsAppDeliveryConfirmationCard({ order }: Props) {
  const deliveredTime = formatDeliveredTime(order.deliveredAt);
  const studentName = order.studentName?.trim() || 'Student';
  const driverName = order.driver?.name?.trim() || 'Delivery Executive';
  const proofImageUrl = order.deliveryProof?.proofImageUrl;

  return (
    <View style={styles.shell}>
      <View style={styles.chatHeader}>
        <View style={styles.brandAvatar}>
          <Ionicons name="fast-food-outline" size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.brandCopy}>
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName}>LunchFlow</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#25D366" />
            </View>
          </View>
          <Text style={styles.brandSub}>Business account</Text>
        </View>
      </View>

      <View style={styles.chatBody}>
        <View style={styles.messageRow}>
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>
              {"Your child's lunch has been delivered successfully at "}{deliveredTime}.
            </Text>
            <DeliveryProofPreview
              proofImageUrl={proofImageUrl}
              driverName={driverName}
              studentName={studentName}
            />
            <View style={styles.messageMeta}>
              <Text style={styles.messageTime}>{deliveredTime}</Text>
              <Ionicons name="checkmark-done" size={14} color="#53BDEB" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: '#ECE5DD',
    ...shadow.subtle,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#075E54',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brandAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  verifiedBadge: {
    backgroundColor: colors.onPrimary,
    borderRadius: radius.full,
    padding: 1,
  },
  brandSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
  },
  chatBody: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 120,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '92%',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    ...shadow.subtle,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111B21',
    fontWeight: '500',
    marginBottom: 8,
  },
  proofWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#F0F2F5',
  },
  proofImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#DDE7E3',
  },
  proofPlaceholder: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  proofScene: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  proofPerson: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  proofAvatarDriver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  proofAvatarStudent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  proofPersonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  proofPersonRole: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  proofHandoff: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  proofCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proofCaptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: '#667781',
    fontWeight: '600',
  },
});
