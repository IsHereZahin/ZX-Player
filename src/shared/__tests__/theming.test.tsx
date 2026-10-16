import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { darkColors, lightColors } from '../theme';
import { makeStyles, ThemeProvider, useColors } from '../theming';

const useStyles = makeStyles(colors => ({
  label: { color: colors.textPrimary },
}));

function Probe({ testID }: { testID: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Text testID={testID} style={styles.label}>
      {colors.background}
    </Text>
  );
}

describe('theming', () => {
  it('builds styles from the active palette', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Probe testID="probe" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveStyle({
      color: lightColors.textPrimary,
    });
    expect(screen.getByTestId('probe')).toHaveTextContent(
      lightColors.background,
    );
  });

  it('lets a nested provider pin a subtree to one scheme', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Probe testID="outer" />
        <ThemeProvider scheme="dark">
          <Probe testID="inner" />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('outer')).toHaveStyle({
      color: lightColors.textPrimary,
    });
    expect(screen.getByTestId('inner')).toHaveStyle({
      color: darkColors.textPrimary,
    });
  });

  it('defines every colour token for both schemes', () => {
    expect(Object.keys(lightColors).sort()).toEqual(
      Object.keys(darkColors).sort(),
    );
  });
});
