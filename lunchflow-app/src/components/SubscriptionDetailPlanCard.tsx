import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SubscriptionPlan,
  isAddonSubscriptionPlan,
  isMonthlySubscriptionPlan,
} from '../constants/subscriptions';
import { colors, shadow, spacing } from '../constants/theme';
import { formatPlanPrice } from '../utils/subscription';

type Props = {
  plan: SubscriptionPlan;
  disabled?: boolean;
  quantity?: number;
  onQuantityChange?: (next: number) => void;
  onSelect: () => void;
};

const ACCENTS: Record<string, { bg: string; border: string; icon: string }> = {
  single: { bg: '#FFF8F0', border: '#F6C15B', icon: colors.orange },
  monthly: { bg: '#EEF4E3', border: '#515B2F', icon: colors.green },
  addon_same_drop: { bg: '#F3F0FF', border: '#8B5CF6', icon: '#7C3AED' },
  addon_diff_drop: { bg: '#EFF6FF', border: '#3B82F6', icon: '#2563EB' },
};

function accentFor(plan: SubscriptionPlan) {
  if (plan.planKind === 'single') return ACCENTS.single;
  if (isMonthlySubscriptionPlan(plan)) return ACCENTS.monthly;
  if (plan.planKind === 'addon_diff_drop') return ACCENTS.addon_diff_drop;
  if (plan.planKind === 'addon_same_drop') return ACCENTS.addon_same_drop;
  return ACCENTS.single;
}

function iconFor(plan: SubscriptionPlan): keyof typeof Ionicons.glyphMap {
  const name = plan.detailIcon ?? 'document-text-outline';
  return name as keyof typeof Ionicons.glyphMap;
}

function titleFor(plan: SubscriptionPlan): string {
  if (plan.planKind === 'single') return 'Single Order (Single Person)';
  if (isMonthlySubscriptionPlan(plan)) return 'Monthly Subscription';
  if (plan.planKind === 'addon_same_drop') return 'Add Student / Other (Same Drop)';
  if (plan.planKind === 'addon_diff_drop') return 'Add Student / Other (Different Drop)';
  return plan.detailTitle ?? plan.name;
}

function subtitleFor(plan: SubscriptionPlan): string {
  if (plan.planKind === 'single') return 'One-time order for a single person.';
  if (isMonthlySubscriptionPlan(plan)) return 'Best for regular daily lunch delivery every month.';
  if (plan.planKind === 'addon_same_drop') {
    return 'Add more people using the same drop location.';
  }
  if (plan.planKind === 'addon_diff_drop') {
    return 'Add more people using a different drop location.';
  }
  return plan.desc;
}

function suffixFor(plan: SubscriptionPlan): string {
  if (plan.detailPriceSuffix) return plan.detailPriceSuffix;
  if (plan.planKind === 'single') return 'per day';
  if (isMonthlySubscriptionPlan(plan) || isAddonSubscriptionPlan(plan)) return 'per month';
  return 'per month';
}

export function SubscriptionDetailPlanCard({
  plan,
  disabled,
  quantity = 1,
  onQuantityChange,
  onSelect,
}: Props) {
  const accent = accentFor(plan);
  const isAddon = isAddonSubscriptionPlan(plan);
  const isMonthly = isMonthlySubscriptionPlan(plan);
  const unitPrice = plan.baseAmount;
  const lineTotal = isAddon ? unitPrice * quantity : unitPrice;

  return (
    <View style={[styles.card, { borderColor: accent.border }, disabled && styles.cardDisabled]}>
      {isMonthly ? (
        <View style={styles.recommendedBadge}>
          <Ionicons name="star" size={12} color={colors.onPrimary} />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      ) : null}

      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
          <Ionicons name={iconFor(plan)} size={22} color={accent.icon} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{titleFor(plan)}</Text>
          <Text style={styles.subtitle}>{subtitleFor(plan)}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        {plan.detailCompareAtAmount != null ? (
          <Text style={styles.compareAt}>{formatPlanPrice(plan.detailCompareAtAmount)}</Text>
        ) : null}
        <Text style={styles.price}>{formatPlanPrice(unitPrice)}</Text>
        <Text style={styles.priceSuffix}>{suffixFor(plan)}</Text>
      </View>

      {isAddon ? (
        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Additional people</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
              onPress={() => onQuantityChange?.(Math.max(1, quantity - 1))}
              disabled={disabled || quantity <= 1}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </Pressable>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => onQuantityChange?.(quantity + 1)}
              disabled={disabled}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {isAddon ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPlanPrice(lineTotal)}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          isMonthly && styles.ctaMonthly,
          disabled && styles.ctaDisabled,
          pressed && !disabled && styles.ctaPressed,
        ]}
        onPress={onSelect}
        disabled={disabled}
      >
        <Text style={styles.ctaText}>
          {isAddon ? `Add ${quantity} person${quantity > 1 ? 's' : ''}` : 'Choose Plan'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 12,
    ...shadow.card,
  },
  cardDisabled: {
    opacity: 0.68,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  compareAt: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.orange,
  },
  priceSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.45,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.green,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 13,
  },
  ctaMonthly: {
    backgroundColor: colors.green,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaPressed: {
    opacity: 0.94,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onPrimary,
  },
});
