import React, { type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppLogo } from '../../../shared/components/AppLogo';
import { EmptyState } from '../../../shared/components/EmptyState';
import { CircleAlertIcon, LockIcon } from '../../../shared/icons';
import { reportError } from '../../../shared/logger';
import { useMediaPermission } from '../hooks/useMediaPermission';
import { SCOPE_COPY } from '../scopeCopy';
import { hasMediaAccess } from '../services/mediaPermissions';
import type { MediaScope } from '../types';

function openSettings() {
  Linking.openSettings().catch(error =>
    reportError('Opening system settings failed', error),
  );
}

interface PermissionGateProps {
  scope: MediaScope;
  /** Kept above the permission prompts, e.g. the screen's large title. */
  header?: ReactNode;
  children: ReactNode;
}

/** Renders its children only once the scope's part of the media library is readable. */
export function PermissionGate({
  scope,
  header,
  children,
}: PermissionGateProps) {
  const { status, request } = useMediaPermission(scope);
  if (status !== null && hasMediaAccess(status)) {
    return <>{children}</>;
  }
  return (
    <View style={styles.fill}>
      {header}
      <PermissionPrompt scope={scope} status={status} request={request} />
    </View>
  );
}

function PermissionPrompt({
  scope,
  status,
  request,
}: ReturnType<typeof useMediaPermission> & { scope: MediaScope }) {
  const copy = SCOPE_COPY[scope];

  if (status === null) {
    return <EmptyState loading testID="permission-checking" />;
  }

  if (status === 'unavailable') {
    return (
      <EmptyState
        icon={CircleAlertIcon}
        title={copy.unavailableTitle}
        message={copy.unavailableMessage}
        testID="permission-unavailable"
      />
    );
  }

  if (status === 'blocked') {
    return (
      <EmptyState
        icon={LockIcon}
        title={copy.blockedTitle}
        message={copy.blockedMessage}
        actionLabel="Open Settings"
        onAction={openSettings}
        testID="permission-blocked"
      />
    );
  }

  return (
    <EmptyState
      illustration={<AppLogo size={88} />}
      title={copy.requestTitle}
      message={copy.requestMessage}
      actionLabel="Allow access"
      onAction={request}
      testID="permission-request"
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
