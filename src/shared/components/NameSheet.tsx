import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { radius, spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';
import { Button } from './Button';
import { Sheet } from './Sheet';

export interface NameSheetProps {
  visible: boolean;
  title: string;
  confirmLabel: string;
  /** Also the input's accessibility label, e.g. "Playlist name". */
  placeholder: string;
  initialName?: string;
  maxLength: number;
  /** Tidies the typed name; an empty result can't be submitted. */
  clean: (name: string) => string;
  onSubmit: (name: string) => void;
  onClose: () => void;
  /** The input and button get \`${testID}-input\` and \`${testID}-confirm\`. */
  testID: string;
}

/** Asks for one name (a playlist, a folder) in a sheet with a text field. */
export function NameSheet({
  visible,
  title,
  confirmLabel,
  placeholder,
  initialName = '',
  maxLength,
  clean,
  onSubmit,
  onClose,
  testID,
}: NameSheetProps) {
  const styles = useStyles();
  const colors = useColors();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [initialName, visible]);

  const valid = clean(name).length > 0;
  const submit = () => {
    if (valid) {
      onSubmit(clean(name));
      onClose();
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID={testID}>
      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxLength={maxLength}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.input}
          accessibilityLabel={placeholder}
          testID={`${testID}-input`}
        />
        <Button
          label={confirmLabel}
          onPress={submit}
          style={!valid && styles.disabled}
          testID={`${testID}-confirm`}
        />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles(colors => ({
  form: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.sheetCell,
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
}));
