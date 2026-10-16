import React from 'react';
import { Platform, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

import { updateSettings } from '../../settings/settingsStore';
import {
  formatMediaCount,
  libraryTitle,
  useLibraryScope,
  type LibraryTab,
} from '../scopeCopy';

function ScopeProbe({ tab }: { tab: LibraryTab }) {
  return <Text testID="scope">{useLibraryScope(tab)}</Text>;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('formatMediaCount', () => {
  it('pluralises per scope', () => {
    expect(formatMediaCount(1, 'video')).toBe('1 video');
    expect(formatMediaCount(12, 'video')).toBe('12 videos');
    expect(formatMediaCount(1, 'audio')).toBe('1 audio file');
    expect(formatMediaCount(0, 'all')).toBe('0 files');
  });
});

describe('useLibraryScope', () => {
  it('splits videos and audio into two tabs by default on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<ScopeProbe tab="Library" />);
    expect(screen.getByTestId('scope')).toHaveTextContent('video');
    expect(libraryTitle('video')).toBe('Videos');
  });

  it('puts both in the Library tab when set to together', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<ScopeProbe tab="Library" />);
    await act(async () => updateSettings({ libraryLayout: 'together' }));
    expect(screen.getByTestId('scope')).toHaveTextContent('all');
    expect(libraryTitle('all')).toBe('Library');
  });

  it('only lists videos where there is no audio library (iOS)', async () => {
    updateSettings({ libraryLayout: 'together' });
    await render(<ScopeProbe tab="Library" />);
    expect(screen.getByTestId('scope')).toHaveTextContent('video');
    expect(libraryTitle('video')).toBe('Library');
  });

  it('always lists audio in the Audio tab', async () => {
    await render(<ScopeProbe tab="Audio" />);
    expect(screen.getByTestId('scope')).toHaveTextContent('audio');
  });
});
