import { makeVideo } from '../../../../test/fixtures';
import { filterVideos, sortVideos } from '../sortVideos';

const episodes = [
  makeVideo('a', {
    fileName: 'Episode 10.mp4',
    durationSec: 300,
    sizeBytes: 30,
    modifiedAtSec: 3,
  }),
  makeVideo('b', {
    fileName: 'episode 2.mp4',
    durationSec: 900,
    sizeBytes: 10,
    modifiedAtSec: 1,
  }),
  makeVideo('c', {
    fileName: 'Episode 1.mp4',
    durationSec: 600,
    sizeBytes: null,
    modifiedAtSec: 2,
  }),
];

const ids = (videos: { id: string }[]) => videos.map(video => video.id);

describe('sortVideos', () => {
  it('sorts names naturally and case-insensitively', () => {
    expect(ids(sortVideos(episodes, 'name', 'asc'))).toEqual(['c', 'b', 'a']);
    expect(ids(sortVideos(episodes, 'name', 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('sorts by date, duration and size', () => {
    expect(ids(sortVideos(episodes, 'date', 'desc'))).toEqual(['a', 'c', 'b']);
    expect(ids(sortVideos(episodes, 'duration', 'asc'))).toEqual([
      'a',
      'c',
      'b',
    ]);
    // Unknown size counts as zero.
    expect(ids(sortVideos(episodes, 'size', 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by name and never mutates the input', () => {
    const same = [
      makeVideo('x', { fileName: 'B.mp4', durationSec: 60 }),
      makeVideo('y', { fileName: 'A.mp4', durationSec: 60 }),
    ];
    expect(ids(sortVideos(same, 'duration', 'desc'))).toEqual(['y', 'x']);
    expect(ids(same)).toEqual(['x', 'y']);
  });
});

describe('filterVideos', () => {
  const library = [
    makeVideo('1', { fileName: 'Cox Bazar Trip 2024.mp4' }),
    makeVideo('2', { fileName: 'আমার সোনার বাংলা.mp4' }),
    makeVideo('3', { fileName: 'Trip to Sylhet.mkv' }),
  ];

  it('matches every word in any order, ignoring case', () => {
    expect(ids(filterVideos(library, 'trip'))).toEqual(['1', '3']);
    expect(ids(filterVideos(library, '2024 cox'))).toEqual(['1']);
  });

  it('matches non-Latin titles', () => {
    expect(ids(filterVideos(library, 'সোনার'))).toEqual(['2']);
  });

  it('returns nothing for a blank query', () => {
    expect(filterVideos(library, '   ')).toEqual([]);
  });
});
