import { moveItem, toFileItems } from './file-item';

describe('file items', () => {
  it('gives every file a unique id', () => {
    const file = new File([''], 'a.pdf');
    const [first, second] = toFileItems([file, file]);
    expect(first.id).not.toBe(second.id);
  });

  it.each([
    [0, 2, ['b', 'c', 'a']],
    [2, 0, ['c', 'a', 'b']],
    [1, 1, ['a', 'b', 'c']],
  ])('moves an item from %d to %d', (from, to, expected) => {
    expect(moveItem(['a', 'b', 'c'], { from, to })).toEqual(expected);
  });
});
