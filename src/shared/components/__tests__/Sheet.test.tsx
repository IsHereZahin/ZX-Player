import { Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { useAfterSheetClose } from '../Sheet';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAfterSheetClose', () => {
  it('on iOS, waits for the sheet to finish dismissing', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const action = jest.fn();
    const { result } = await renderHook(() => useAfterSheetClose());

    await act(async () => result.current.schedule(action));
    expect(action).not.toHaveBeenCalled();

    await act(async () => result.current.onDismissed());
    expect(action).toHaveBeenCalledTimes(1);

    // A later dismissal without a scheduled action does nothing.
    await act(async () => result.current.onDismissed());
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('on Android, runs the action immediately', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const action = jest.fn();
    const { result } = await renderHook(() => useAfterSheetClose());

    await act(async () => result.current.schedule(action));
    expect(action).toHaveBeenCalledTimes(1);
  });
});
