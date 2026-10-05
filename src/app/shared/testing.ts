/** Helpers shared by component tests. */

export function pdfFile(name: string): File {
  return new File(['%PDF-1.7'], name, { type: 'application/pdf' });
}

/** Simulates dropping files on the first dropzone inside `root`. */
export function dropFiles(root: Element, files: File[]): void {
  const target = root.querySelector('app-file-dropzone > div');
  if (!target) {
    throw new Error('No dropzone found');
  }
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } });
  target.dispatchEvent(event);
}

/**
 * Finds a button whose aria-label or text matches `label` exactly (after
 * trimming), falling back to one that contains it, and clicks it.
 */
export function clickButton(
  root: Element,
  label: string,
  { dryRun = false } = {},
): HTMLButtonElement {
  const buttons = Array.from(root.querySelectorAll('button'));
  const name = (b: HTMLButtonElement) =>
    (b.getAttribute('aria-label') ?? b.textContent ?? '').replace(/\s+/g, ' ').trim();
  const button =
    buttons.find((b) => name(b) === label) ?? buttons.find((b) => name(b).includes(label));
  if (!button) {
    throw new Error(`No button labelled "${label}"`);
  }
  if (!dryRun) {
    button.click();
  }
  return button;
}

/** A PdfRenderService stand-in: fixed page count, thumbnails that never finish. */
export function fakeRenderer(pageCount: number | (() => Promise<number>)) {
  return {
    getPageCount: typeof pageCount === 'number' ? () => Promise.resolve(pageCount) : pageCount,
    renderThumbnail: () => new Promise<string>(() => {}),
    release: vi.fn(),
  };
}
