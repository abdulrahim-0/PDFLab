import { everyPage, formatRange, parsePageRanges } from './page-ranges';

describe('parsePageRanges', () => {
  it.each([
    ['1', [{ start: 1, end: 1 }]],
    [
      '1-3, 5',
      [
        { start: 1, end: 3 },
        { start: 5, end: 5 },
      ],
    ],
    [
      ' 2 - 4 ;7 ',
      [
        { start: 2, end: 4 },
        { start: 7, end: 7 },
      ],
    ],
    ['8-', [{ start: 8, end: 10 }]],
    ['3–4', [{ start: 3, end: 4 }]],
    [
      '1-5, 3-7',
      [
        { start: 1, end: 5 },
        { start: 3, end: 7 },
      ],
    ],
    [
      '1,,2,',
      [
        { start: 1, end: 1 },
        { start: 2, end: 2 },
      ],
    ],
  ])('parses "%s"', (input, expected) => {
    expect(parsePageRanges(input, 10)).toEqual(expected);
  });

  it.each([
    ['', 'Enter at least one page'],
    [' , ', 'Enter at least one page'],
    ['abc', '“abc” isn’t a page number or range'],
    ['1-2-3', '“1-2-3” isn’t a page number or range'],
    ['-3', '“-3” isn’t a page number or range'],
    ['0', 'Pages start at 1'],
    ['11', 'goes past the last page. This PDF has 10 pages'],
    ['5-12', '“5-12” goes past the last page'],
    ['5-3', '“5-3” is backwards. Did you mean 3-5?'],
  ])('rejects "%s"', (input, message) => {
    expect(() => parsePageRanges(input, 10)).toThrow(message);
  });

  it('uses the singular for one-page PDFs', () => {
    expect(() => parsePageRanges('2', 1)).toThrow('This PDF has 1 page.');
  });
});

describe('everyPage / formatRange', () => {
  it('makes one range per page', () => {
    expect(everyPage(3).map(formatRange)).toEqual(['1', '2', '3']);
  });

  it('formats multi-page ranges', () => {
    expect(formatRange({ start: 2, end: 6 })).toBe('2-6');
  });
});
