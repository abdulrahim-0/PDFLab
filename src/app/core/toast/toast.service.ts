import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DURATION_MS: Record<ToastKind, number> = { info: 4000, success: 4000, error: 8000 };
const MAX_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = DURATION_MS[kind]): number {
    const id = this.nextId++;
    this.items.update((list) => {
      const next = [...list, { id, kind, message }];
      next.slice(0, -MAX_TOASTS).forEach((old) => this.clearTimer(old.id));
      return next.slice(-MAX_TOASTS);
    });
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs),
    );
    return id;
  }

  info(message: string): number {
    return this.show(message, 'info');
  }

  success(message: string): number {
    return this.show(message, 'success');
  }

  error(message: string): number {
    return this.show(message, 'error');
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private clearTimer(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
}
