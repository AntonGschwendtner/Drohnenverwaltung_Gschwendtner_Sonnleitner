import { Component, inject, input } from '@angular/core';
import { I18nService } from '../i18n.service';

/**
 * Placeholder strips while a list is loading, so the page does not jump when the data arrives.
 */
@Component({
  selector: 'app-strip-skeleton',
  template: `
    <div class="skeleton" role="status" [attr.aria-label]="i18n.t('state.loading')">
      @for (row of rowList(); track $index) {
        <div class="skeleton-strip"><span></span><span></span><span></span></div>
      }
    </div>
  `,
})
export class StripSkeleton {
  protected readonly i18n = inject(I18nService);

  readonly rows = input(3);

  protected rowList(): number[] {
    return Array.from({ length: this.rows() }, (_, index) => index);
  }
}
