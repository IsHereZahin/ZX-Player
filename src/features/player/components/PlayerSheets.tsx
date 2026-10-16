import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import {
  OptionRow,
  Sheet,
  SheetSectionTitle,
} from '../../../shared/components/Sheet';
import {
  AlarmClockOffIcon,
  AudioLinesIcon,
  CaptionsIcon,
  FileTextIcon,
  GaugeIcon,
  HeadphonesIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  RatioIcon,
  Repeat1Icon,
  RepeatIcon,
  TimerIcon,
  type IconComponent,
} from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import { formatSpeed } from '../../../shared/utils/format';
import type { SubtitleSize } from '../../settings/settingsStore';
import { SLEEP_TIMER_MINUTES, type SleepTimer } from '../hooks/useSleepTimer';
import {
  ASPECT_MODE_DESCRIPTIONS,
  ASPECT_MODE_LABELS,
  ASPECT_MODES,
  type AspectMode,
} from '../utils/aspectRatio';
import {
  PLAYBACK_SPEEDS,
  trackDetails,
  trackLabel,
  type MediaTrack,
} from '../utils/tracks';

export type RepeatMode = 'off' | 'all' | 'one';

export const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: 'Off',
  all: 'All',
  one: 'One',
};

interface BaseSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
}

interface TileProps {
  icon: IconComponent;
  label: string;
  value?: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}

function Tile({
  icon: Icon,
  label,
  value,
  active = false,
  onPress,
  testID,
}: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      testID={testID}
    >
      <View style={[styles.tileIcon, active && styles.tileIconActive]}>
        <Icon
          size={22}
          color={active ? playerColors.primaryText : playerColors.textPrimary}
        />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.tileValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface MoreSheetProps extends BaseSheetProps {
  speed: number;
  aspectMode: AspectMode;
  sleepLabel: string;
  sleepActive: boolean;
  repeatMode: RepeatMode;
  backgroundPlay: boolean;
  showAudioTracks: boolean;
  onSpeed: () => void;
  onAudio: () => void;
  onSubtitles: () => void;
  onAspect: () => void;
  onSleep: () => void;
  onRepeat: () => void;
  onBackgroundPlay: () => void;
  onInfo: () => void;
}

/** Grid of secondary player features. */
export function MoreSheet(props: MoreSheetProps) {
  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      onDismissed={props.onDismissed}
      title="More"
      testID="more-sheet"
    >
      <View style={styles.grid}>
        <Tile
          icon={GaugeIcon}
          label="Speed"
          value={formatSpeed(props.speed)}
          active={props.speed !== 1}
          onPress={props.onSpeed}
          testID="more-speed"
        />
        {props.showAudioTracks ? (
          <Tile
            icon={AudioLinesIcon}
            label="Audio track"
            onPress={props.onAudio}
            testID="more-audio"
          />
        ) : null}
        <Tile
          icon={CaptionsIcon}
          label="Subtitles"
          onPress={props.onSubtitles}
          testID="more-subtitles"
        />
        <Tile
          icon={RatioIcon}
          label="Aspect ratio"
          value={ASPECT_MODE_LABELS[props.aspectMode]}
          onPress={props.onAspect}
          testID="more-aspect"
        />
        <Tile
          icon={TimerIcon}
          label="Sleep timer"
          value={props.sleepLabel}
          active={props.sleepActive}
          onPress={props.onSleep}
          testID="more-sleep"
        />
        <Tile
          icon={props.repeatMode === 'one' ? Repeat1Icon : RepeatIcon}
          label="Repeat"
          value={REPEAT_LABELS[props.repeatMode]}
          active={props.repeatMode !== 'off'}
          onPress={props.onRepeat}
          testID="more-repeat"
        />
        <Tile
          icon={HeadphonesIcon}
          label="Background play"
          value={props.backgroundPlay ? 'On' : 'Off'}
          active={props.backgroundPlay}
          onPress={props.onBackgroundPlay}
          testID="more-background"
        />
        <Tile
          icon={InfoIcon}
          label="Video details"
          onPress={props.onInfo}
          testID="more-info"
        />
      </View>
    </Sheet>
  );
}

