import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppLogo } from '../../shared/components/AppLogo';
import {
  COLOR_THEME_SPECS,
  COLOR_THEMES,
  font,
  spacing,
  typography,
  type ColorTheme,
} from '../../shared/theme';
import { makeStyles } from '../../shared/theming';

const LOGO_SIZE = 44;
const RING = 3;

interface ColorThemePickerProps {
  value: ColorTheme;
  onChange: (theme: ColorTheme) => void;
}

/** The colour themes as small logos in their own colours; the chosen one is ringed. */
export function ColorThemePicker({ value, onChange }: ColorThemePickerProps) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Color</Text>
      <View
        style={styles.options}
        accessibilityRole="radiogroup"
        accessibilityLabel="Color theme"
      >
        {COLOR_THEMES.map(theme => {
          const selected = theme === value;
          const { name } = COLOR_THEME_SPECS[theme];
          return (
            <Pressable
              key={theme}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              onPress={() => onChange(theme)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
              ]}
              testID={`color-theme-${theme}`}
            >
              <View style={[styles.ring, selected && styles.ringSelected]}>
                <AppLogo size={LOGO_SIZE} colorTheme={theme} />
              </View>
              <Text
                style={[styles.label, selected && styles.labelSelected]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.6,
  },
  ring: {
    padding: RING,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: LOGO_SIZE * 0.22 + RING + 2,
  },
  ringSelected: {
    borderColor: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  labelSelected: {
    ...font('semibold', 12),
    color: colors.textPrimary,
  },
}));
