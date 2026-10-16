import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../app/navigation/types';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { OptionRow, Sheet } from '../../shared/components/Sheet';
import {
  CaptionsIcon,
  FastForwardIcon,
  GaugeIcon,
  HandIcon,
  HeadphonesIcon,
  HistoryIcon,
  ListVideoIcon,
  MoveHorizontalIcon,
  RatioIcon,
  SunIcon,
  Trash2Icon,
  TypeIcon,
  Volume2Icon,
} from '../../shared/icons';
import { colors, spacing, typography } from '../../shared/theme';
import { confirmClearHistory } from '../history/RecentScreen';
import { useHistoryList } from '../history/watchHistory';
import {
  ASPECT_MODE_DESCRIPTIONS,
  ASPECT_MODE_LABELS,
  ASPECT_MODES,
} from '../player/utils/aspectRatio';
import { setBackgroundPlay } from './backgroundPlay';
import {
  SettingActionRow,
  SettingsSection,
  SettingSwitchRow,
} from './SettingRows';
import {
  SKIP_INTERVALS,
  SUBTITLE_SIZES,
  updateSettings,
  useSettings,
  type SubtitleSize,
} from './settingsStore';

type Props = MainTabScreenProps<'Settings'>;
type Picker = 'skip' | 'aspect' | 'subtitleSize' | null;

const SUBTITLE_SIZE_LABELS: Record<SubtitleSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export function SettingsScreen(_props: Props) {
  const settings = useSettings();
  const historyCount = useHistoryList().length;
  const [picker, setPicker] = useState<Picker>(null);
  const closePicker = () => setPicker(null);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content} testID="settings-list">
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
          <Text style={styles.aboutTitle}>ZX Player</Text>
          <Text style={styles.aboutText}>
            Your videos stay on this device. ZX Player never uploads anything.
          </Text>
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  aboutTitle: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  aboutText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
