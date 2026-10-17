import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Text, View } from 'react-native';
import { getAppVersion, type AppVersion } from 'zxplayer-media';

import type { SettingsStackScreenProps } from '../../app/navigation/types';
import { useBottomInset } from '../../app/navigation/useBottomInset';
import { AppLogo } from '../../shared/components/AppLogo';
import { showDialog } from '../../shared/components/Dialog';
import { ListRow } from '../../shared/components/GroupedList';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../shared/components/ScreenHeader';
import {
  ExternalLinkIcon,
  GlobeIcon,
  RefreshCwIcon,
  UserRoundIcon,
} from '../../shared/icons';
import { reportError } from '../../shared/logger';
import { spacing, typography } from '../../shared/theme';
import { makeStyles, useColors } from '../../shared/theming';
import { DEVELOPER, WEBSITE_LABEL, WEBSITE_URL } from './appInfo';
import { SettingsSection } from './SettingRows';
import { checkForUpdate, type Release } from './updateCheck';

type Props = SettingsStackScreenProps<'About'>;

function openLink(url: string) {
  Linking.openURL(url).catch(error => {
    reportError('Opening a link failed', error);
    showDialog({ title: "Couldn't open the link", message: url });
  });
}

function describeUpdate(release: Release, installed: AppVersion): string {
  const lines = [`You have version ${installed.version}.`];
  if (release.notes.length > 0) {
    lines.push('', "What's new:", ...release.notes.map(note => `• ${note}`));
  }
  return lines.join('\n');
}

/** App name, version, an update check against the website, and who made it. */
export function AboutScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const header = useHidingHeader();
  const bottom = useBottomInset();
  // A native constant: read once, it can't change while the app runs.
  const [installed] = useState(getAppVersion);
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const checkUpdates = async () => {
    if (!installed || checking) {
      return;
    }
    setChecking(true);
    try {
      const result = await checkForUpdate(installed);
      if (!mounted.current) {
        return;
      }
      if (result.kind === 'update') {
        const { release } = result;
        showDialog({
          title: `Version ${release.version} is available`,
          message: describeUpdate(release, installed),
          actions: [
            { label: 'Later', style: 'cancel' },
            { label: 'Download', onPress: () => openLink(release.downloadUrl) },
          ],
        });
      } else {
        showDialog({
          title: "You're using the latest version",
          message: `ZX Player ${installed.version} is up to date.`,
        });
      }
    } catch (error) {
      reportError('Checking for updates failed', error);
      if (mounted.current) {
        showDialog({
          title: "Couldn't check for updates",
          message: 'Check your internet connection and try again.',
        });
      }
    } finally {
      if (mounted.current) {
        setChecking(false);
      }
    }
  };

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
        testID="about-screen"
      >
        <View style={styles.hero}>
          <AppLogo size={72} testID="about-logo" />
          <Text style={styles.name}>ZX Player</Text>
          {installed ? (
            <Text style={styles.version} testID="about-version">
              Version {installed.version} ({installed.build})
            </Text>
          ) : null}
          <Text style={styles.tagline}>
            A fast, offline video and audio player. Free, with no ads.
          </Text>
        </View>

        {installed ? (
          <SettingsSection
            title="Updates"
            footer="Looks for a newer version on the ZX Player website. It's the only time the app goes online."
          >
            <ListRow
              icon={RefreshCwIcon}
              title="Check for Updates"
              subtitle={checking ? 'Checking…' : undefined}
              accessory={
                checking ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  'chevron'
                )
              }
              onPress={checkUpdates}
              accessibilityState={{ busy: checking }}
              testID="check-updates"
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title="Developer">
          <ListRow
            icon={UserRoundIcon}
            title={DEVELOPER.name}
            testID="about-developer"
          />
          <ListRow
            icon={ExternalLinkIcon}
            title="Facebook"
            value={DEVELOPER.facebookHandle}
            accessory="chevron"
            onPress={() => openLink(DEVELOPER.facebookUrl)}
            testID="about-facebook"
          />
          <ListRow
            icon={GlobeIcon}
            title="Website"
            value={WEBSITE_LABEL}
            accessory="chevron"
            onPress={() => openLink(WEBSITE_URL)}
            testID="about-website"
          />
        </SettingsSection>

        <Text style={styles.footnote}>
          Your videos stay on this device. ZX Player never uploads anything.
        </Text>
      </Animated.ScrollView>
      <ScreenHeader title="About" onBack={navigation.goBack} hiding={header} />
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  name: {
    ...typography.title2,
    marginTop: spacing.md,
    color: colors.textPrimary,
  },
  version: {
    ...typography.subheadline,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  tagline: {
    ...typography.footnote,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footnote: {
    ...typography.footnote,
    paddingHorizontal: spacing.xxxl,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}));
