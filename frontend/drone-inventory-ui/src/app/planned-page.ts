import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Stands in for a view that a later task adds. It is removed with the last of them.
 */
@Component({
  selector: 'app-planned-page',
  template: `
    <h1>{{ title }}</h1>
    <p class="empty">This view is not available yet.</p>
  `,
})
export class PlannedPage {
  protected readonly title = inject(ActivatedRoute).snapshot.title;
}
