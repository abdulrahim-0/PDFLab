import { Component } from '@angular/core';
import { TOOLS } from '../../core/tools';
import { Icon } from '../../shared/icon';
import { ToolCard } from './tool-card';

@Component({
  selector: 'app-home',
  imports: [Icon, ToolCard],
  templateUrl: './home.html',
})
export class Home {
  protected readonly tools = TOOLS;
}
