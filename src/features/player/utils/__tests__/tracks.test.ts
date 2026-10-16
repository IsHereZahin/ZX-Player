import { trackDetails, trackLabel } from '../tracks';

describe('trackLabel', () => {
  it('prefers the title, then the language, then the position', () => {
    expect(
      trackLabel({ index: 0, title: ' Commentary ', language: 'en' }, 0),
    ).toBe('Commentary');
    expect(trackLabel({ index: 1, language: 'ben' }, 1)).toBe('BEN');
    expect(trackLabel({ index: 2, language: 'und' }, 2)).toBe('Track 3');
  });
});

describe('trackDetails', () => {
  it('describes the language and codec when known', () => {
    expect(
      trackDetails({
        index: 0,
        title: 'Main',
        language: 'hin',
        type: 'audio/ac3',
      }),
    ).toBe('HIN · Dolby Digital');
    expect(
      trackDetails({ index: 1, language: 'eng', type: 'audio/mp4a-latm' }),
    ).toBe('AAC');
    expect(
      trackDetails({ index: 2, type: 'application/x-unknown' }),
    ).toBeUndefined();
  });
});
