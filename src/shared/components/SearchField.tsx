import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { CircleXIcon, SearchIcon } from '../icons';
import { radius, spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';

interface SearchFieldProps {
  placeholder: string;
  /** Without onChangeText the field is a button that opens search elsewhere. */
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  autoFocus?: boolean;
  testID?: string;
}

/** iOS-style rounded search field with a magnifying glass and a clear button. */
export function SearchField({
  placeholder,
  value = '',
  onChangeText,
  onPress,
  autoFocus,
  testID,
}: SearchFieldProps) {
  const styles = useStyles();
  const colors = useColors();
  const icon = <SearchIcon size={17} color={colors.textSecondary} />;

  if (!onChangeText) {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        onPress={onPress}
        style={styles.field}
        testID={testID}
      >
        {icon}
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.field}>
      {icon}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        testID={testID}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={8}
        >
          <CircleXIcon
            size={17}
            color={colors.surface}
            fill={colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  field: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.fill,
  },
  placeholder: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
    color: colors.textPrimary,
  },
}));
