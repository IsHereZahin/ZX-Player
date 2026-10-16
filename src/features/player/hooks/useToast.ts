import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastMessage {
  text: string;
  action?: ToastAction;
}

const PLAIN_DURATION_MS = 1800;
/** Toasts with a button stay longer so there is time to reach it. */
const ACTION_DURATION_MS = 6000;

/** One short-lived message at a time; showing a new one replaces the current one. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = useCallback(
    (text: string, action?: ToastAction) => {
      clearTimer();
      setToast({ text, action });
      timer.current = setTimeout(
        () => setToast(null),
        action ? ACTION_DURATION_MS : PLAIN_DURATION_MS,
      );
    },
    [clearTimer],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, show, dismiss };
}
