import React from 'react';
import { Modal, Text, View } from 'react-native';

import { createStore, useStore } from '../storage/store';
import { radius, spacing, typography } from '../theme';
import { makeStyles } from '../theming';
import { Button } from './Button';

export interface DialogAction {
  label: string;
  /** `cancel` reads as the quiet choice and `destructive` in red; default is the main one. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
  testID?: string;
}

export interface DialogRequest {
  title: string;
  message?: string;
  /** A single "OK" when left out. */
  actions?: DialogAction[];
}

/** The dialog on screen, if any (see showDialog / DialogHost). */
export const dialogStore = createStore<DialogRequest | null>(null);

/**
 * Asks or tells the user something in an in-app dialog, drawn in the app's theme rather
 * than the system's alert. Like Alert.alert, any action closes it.
 */
export function showDialog(request: DialogRequest): void {
  dialogStore.setState(request);
}

const OK: DialogAction[] = [{ label: 'OK' }];

/** Renders the current dialog; mount once, near the app root. */
export function DialogHost() {
  const styles = useStyles();
  const dialog = useStore(dialogStore, state => state);
  const actions = dialog?.actions ?? OK;

  const run = (action?: DialogAction) => {
    dialogStore.setState(null);
    action?.onPress?.();
  };

  return (
    <Modal
      visible={dialog !== null}
      transparent
      animationType="fade"
      // Back acts as the cancel choice, when there is one.
      onRequestClose={() =>
        run(actions.find(action => action.style === 'cancel'))
      }
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        {dialog ? (
          <View style={styles.card} accessibilityViewIsModal testID="dialog">
            <Text style={styles.title} accessibilityRole="header">
              {dialog.title}
            </Text>
            {dialog.message ? (
              <Text style={styles.message}>{dialog.message}</Text>
            ) : null}
            <View
              style={[
                styles.actions,
                actions.length > 2 && styles.actionsStacked,
              ]}
            >
              {actions.map(action => (
                <Button
                  key={action.label}
                  label={action.label}
                  variant={
                    action.style === 'cancel'
                      ? 'secondary'
                      : action.style === 'destructive'
                      ? 'danger'
                      : 'primary'
                  }
                  onPress={() => run(action)}
                  style={actions.length > 2 ? undefined : styles.action}
                  testID={action.testID ?? `dialog-${action.label}`}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(colors => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.backdrop,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.sheet,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.subheadline,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  action: {
    flex: 1,
  },
}));
