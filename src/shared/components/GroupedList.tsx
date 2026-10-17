import React, {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { CheckIcon, ChevronRightIcon, type IconComponent } from '../icons';
import { radius, spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';

const ICON_TILE = 32;
/** Separators start under the text, past the icon tile. */
const ICON_INSET = spacing.lg + ICON_TILE + spacing.md;

interface ListSectionProps {
  header?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inset grouped section, as in iOS Settings: a rounded card of rows with hairline
 * separators, an optional uppercase header and an explanatory footer.
 */
export function ListSection({
  header,
  footer,
  children,
  style,
}: ListSectionProps) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {header ? (
        <Text style={styles.header} accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? (
              <View
                style={[
                  styles.separator,
                  { marginLeft: separatorInset(row as ReactElement) },
                ]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

function separatorInset(row: ReactElement): number {
  const props = row.props as Partial<ListRowProps>;
  return props.icon ? ICON_INSET : spacing.lg;
}

type Accessory = 'chevron' | 'check' | 'none' | ReactNode;

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Value at the trailing edge, e.g. the current choice of a picker row. */
  value?: string;
  /** Drawn in a small neutral circle before the title. */
  icon?: IconComponent;
  accessory?: Accessory;
  destructive?: boolean;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  testID?: string;
}

/** A row in a ListSection. */
export function ListRow({
  title,
  subtitle,
  value,
  icon: Icon,
  accessory = 'none',
  destructive = false,
  onPress,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const titleColor = destructive ? colors.danger : colors.textPrimary;

  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconTile, destructive && styles.iconTileDanger]}>
          <Icon
            size={17}
            color={destructive ? colors.danger : colors.textPrimary}
            strokeWidth={1.75}
          />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {accessory === 'chevron' ? (
        <ChevronRightIcon
          size={18}
          color={colors.textMuted}
          strokeWidth={2.5}
        />
      ) : accessory === 'check' ? (
        <CheckIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
      ) : accessory === 'none' ? null : (
        accessory
      )}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      accessibilityLabel={
        accessibilityLabel ?? (value ? `${title}, ${value}` : title)
      }
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  header: {
    ...typography.overline,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs + 2,
    color: colors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  footer: {
    ...typography.footnote,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs + 2,
    color: colors.textSecondary,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 3,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ICON_TILE / 2,
    backgroundColor: colors.fill,
  },
  iconTileDanger: {
    backgroundColor: colors.dangerSoft,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.body,
  },
  subtitle: {
    ...typography.footnote,
    marginTop: 1,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    maxWidth: '45%',
    color: colors.textSecondary,
  },
}));
