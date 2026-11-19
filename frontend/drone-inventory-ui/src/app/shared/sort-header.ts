import { Component, computed, input, model } from '@angular/core';
import { ariaSort, nextSort, SortState } from './sort';

/**
 * A column header that sorts its list (REQ-020). The first choice sorts ascending, the same header again
 * reverses the order. The header cell carries aria-sort, so screen readers announce the order.
 */
@Component({
  selector: 'th[appSortHeader]',
  host: { '[attr.aria-sort]': 'order()' },
  template: `
    <button type="button" class="sort-button" (click)="choose()">
      {{ label() }}<span class="sort-mark" aria-hidden="true">{{ mark() }}</span>
    </button>
  `,
})
export class SortHeader {
  readonly column = input.required<string>({ alias: 'appSortHeader' });
  readonly label = input.required<string>();
  readonly sort = model<SortState<string> | null>(null);

  protected readonly order = computed(() => ariaSort(this.sort(), this.column()));
  protected readonly mark = computed(() => {
    const order = this.order();
    return order === 'ascending' ? '▲' : order === 'descending' ? '▼' : '◇';
  });

  protected choose(): void {
    this.sort.set(nextSort(this.sort(), this.column()));
  }
}