interface SpeedSheetProps extends BaseSheetProps {
  speed: number;
  onChange: (speed: number) => void;
}

export function SpeedSheet({
  visible,
  onClose,
  speed,
  onChange,
}: SpeedSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Playback speed"
      testID="speed-sheet"
    >
      <View style={styles.padded}>
        <SegmentedControl
          options={PLAYBACK_SPEEDS.map(value => ({
            value,
            label: formatSpeed(value),
          }))}
          value={speed}
          onChange={value => {
            onChange(value);
            onClose();
          }}
          accessibilityLabel="Playback speed"
          testID="speed-option"
        />
      </View>
    </Sheet>
  );
}

interface AudioTrackSheetProps extends BaseSheetProps {
  tracks: MediaTrack[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function AudioTrackSheet({
  visible,
  onClose,
  tracks,
  selectedIndex,
  onSelect,
}: AudioTrackSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Audio track"
      testID="audio-sheet"
    >
      {tracks.map((track, position) => (
        <OptionRow
          key={track.index}
          label={trackLabel(track, position)}
          description={trackDetails(track)}
          selected={track.index === selectedIndex}
          onPress={() => {
            onSelect(track.index);
            onClose();
          }}
          testID={`audio-track-${track.index}`}
        />
      ))}
    </Sheet>
  );
}

/** What the subtitle sheet shows as selected. */
export type SubtitleChoice =
  | { kind: 'off' }
  | { kind: 'embedded'; index: number }
  | { kind: 'external' };

interface SubtitleSheetProps extends BaseSheetProps {
  textTracks: MediaTrack[];
  choice: SubtitleChoice;
  externalFileName: string | null;
  delay: number;
  size: SubtitleSize;
  onChoose: (choice: SubtitleChoice) => void;
  onLoadFile: () => void;
  onDelayChange: (delay: number) => void;
  onSizeChange: (size: SubtitleSize) => void;
}

const DELAY_STEP = 0.25;

function formatDelay(delay: number): string {
  if (Math.abs(delay) < 0.001) {
    return 'In sync';
  }
  return `${delay > 0 ? '+' : '−'}${Math.abs(delay).toFixed(2)} s`;
}

export function SubtitleSheet(props: SubtitleSheetProps) {
  const { choice } = props;
  const choose = (next: SubtitleChoice) => {
    props.onChoose(next);
    props.onClose();
  };

  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      onDismissed={props.onDismissed}
      title="Subtitles"
      testID="subtitle-sheet"
    >
      <SheetSectionTitle>Track</SheetSectionTitle>
      <OptionRow
        label="Off"
        selected={choice.kind === 'off'}
        onPress={() => choose({ kind: 'off' })}
        testID="subtitle-off"
      />
      {props.textTracks.map((track, position) => (
        <OptionRow
          key={track.index}
          label={trackLabel(track, position)}
          description={trackDetails(track) ?? 'Built into the video'}
          selected={choice.kind === 'embedded' && choice.index === track.index}
          onPress={() => choose({ kind: 'embedded', index: track.index })}
          testID={`subtitle-track-${track.index}`}
        />
      ))}
      {props.externalFileName ? (
        <OptionRow
          label={props.externalFileName}
          description="Loaded from file"
          selected={choice.kind === 'external'}
          onPress={() => choose({ kind: 'external' })}
          testID="subtitle-external"
        />
      ) : null}
      <OptionRow
        icon={FileTextIcon}
        label={
          props.externalFileName ? 'Load a different file…' : 'Load from file…'
        }
        description=".srt, .ass or .ssa"
        onPress={() => {
          props.onClose();
          props.onLoadFile();
        }}
        testID="subtitle-load-file"
      />

      {choice.kind === 'external' ? (
        <>
          <SheetSectionTitle>Timing</SheetSectionTitle>
          <View style={styles.stepper}>
            <Text style={styles.stepperLabel}>Delay</Text>
            <IconButton
              icon={MinusIcon}
              variant="tonal"
              size="sm"
              accessibilityLabel="Show subtitles earlier"
              onPress={() => props.onDelayChange(props.delay - DELAY_STEP)}
              testID="subtitle-delay-minus"
            />
            <Text style={styles.stepperValue} testID="subtitle-delay-value">
              {formatDelay(props.delay)}
            </Text>
            <IconButton
              icon={PlusIcon}
              variant="tonal"
              size="sm"
              accessibilityLabel="Show subtitles later"
              onPress={() => props.onDelayChange(props.delay + DELAY_STEP)}
              testID="subtitle-delay-plus"
            />
          </View>
        </>
      ) : null}

      <SheetSectionTitle>Text size</SheetSectionTitle>
      <View style={styles.padded}>
        <SegmentedControl
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
          value={props.size}
          onChange={props.onSizeChange}
          accessibilityLabel="Subtitle text size"
          testID="subtitle-size"
        />
      </View>
    </Sheet>
  );
}

