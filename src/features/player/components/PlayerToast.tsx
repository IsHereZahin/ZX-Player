import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import type { ToastMessage } from '../hooks/useToast';

interface PlayerToastProps {
  toast: ToastMessage | null;
  top: number;
  onAction: () => void;
}

export function PlayerToast({ toast, top, onAction }: PlayerToastProps) {
  if (!toast) {
    return null;
  }
  return (
    <View style={[styles.layer, { top }]} pointerEvents="box-none">
      <View
        style={styles.toast}
        testID="player-toast"
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.text} numberOfLines={2}>
          {toast.text}
        </Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onAction();
              toast.action?.onPress();
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
            testID="player-toast-action"
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.playerPanel,
  },
  text: {
    ...typography.caption,
    flexShrink: 1,
    paddingRight: spacing.sm,
    color: colors.white,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  actionPressed: {
    backgroundColor: colors.primarySoftPressed,
  },
  actionText: {
    ...typography.label,
    fontSize: 13,
    color: colors.primaryText,
  },
});
