import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type Props = TextInputProps & {
  label: string;
};

export function Input({ label, style, secureTextEntry, ...props }: Props) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, secureTextEntry && styles.inputWithToggle, style]}
          secureTextEntry={secureTextEntry ? hidden : undefined}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: colors.text },
  inputWrap: { position: 'relative' },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.text,
  },
  inputWithToggle: { paddingRight: 48 },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