interface SleepTimerSheetProps extends BaseSheetProps {
  timer: SleepTimer;
  remainingLabel: string;
  onSet: (timer: SleepTimer) => void;
}

export function SleepTimerSheet({
  visible,
  onClose,
  timer,
  remainingLabel,
  onSet,
}: SleepTimerSheetProps) {
  const set = (next: SleepTimer) => {
    onSet(next);
    onClose();
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sleep timer"
      subtitle={
        timer
          ? `Pauses playback · ${remainingLabel}`
          : 'Pause playback automatically'
      }
      testID="sleep-sheet"
    >
      <OptionRow
        icon={AlarmClockOffIcon}
        label="Off"
        selected={timer === null}
        onPress={() => set(null)}
        testID="sleep-off"
      />
      {SLEEP_TIMER_MINUTES.map(minutes => (
        <OptionRow
          key={minutes}
          label={`${minutes} minutes`}
          selected={timer?.kind === 'minutes' && timer.minutes === minutes}
          onPress={() =>
            set({
              kind: 'minutes',
              minutes,
              endsAt: Date.now() + minutes * 60_000,
            })
          }
          testID={`sleep-${minutes}`}
        />
      ))}
      <OptionRow
        label="End of this video"
        selected={timer?.kind === 'end-of-video'}
        onPress={() => set({ kind: 'end-of-video' })}
        testID="sleep-end-of-video"
      />
    </Sheet>
  );
}

interface AspectSheetProps extends BaseSheetProps {
  mode: AspectMode;
  onSelect: (mode: AspectMode) => void;
}

export function AspectSheet({
  visible,
  onClose,
  mode,
  onSelect,
}: AspectSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Aspect ratio"
      testID="aspect-sheet"
    >
      {ASPECT_MODES.map(option => (
        <OptionRow
          key={option}
          label={ASPECT_MODE_LABELS[option]}
          description={ASPECT_MODE_DESCRIPTIONS[option]}
          selected={option === mode}
          onPress={() => {
            onSelect(option);
            onClose();
          }}
          testID={`aspect-${option}`}
        />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  tilePressed: {
    backgroundColor: playerColors.pressed,
  },
  tileIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: playerColors.surfaceHigh,
  },
  tileIconActive: {
    backgroundColor: playerColors.primarySoft,
  },
  tileLabel: {
    ...typography.label,
    fontWeight: '500',
    color: playerColors.textPrimary,
    textAlign: 'center',
  },
  tileValue: {
    ...typography.label,
    color: playerColors.primaryText,
  },
  padded: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  stepperLabel: {
    ...typography.body,
    flex: 1,
    color: playerColors.textPrimary,
  },
  stepperValue: {
    ...typography.bodyStrong,
    minWidth: 76,
    color: playerColors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
