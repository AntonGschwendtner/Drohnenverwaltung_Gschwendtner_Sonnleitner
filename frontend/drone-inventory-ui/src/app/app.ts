import { DOCUMENT } from '@angular/common';
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
    const destroyRef = inject(DestroyRef);
    const timer = setInterval(() => this.time.set(App.formatTime(new Date())), 1000);
    destroyRef.onDestroy(() => clearInterval(timer));
    this.followPointer(inject(DOCUMENT), destroyRef);
  }

  /**
   * Lets the dot grid light up around the mouse pointer, like a radar lamp over the board.
   * Only CSS variables change, so nothing on the page moves.
   */
  private followPointer(document: Document, destroyRef: DestroyRef): void {
    const view = document.defaultView;
    if (!view) {
      return;
    }

    const root = document.documentElement;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || frame) {
        return;
      }
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty('--mx', `${event.clientX}px`);
        root.style.setProperty('--my', `${event.clientY}px`);
      });
    };

    view.addEventListener('pointermove', move, { passive: true });
    destroyRef.onDestroy(() => {
      view.removeEventListener('pointermove', move);
      view.cancelAnimationFrame(frame);
    });
  }

  private static formatTime(date: Date): string {
    return date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
