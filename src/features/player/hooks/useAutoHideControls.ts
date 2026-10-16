import { useCallback, useEffect, useState } from 'react';

export const CONTROLS_AUTO_HIDE_MS = 3500;

/**
 * Player chrome visibility. Controls hide after a period without interaction unless
 * `keepVisible` is set (paused, scrubbing, menus open, …).
 */
export function useAutoHideControls(keepVisible: boolean) {
  const [visible, setVisible] = useState(true);
  // Bumped on every interaction to restart the hide timer.
  const [interaction, setInteraction] = useState(0);

  useEffect(() => {
    if (!visible || keepVisible) {
      return;
    }
    const timer = setTimeout(() => setVisible(false), CONTROLS_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible, keepVisible, interaction]);

  const toggle = useCallback(() => {
    setVisible(current => !current);
    setInteraction(count => count + 1);
  }, []);

  const keepAlive = useCallback(() => {
    setVisible(true);
    setInteraction(count => count + 1);
  }, []);

  return { visible, toggle, keepAlive };
}
