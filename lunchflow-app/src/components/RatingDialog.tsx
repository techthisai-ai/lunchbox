import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  driverName?: string;
  submitting?: boolean;
  onSubmit: (stars: number, review: string) => Promise<string | null>;
  onSkip: () => void;
};

export function RatingDialog({ visible, driverName, submitting, onSubmit, onSkip }: Props) {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setStars(5);
      setReview('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    const err = await onSubmit(stars, review);
    if (err) setError(err);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate your driver</Text>
          {driverName ? <Text style={styles.subtitle}>{driverName}</Text> : null}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setStars(value)}>
                <Text style={[styles.star, value <= stars ? styles.starActive : null]}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder="Write a review (optional)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={review}
            onChangeText={setReview}
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={submitting ? 'Submitting...' : 'Submit Review'} onPress={handleSubmit} />
          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: 12 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { fontSize: 32, color: colors.border },
  starActive: { color: colors.orange },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    minHeight: 72,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { color: colors.red, fontSize: 12 },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: colors.muted, fontWeight: '600' },
});
