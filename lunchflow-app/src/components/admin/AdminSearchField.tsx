import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  fullWidth?: boolean;
};

export function AdminSearchField({ value, onChangeText, placeholder, fullWidth }: Props) {
  return (
    <View style={[styles.search, fullWidth ? styles.searchFull : styles.searchInline]}>
      <Ionicons name="search" size={16} color={colors.muted} style={styles.icon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        underlineColorAndroid="transparent"
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    minHeight: 44,
    height: 44,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      default: {},
    }),
  },
  searchInline: {
    flex: 1,
    minWidth: 180,
  },
  searchFull: {
    width: '100%',
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    flex: 0,
    alignSelf: 'stretch',
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 48,
    fontSize: 14,
    color: colors.text,
    paddingVertical: Platform.OS === 'android' ? 8 : 0,
    paddingHorizontal: 0,
    minHeight: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
