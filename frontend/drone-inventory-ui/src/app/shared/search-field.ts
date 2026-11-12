import { Component, input, model } from '@angular/core';

/**
 * True when the text contains the search, ignoring upper and lower case and surrounding spaces.
 * An empty search matches everything (REQ-011).
 */
export function matchesSearch(text: string, search: string): boolean {
  const wanted = search.trim().toLocaleLowerCase();
  return wanted === '' || text.toLocaleLowerCase().includes(wanted);
}

/**
 * A search box for a list. The page filters its loaded list with matchesSearch.
 */
@Component({
  selector: 'app-search-field',
  template: `
    <label class="search-field">
      {{ label() }}
      <input
        type="search"
        name="search"
        autocomplete="off"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
      />
    </label>
  `,
})
export class SearchField {
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly value = model('');
}
