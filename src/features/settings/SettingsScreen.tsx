import React, { useState } from 'react';
import { Animated, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../app/navigation/types';
import { useBottomInset } from '../../app/navigation/useBottomInset';
import { AppLogo } from '../../shared/components/AppLogo';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../shared/components/ScreenHeader';
import { OptionRow, Sheet } from '../../shared/components/Sheet';
import {
  CaptionsIcon,
  FastForwardIcon,
  GaugeIcon,
  HandIcon,
  HeadphonesIcon,
  HistoryIcon,
  LayersIcon,
  ListVideoIcon,
  MoveHorizontalIcon,
  RatioIcon,
  SunIcon,
  SunMoonIcon,
  Trash2Icon,
  TypeIcon,
  Volume2Icon,
  ZoomInIcon,
} from '../../shared/icons';
import { spacing, typography } from '../../shared/theme';
import { makeStyles } from '../../shared/theming';
import { confirmClearHistory } from '../history/RecentScreen';
import { useHistoryList } from '../history/watchHistory';
import { isAudioLibrarySupported } from '../library/services/mediaLibrary';
import {
  ASPECT_MODE_DESCRIPTIONS,
  ASPECT_MODE_LABELS,
  ASPECT_MODES,
} from '../player/utils/aspectRatio';
import { setBackgroundPlay } from './backgroundPlay';
import { ColorThemePicker } from './ColorThemePicker';
import {
  SettingActionRow,
  SettingsSection,
  SettingSwitchRow,
} from './SettingRows';
import {
  APPEARANCES,
  LIBRARY_LAYOUTS,
  SKIP_INTERVALS,
  SUBTITLE_SIZES,
  updateSettings,
  useSettings,
  type Appearance,
  type LibraryLayout,
  type SubtitleSize,
} from './settingsStore';

type Props = MainTabScreenProps<'Settings'>;
type Picker =
  | 'appearance'
  | 'layout'
  | 'skip'
  | 'aspect'
  | 'subtitleSize'
  | null;

const APPEARANCE_LABELS: Record<Appearance, string> = {
  system: 'System default',
  light: 'Light',
  dark: 'Dark',
};
const LAYOUT_LABELS: Record<LibraryLayout, string> = {
  separate: 'Separate tabs',
  together: 'Together',
};
const LAYOUT_DESCRIPTIONS: Record<LibraryLayout, string> = {
  separate: 'Videos and Audio each get their own tab',
  together: 'One Library tab; folders show videos and audio side by side',
};
const APPEARANCE_DESCRIPTIONS: Record<Appearance, string> = {
  system: 'Match your device’s light or dark setting',
  light: 'Always use the light theme',
  dark: 'Always use the dark theme',
};

const SUBTITLE_SIZE_LABELS: Record<SubtitleSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export function SettingsScreen(_props: Props) {
  const styles = useStyles();
  const settings = useSettings();
  const header = useHidingHeader();
  const bottom = useBottomInset();
  const historyCount = useHistoryList().length;
  const [picker, setPicker] = useState<Picker>(null);
  const closePicker = () => setPicker(null);

  return (
    <View style={styles.screen}>
      <HeaderGlow scrollY={header.scrollY} />
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: header.height + spacing.sm,
          paddingBottom: bottom + spacing.xl,
        }}
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        testID="settings-list"
      >
        <SettingsSection title="Appearance">
          <SettingActionRow
            icon={SunMoonIcon}
            title="Theme"
            description="The player always stays dark"
            value={APPEARANCE_LABELS[settings.appearance]}
            onPress={() => setPicker('appearance')}
            testID="setting-appearance"
          />
          <ColorThemePicker
            value={settings.colorTheme}
            onChange={colorTheme => updateSettings({ colorTheme })}
          />
        </SettingsSection>

        {isAudioLibrarySupported() ? (
          <SettingsSection title="Library">
            <SettingActionRow
              icon={LayersIcon}
              title="Audio and video"
              description="Show audio in its own tab or together with videos"
              value={LAYOUT_LABELS[settings.libraryLayout]}
              onPress={() => setPicker('layout')}
              testID="setting-library-layout"
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title="Playback">
          <SettingSwitchRow
            icon={HistoryIcon}
            title="Resume playback"
            description="Continue videos from where you stopped"
            value={settings.resumePlayback}
            onValueChange={value => updateSettings({ resumePlayback: value })}
            testID="setting-resume"
          />
          <SettingSwitchRow
            icon={ListVideoIcon}
            title="Auto-play next"
            description="Play the next video in the list when one ends"
            value={settings.autoPlayNext}
            onValueChange={value => updateSettings({ autoPlayNext: value })}
            testID="setting-autoplay"
          />
          <SettingSwitchRow
            icon={HeadphonesIcon}
            title="Background play"
            description="Keep audio playing when you leave the app or lock the screen"
            value={settings.backgroundPlay}
            onValueChange={setBackgroundPlay}
            testID="setting-background"
          />
          <SettingActionRow
            icon={FastForwardIcon}
            title="Skip interval"
            description="Double-tap and skip buttons"
            value={`${settings.skipSeconds} sec`}
            onPress={() => setPicker('skip')}
            testID="setting-skip"
          />
          <SettingActionRow
            icon={RatioIcon}
            title="Default aspect ratio"
            value={ASPECT_MODE_LABELS[settings.defaultAspectMode]}
            onPress={() => setPicker('aspect')}
            testID="setting-aspect"
          />
        </SettingsSection>

        <SettingsSection title="Gestures">
          <SettingSwitchRow
            icon={SunIcon}
            title="Brightness"
            description="Swipe up or down on the left side"
            value={settings.gestureBrightness}
            onValueChange={value =>
              updateSettings({ gestureBrightness: value })
            }
            testID="setting-gesture-brightness"
          />
          <SettingSwitchRow
            icon={Volume2Icon}
            title="Volume"
            description="Swipe up or down on the right side"
            value={settings.gestureVolume}
            onValueChange={value => updateSettings({ gestureVolume: value })}
            testID="setting-gesture-volume"
          />
          <SettingSwitchRow
            icon={MoveHorizontalIcon}
            title="Seek"
            description="Swipe left or right to move through the video"
            value={settings.gestureSeek}
            onValueChange={value => updateSettings({ gestureSeek: value })}
            testID="setting-gesture-seek"
          />
          <SettingSwitchRow
            icon={HandIcon}
            title="Double-tap"
            description="Double-tap the sides to skip, the middle to pause"
            value={settings.gestureDoubleTap}
            onValueChange={value => updateSettings({ gestureDoubleTap: value })}
            testID="setting-gesture-double-tap"
          />
          <SettingSwitchRow
            icon={GaugeIcon}
            title="Hold for 2× speed"
            description="Press and hold the video to speed it up"
            value={settings.gestureHoldForSpeed}
            onValueChange={value =>
              updateSettings({ gestureHoldForSpeed: value })
            }
            testID="setting-gesture-hold"
          />
          <SettingSwitchRow
            icon={ZoomInIcon}
            title="Pinch to zoom"
            description="Zoom in up to 4× and drag to look around"
            value={settings.gestureZoom}
            onValueChange={value => updateSettings({ gestureZoom: value })}
            testID="setting-gesture-zoom"
          />
        </SettingsSection>

        <SettingsSection title="Subtitles">
          <SettingActionRow
            icon={TypeIcon}
            title="Text size"
            value={SUBTITLE_SIZE_LABELS[settings.subtitleSize]}
            onPress={() => setPicker('subtitleSize')}
            testID="setting-subtitle-size"
          />
          <SettingSwitchRow
            icon={CaptionsIcon}
            title="Background"
            description="Dark box behind subtitles for easier reading"
            value={settings.subtitleBackground}
            onValueChange={value =>
              updateSettings({ subtitleBackground: value })
            }
            testID="setting-subtitle-background"
          />
        </SettingsSection>

        <SettingsSection title="Privacy">
          <SettingActionRow
            icon={Trash2Icon}
            title="Clear watch history"
            description={
              historyCount === 1
                ? '1 video in history'
                : `${historyCount} videos in history`
            }
            destructive
            onPress={confirmClearHistory}
            testID="setting-clear-history"
          />
        </SettingsSection>

        <View style={styles.about}>
          <AppLogo size={56} testID="about-logo" />
          <Text style={styles.aboutTitle}>ZX Player</Text>
          <Text style={styles.aboutText}>
            Your videos stay on this device. ZX Player never uploads anything.
          </Text>
        </View>
      </Animated.ScrollView>
      <ScreenHeader title="Settings" hiding={header} />

      <Sheet
        visible={picker === 'appearance'}
        onClose={closePicker}
        title="Theme"
      >
        {APPEARANCES.map(appearance => (
          <OptionRow
            key={appearance}
            label={APPEARANCE_LABELS[appearance]}
            description={APPEARANCE_DESCRIPTIONS[appearance]}
            selected={settings.appearance === appearance}
            onPress={() => {
              updateSettings({ appearance });
              closePicker();
            }}
            testID={`appearance-option-${appearance}`}
          />
        ))}
      </Sheet>
      <Sheet
        visible={picker === 'layout'}
        onClose={closePicker}
        title="Audio and video"
      >
        {LIBRARY_LAYOUTS.map(layout => (
          <OptionRow
            key={layout}
            label={LAYOUT_LABELS[layout]}
            description={LAYOUT_DESCRIPTIONS[layout]}
            selected={settings.libraryLayout === layout}
            onPress={() => {
              updateSettings({ libraryLayout: layout });
              closePicker();
            }}
            testID={`layout-option-${layout}`}
          />
        ))}
      </Sheet>
      <Sheet
        visible={picker === 'skip'}
        onClose={closePicker}
        title="Skip interval"
      >
        {SKIP_INTERVALS.map(seconds => (
          <OptionRow
            key={seconds}
            label={`${seconds} seconds`}
            selected={settings.skipSeconds === seconds}
            onPress={() => {
              updateSettings({ skipSeconds: seconds });
              closePicker();
            }}
            testID={`skip-option-${seconds}`}
          />
        ))}
      </Sheet>
      <Sheet
        visible={picker === 'aspect'}
        onClose={closePicker}
        title="Default aspect ratio"
      >
        {ASPECT_MODES.map(mode => (
          <OptionRow
            key={mode}
            label={ASPECT_MODE_LABELS[mode]}
            description={ASPECT_MODE_DESCRIPTIONS[mode]}
            selected={settings.defaultAspectMode === mode}
            onPress={() => {
              updateSettings({ defaultAspectMode: mode });
              closePicker();
            }}
          />
        ))}
      </Sheet>
      <Sheet
        visible={picker === 'subtitleSize'}
        onClose={closePicker}
        title="Subtitle size"
      >
        {SUBTITLE_SIZES.map(size => (
          <OptionRow
            key={size}
            label={SUBTITLE_SIZE_LABELS[size]}
            selected={settings.subtitleSize === size}
            onPress={() => {
              updateSettings({ subtitleSize: size });
              closePicker();
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  aboutTitle: {
    ...typography.headline,
    marginTop: spacing.sm,
    color: colors.textPrimary,
  },
  aboutText: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}));
