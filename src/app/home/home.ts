import { Component, OnDestroy, signal } from '@angular/core';
import { Icon } from '../shared/icon';
import { ToolCard } from './tool-card';
import { ToolCardData } from '../shared/ToolCardData';

@Component({
  selector: 'app-home',
  imports: [Icon, ToolCard],
  templateUrl: './home.html',
})
export class Home implements OnDestroy {
  protected readonly feedback = signal('');
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  protected selectTool(card: ToolCardData): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set(
      card.tool === 'merge'
        ? 'Opening file picker for merging...'
        : 'Opening file picker for page removal...',
    );
    console.log('Selected tool:', card.tool);
    console.log('Selected files:', card.files);

    this.feedbackTimer = setTimeout(() => this.feedback.set(''), 2000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.feedbackTimer);
  }
}
