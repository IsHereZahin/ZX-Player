import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { CircleXIcon, SearchIcon } from '../icons';
import { radius, spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';

interface SearchFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  testID?: string;
}

/** iOS-style rounded search field with a magnifying glass and a clear button. */
export function SearchField({
  placeholder,
  value,
  onChangeText,
  onSubmitEditing,
  autoFocus,
  testID,
}: SearchFieldProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.field}>
      <SearchIcon size={17} color={colors.textSecondary} />
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
        onSubmitEditing={onSubmitEditing}
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
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
    color: colors.textPrimary,
  },
}));
