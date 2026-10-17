import React from 'react';
import { View } from 'react-native';

import { CheckIcon } from '../../../shared/icons';
import { makeStyles, useColors } from '../../../shared/theming';

const SIZE = 24;

/** Round check shown on each item while selecting: filled with the accent when chosen. */
export function SelectionMark({ selected }: { selected: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View
      style={[styles.mark, selected && styles.selected]}
      pointerEvents="none"
    >
      {selected ? (
        <CheckIcon size={15} color={colors.onAccent} strokeWidth={3} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  mark: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
}));
