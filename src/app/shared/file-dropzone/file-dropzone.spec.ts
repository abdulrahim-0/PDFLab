import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/toast/toast.service';
import { FileDropzone } from './file-dropzone';

function drop(target: Element, files: File[]): void {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } });
  target.dispatchEvent(event);
}

describe('FileDropzone', () => {
  it('emits valid dropped files and reports rejected ones', async () => {
    const fixture = TestBed.createComponent(FileDropzone);
    const toast = TestBed.inject(ToastService);
    const emitted: File[][] = [];
    fixture.componentInstance.filesAdded.subscribe((files) => emitted.push(files));
    await fixture.whenStable();

    const good = new File(['%PDF-1.7'], 'good.pdf', { type: 'application/pdf' });
    const bad = new File(['hi'], 'bad.txt', { type: 'text/plain' });
    drop(fixture.nativeElement.firstElementChild, [good, bad]);

    await vi.waitFor(() => expect(emitted).toEqual([[good]]));
    expect(toast.toasts().map((t) => t.message)).toEqual(['bad.txt: Not a PDF file.']);
  });

  it('has a keyboard-reachable button that opens the file picker', async () => {
    const fixture = TestBed.createComponent(FileDropzone);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector('input[type=file]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    element.querySelector('button')!.click();

    expect(click).toHaveBeenCalled();
    expect(input.accept).toBe('.pdf,application/pdf');
    expect(input.multiple).toBe(true);
  });
});
