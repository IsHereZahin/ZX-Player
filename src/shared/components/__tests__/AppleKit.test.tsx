import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SunIcon } from '../../icons';
import { ListRow, ListSection } from '../GroupedList';
import { LargeTitle, NavigationBar } from '../NavigationBar';
import { SearchField } from '../SearchField';
import { SegmentedControl } from '../SegmentedControl';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('toggles and reports its state to assistive technology', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          value={on}
          onValueChange={setOn}
          accessibilityLabel="Wi-Fi"
          testID="switch"
        />
      );
    }
    await render(<Harness />);
    expect(screen.getByTestId('switch')).not.toBeChecked();

    await fireEvent.press(screen.getByTestId('switch'));
    expect(screen.getByTestId('switch')).toBeChecked();
  });
});

describe('SegmentedControl', () => {
  it('selects one segment at a time', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        options={[
          { value: 'a', label: 'One' },
          { value: 'b', label: 'Two' },
        ]}
        value="a"
        onChange={onChange}
        accessibilityLabel="Choice"
        testID="segments"
      />,
    );
    expect(screen.getByTestId('segments-a')).toBeSelected();

    await fireEvent.press(screen.getByTestId('segments-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('ListSection', () => {
  it('shows header, footer and rows with values and chevrons', async () => {
    const onPress = jest.fn();
    await render(
      <ListSection header="Display" footer="Changes apply right away.">
        <ListRow
          icon={SunIcon}
          iconBackground="#007AFF"
          title="Theme"
          value="Dark"
          accessory="chevron"
          onPress={onPress}
          testID="row"
        />
        <ListRow title="Static" />
      </ListSection>,
    );
    expect(screen.getByRole('header', { name: 'Display' })).toBeOnTheScreen();
    expect(screen.getByText('Changes apply right away.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Theme, Dark')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('SearchField', () => {
  it('works as a button that opens search', async () => {
    const onPress = jest.fn();
    await render(<SearchField placeholder="Search videos" onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Search videos'));
    expect(onPress).toHaveBeenCalled();
  });

  it('edits and clears the query', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchField
        placeholder="Search"
        value="cats"
        onChangeText={onChangeText}
      />,
    );
    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});

describe('NavigationBar', () => {
  it('goes back to the named previous screen', async () => {
    const onBack = jest.fn();
    await render(
      <NavigationBar title="Camera" onBack={onBack} backLabel="Videos" />,
    );
    expect(screen.getByRole('header', { name: 'Camera' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Back to Videos'));
    expect(onBack).toHaveBeenCalled();
  });

  it('leaves the heading to the large title when there is one', async () => {
    await render(<LargeTitle title="Library" subtitle="12 folders" />);
    expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();
    expect(screen.getByText('12 folders')).toBeOnTheScreen();
  });
});
