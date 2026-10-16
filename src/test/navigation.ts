import { nowPlayingStore } from '../features/player/nowPlaying';

/**
 * Navigation double shared by screen props and `useNavigation()`. Screen tests mock
 * `@react-navigation/native` so `useNavigation` returns this same object:
 *
 *   jest.mock('@react-navigation/native', () => ({
 *     ...jest.requireActual('@react-navigation/native'),
 *     useNavigation: () => require('<path>/test/navigation').mockNavigation,
 *   }));
 */
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

/** Props for rendering a screen component outside a navigator. */
export function screenProps<Props>(name: string, params?: object): Props {
  return {
    navigation: mockNavigation,
    route: { key: `${name}-test`, name, params },
  } as unknown as Props;
}

/** What the last "open player" asked to play (the queue lives in nowPlayingStore). */
export function lastPlaybackRequest() {
  const request = nowPlayingStore.getState().request;
  return request
    ? {
        queue: request.queue,
        startIndex: request.startIndex,
        startFromBeginning: request.startFromBeginning,
      }
    : null;
}
