import React, { type ReactNode } from 'react';

import { ListRow, ListSection } from '../../shared/components/GroupedList';
import { Switch } from '../../shared/components/Switch';
import type { IconComponent } from '../../shared/icons';
import { useColors } from '../../shared/theming';

export function SettingsSection({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <ListSection header={title} footer={footer}>
      {children}
    </ListSection>
  );
}

interface RowBaseProps {
  icon: IconComponent;
  /** Colour of the icon tile, as in iOS Settings (defaults to blue). */
  tint?: string;
  title: string;
  description?: string;
  destructive?: boolean;
}

interface SwitchRowProps extends RowBaseProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

export function SettingSwitchRow({
  icon,
  tint,
  title,
  description,
  value,
  onValueChange,
  testID,
}: SwitchRowProps) {
  const colors = useColors();
  return (
    <ListRow
      icon={icon}
      iconBackground={tint ?? colors.blue}
      title={title}
      subtitle={description}
      accessory={
        <Switch value={value} onValueChange={onValueChange} decorative />
      }
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      testID={testID}
    />
  );
}

interface ActionRowProps extends RowBaseProps {
  value?: string;
  onPress: () => void;
  testID?: string;
}

/** Row that opens a picker (shows the current value) or performs an action. */
export function SettingActionRow({
  icon,
  tint,
  title,
  description,
  destructive,
  value,
  onPress,
  testID,
}: ActionRowProps) {
  const colors = useColors();
  return (
    <ListRow
      icon={icon}
      iconBackground={tint ?? (destructive ? colors.red : colors.blue)}
      title={title}
      subtitle={description}
      value={value}
      destructive={destructive}
      accessory={destructive ? 'none' : 'chevron'}
      onPress={onPress}
      testID={testID}
    />
  );
}
