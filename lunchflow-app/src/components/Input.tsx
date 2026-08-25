import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { formatPhoneInput } from '../constants/auth';
import { fontStyle, fonts } from '../constants/fonts';
import { colors, radius } from '../constants/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  phone?: boolean;
};

export function Input({ label, style, secureTextEntry, phone, onChangeText, keyboardType, maxLength, placeholder, onFocus, onBlur, ...props }: Props) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  const handleChange = phone && onChangeText ? (text: string) => onChangeText(formatPhoneInput(text)) : onChangeText;

  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, secureTextEntry && styles.inputWithToggle, style]}
          secureTextEntry={secureTextEntry ? hidden : undefined}
          underlineColorAndroid="transparent"
          keyboardType={phone ? 'phone-pad' : keyboardType}
          maxLength={phone ? 10 : maxLength}
          placeholder={phone && !placeholder ? 'Enter 10-digit mobile number' : placeholder}
          onChangeText={handleChange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
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
  label: { fontSize: 12, marginBottom: 8, color: colors.muted, letterSpacing: 0.2, ...fontStyle('medium') },
  inputWrap: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  inputWrapFocused: {
    borderColor: colors.orange,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 48,
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
