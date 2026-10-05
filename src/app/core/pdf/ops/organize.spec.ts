import { organizePdf } from './organize';
import { makePdf, pageWidths } from './testing';

describe('organizePdf', () => {
  it('reorders and drops pages', async () => {
    const output = await organizePdf(
      { name: 'deck.pdf', data: await makePdf(100, 200, 300, 400) },
      [3, 0, 2],
    );
    expect(output.filename).toBe('deck-organized.pdf');
    expect(await pageWidths(output.data)).toEqual([400, 100, 300]);
  });

  it('rejects an empty selection and unknown pages', async () => {
    const data = await makePdf(100, 200);
    await expect(organizePdf({ name: 'a.pdf', data }, [])).rejects.toThrow(
      'Keep at least one page.',
    );
    await expect(organizePdf({ name: 'a.pdf', data }, [0, 5])).rejects.toThrow(
      'Page 6 isn’t in this PDF.',
    );
  });
});
