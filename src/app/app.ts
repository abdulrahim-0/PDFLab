import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';
import { Footer } from './layout/footer';
import { Header } from './layout/header';
import { ToastOutlet } from './shared/toast-outlet/toast-outlet';

@Component({
  imports: [Footer, Header, RouterOutlet, ToastOutlet],
  selector: 'app-root',
  host: { class: 'flex min-h-dvh flex-col' },
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // Instantiate early so the theme stays in sync with the system setting.
    inject(ThemeService);
  }
}
