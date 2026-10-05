import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows a toast and hides it after its duration', () => {
    service.success('Saved');
    expect(service.toasts()).toEqual([
      { id: expect.any(Number), kind: 'success', message: 'Saved' },
    ]);

    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toEqual([]);
  });

  it('keeps errors on screen longer', () => {
    service.error('Oops');
    vi.advanceTimersByTime(4000);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toEqual([]);
  });

  it('can be dismissed early', () => {
    const id = service.info('Hello');
    service.dismiss(id);
    expect(service.toasts()).toEqual([]);
  });

  it('keeps only the newest four', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      service.info(`Toast ${n}`);
    }
    expect(service.toasts().map((t) => t.message)).toEqual([
      'Toast 2',
      'Toast 3',
      'Toast 4',
      'Toast 5',
    ]);
  });
});
