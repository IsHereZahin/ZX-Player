import React from 'react';
import { Text, View } from 'react-native';

import { font, radius, spacing } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';

interface NewTagProps {
  /** How many new items a folder holds; one item (or none given) reads just "NEW". */
  count?: number;
  testID?: string;
}

/** Small accent pill marking files that arrived recently and haven't been played. */
export function NewTag({ count, testID }: NewTagProps) {
  const styles = useStyles();
  const label = count && count > 1 ? `${count} NEW` : 'NEW';
  return (
    <View style={styles.tag} testID={testID}>
      <Text style={styles.text} accessibilityLabel={label.toLowerCase()}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  tag: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    height: 18,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.xs,
    backgroundColor: colors.accent,
  },
  text: {
    ...font('bold', 10),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: colors.onAccent,
  },
}));
