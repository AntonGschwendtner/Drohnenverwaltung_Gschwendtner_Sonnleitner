import { Component } from '@angular/core';

/**
 * An empty list: a quiet radar scope with nothing on it, and the text of the page.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <p class="empty">
      <svg class="empty-scope" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" />
        <circle cx="24" cy="24" r="13" />
        <circle cx="24" cy="24" r="5" />
        <line class="empty-beam" x1="24" y1="24" x2="24" y2="3" />
      </svg>
      <span><ng-content /></span>
    </p>
  `,
})
export class EmptyState {}
