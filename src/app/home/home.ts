import { Component, OnDestroy, signal } from '@angular/core';
import { Icon } from '../shared/icon';
import { ToolCard } from './tool-card';

@Component({
  selector: 'app-home',
  imports: [Icon, ToolCard],
  templateUrl: './home.html',
})
export class Home implements OnDestroy {
  protected readonly feedback = signal('');
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  protected selectTool(tool: 'merge' | 'delete'): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set(
      tool === 'merge'
        ? 'Opening file picker for merging...'
        : 'Opening file picker for page removal...',
    );
    this.feedbackTimer = setTimeout(() => this.feedback.set(''), 2000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.feedbackTimer);
  }
}
