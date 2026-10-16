import type {
  RootStackParamList,
  RootStackScreenProps,
} from '../app/navigation/types';

/** Minimal navigation/route doubles for rendering a screen outside a navigator. */
export function createScreenProps<T extends keyof RootStackParamList>(
  name: T,
  params: RootStackParamList[T],
) {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };
  const props = {
    navigation,
    route: { key: `${name}-test`, name, params },
  } as unknown as RootStackScreenProps<T>;
  return { props, navigation };
}
