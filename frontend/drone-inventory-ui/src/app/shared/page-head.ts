import { Component, computed, input } from '@angular/core';

/**
 * The head of a page: the bay label, a large title whose letters flip in like a departure board,
 * the lead text and the bay number in outline.
 */
@Component({
  selector: 'app-page-head',
  template: `
    <header class="page-head">
      <div class="page-head-text">
        <p class="kicker">{{ kicker() }}</p>
        <h1 [attr.aria-label]="title()">
          @for (char of chars(); track char + $index) {<span class="flap" [style.--i]="$index" aria-hidden="true">{{ char }}</span>}
        </h1>
        <p class="lede">{{ lede() }}</p>
      </div>
      <span class="bay-number" aria-hidden="true">{{ bay() }}</span>
    </header>
    <div class="ruler" aria-hidden="true"></div>
  `,
})
export class PageHead {
  readonly bay = input.required<string>();
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  readonly lede = input.required<string>();

  protected readonly chars = computed(() => Array.from(this.title()));
}
