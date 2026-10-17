import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SettingsStackScreenProps } from '../../../app/navigation/types';
import { DialogHost } from '../../../shared/components/Dialog';
import { reportError } from '../../../shared/logger';
import { screenProps } from '../../../test/navigation';
import { AboutScreen } from '../AboutScreen';

const originalFetch = globalThis.fetch;

function respondWith(body: unknown) {
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

async function renderScreen() {
  await render(
    <>
      <AboutScreen
        {...screenProps<SettingsStackScreenProps<'About'>>('About')}
      />
      <DialogHost />
    </>,
  );
}

let openURL: jest.SpyInstance;

beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('AboutScreen', () => {
  it('shows the app, its version and the developer', async () => {
    await renderScreen();

    expect(screen.getByText('ZX Player')).toBeOnTheScreen();
    expect(screen.getByTestId('about-version')).toHaveTextContent(
      'Version 1.10 (11)',
    );
    expect(screen.getByText('Zahin Mohammad')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('about-facebook'));
    expect(openURL).toHaveBeenCalledWith(
      'https://www.facebook.com/isherezahin',
    );
  });

  it('offers a newer version from the website and opens its download', async () => {
    respondWith({
      version: '1.11',
      build: 12,
      downloadUrl: 'https://zx-player.vercel.app/ZX-Player.apk',
      notes: ['Faster start'],
    });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('check-updates'));

    expect(
      await screen.findByText('Version 1.11 is available'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/• Faster start/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('dialog-Download'));
    expect(openURL).toHaveBeenCalledWith(
      'https://zx-player.vercel.app/ZX-Player.apk',
    );
  });

  it('says so when the installed version is the latest', async () => {
    respondWith({
      version: '1.10',
      build: 11,
      downloadUrl: 'https://zx-player.vercel.app/ZX-Player.apk',
    });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('check-updates'));

    expect(
      await screen.findByText("You're using the latest version"),
    ).toBeOnTheScreen();
  });

  it('explains a failed check without opening anything', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await renderScreen();

    await fireEvent.press(screen.getByTestId('check-updates'));

    expect(
      await screen.findByText("Couldn't check for updates"),
    ).toBeOnTheScreen();
    expect(reportError).toHaveBeenCalledWith(
      'Checking for updates failed',
      expect.any(Error),
    );
    expect(openURL).not.toHaveBeenCalled();
  });
});
