import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService, TextKey } from './i18n.service';

/**
 * The route titles are text keys. The browser tab shows them in the chosen language and follows a language switch.
 */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly i18n = inject(I18nService);
  private readonly title = inject(Title);
  private readonly key = signal<TextKey | null>(null);

  constructor() {
    super();

    effect(() => {
      const key = this.key();
      const brand = this.i18n.t('app.brand');
      this.title.setTitle(key ? `${this.i18n.t(key)} · ${brand}` : brand);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set((this.buildTitle(snapshot) as TextKey | undefined) ?? null);
  }
}
