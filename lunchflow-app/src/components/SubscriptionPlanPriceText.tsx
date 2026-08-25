import { StyleSheet, Text } from 'react-native';
import { SubscriptionPlan } from '../constants/subscriptions';
import { colors } from '../constants/theme';

type Props = {
  plan: SubscriptionPlan;
  amountText: string;
  priceStyle?: object;
};

export function SubscriptionPlanPriceText({ plan, amountText, priceStyle }: Props) {
  const priceStyles = [styles.price, priceStyle];

  if (plan.detailCompareAtAmount != null) {
    return (
      <Text>
        <Text style={priceStyles}> - </Text>
        <Text style={styles.compareAt}>{plan.detailCompareAtAmount}</Text>
        <Text style={priceStyles}> {amountText}</Text>
      </Text>
    );
  }

  return (
    <Text>
      <Text style={priceStyles}> - {amountText}</Text>
      {plan.detailPriceSuffix ? <Text style={styles.suffix}> {plan.detailPriceSuffix}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  price: {
    fontWeight: '800',
    color: colors.orange,
  },
  compareAt: {
    fontWeight: '700',
    color: colors.text,
    textDecorationLine: 'line-through',
  },
  suffix: {
    fontWeight: '600',
    color: colors.muted,
  },
});
