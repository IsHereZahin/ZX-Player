import React, { type ReactNode } from 'react';
import { Linking } from 'react-native';

import { EmptyState } from '../../../shared/components/EmptyState';
import {
  CircleAlertIcon,
  FolderSearchIcon,
  LockIcon,
} from '../../../shared/icons';
import { reportError } from '../../../shared/logger';
import { useMediaPermission } from '../hooks/useMediaPermission';
import { hasMediaAccess } from '../services/mediaPermissions';

function openSettings() {
  Linking.openSettings().catch(error =>
    reportError('Opening system settings failed', error),
  );
}

/** Renders its children only once the media library is readable. */
export function PermissionGate({ children }: { children: ReactNode }) {
  const { status, request } = useMediaPermission();

  if (status === null) {
    return <EmptyState loading testID="permission-checking" />;
  }

  if (hasMediaAccess(status)) {
    return <>{children}</>;
  }

  if (status === 'unavailable') {
    return (
      <EmptyState
        icon={CircleAlertIcon}
        title="Video library unavailable"
        message="This device doesn't allow apps to read its video library."
        testID="permission-unavailable"
      />
    );
  }

  if (status === 'blocked') {
    return (
      <EmptyState
        icon={LockIcon}
        title="Access to videos is off"
        message="Turn on video access for ZX Player in Settings to browse your library."
        actionLabel="Open Settings"
        onAction={openSettings}
        testID="permission-blocked"
      />
    );
  }

  return (
    <EmptyState
      icon={FolderSearchIcon}
      title="See your videos"
      message="ZX Player reads your device's video library to show your folders. Your videos never leave your device."
      actionLabel="Allow access"
      onAction={request}
      testID="permission-request"
    />
  );
}
