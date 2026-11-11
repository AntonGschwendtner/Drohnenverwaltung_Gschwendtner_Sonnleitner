import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from './i18n.service';
import { ThemeService } from './theme.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);

  /** A tower clock in the header. It is decoration only, the backend sets every date. */
  protected readonly time = signal(App.formatTime(new Date()));

  constructor() {
    const timer = setInterval(() => this.time.set(App.formatTime(new Date())), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private static formatTime(date: Date): string {
    return date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
