import React, { useRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '../../../shared/theme';

export interface SheetOption {
  key: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onClose: () => void;
}

/** Minimal cross-platform action sheet that also works in landscape. */
export function OptionSheet({
  visible,
  title,
  options,
  onClose,
}: OptionSheetProps) {
  const pendingAction = useRef<(() => void) | null>(null);

  const select = (option: SheetOption) => {
    if (Platform.OS === 'ios') {
      // iOS can't present another controller (e.g. the file picker) while this modal is
      // still animating out, so run the action once dismissal completes.
      pendingAction.current = option.onSelect;
      onClose();
    } else {
      onClose();
      option.onSelect();
    }
  };

  const runPendingAction = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={runPendingAction}
      // iOS dismisses a modal that doesn't declare the current orientation.
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close menu"
        accessibilityRole="button"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {options.map(option => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => select(option)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              testID={`sheet-option-${option.key}`}
            >
              <Text
                style={[
                  styles.optionLabel,
                  option.destructive && styles.destructive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  title: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  optionPressed: {
    backgroundColor: colors.border,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
  destructive: {
    color: colors.danger,
  },
  cancel: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
