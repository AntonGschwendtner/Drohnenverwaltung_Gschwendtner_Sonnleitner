import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, DefectReport, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from './empty-state';

/**
 * The damage history of a drone or of a student group, the newest report first (REQ-042). It loads itself and loads
 * again when `version` changes, for example after a defect was reported or repaired on the page.
 */
@Component({
  selector: 'app-defect-history',
  imports: [DatePipe, EmptyState, RouterLink],
  template: `
    <section aria-labelledby="defect-history">
      <h2 id="defect-history">{{ i18n.t('defects.title') }}</h2>
      @if (errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      } @else if (reports().length === 0) {
        <app-empty-state>{{ i18n.t('defects.empty') }}</app-empty-state>
      } @else {
        <table>
          <thead>
            <tr>
              <th>{{ for() === 'drone' ? i18n.t('defects.reportedBy') : i18n.t('field.drone') }}</th>
              <th>{{ i18n.t('defects.description') }}</th>
              <th>{{ i18n.t('defects.reportedOn') }}</th>
              <th>{{ i18n.t('defects.repairedOn') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (report of reports(); track report.id) {
              <tr [attr.data-defect]="report.id">
                <td>
                  @if (for() === 'drone') {
                    @if (report.studentGroupId) {
                      <a [routerLink]="['/student-groups', report.studentGroupId]">{{ report.studentGroupName }}</a>
                    } @else {
                      {{ report.studentGroupName ?? '–' }}
                    }
                  } @else {
                    <a [routerLink]="['/drones', report.droneId]">{{ report.droneName }}</a>
                  }
                </td>
                <td [attr.data-label]="i18n.t('defects.description')">{{ report.description }}</td>
                <td [attr.data-label]="i18n.t('defects.reportedOn')">{{ report.reportedOn | date: 'dd.MM.yyyy' }}</td>
                <td [attr.data-label]="i18n.t('defects.repairedOn')">
                  @if (report.repairedOn) {
                    {{ report.repairedOn | date: 'dd.MM.yyyy' }}
                  } @else {
                    <span class="status-defective">{{ i18n.t('defects.open') }}</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class DefectHistory {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  /** Whose history this is: a drone shows the reporting groups, a group shows the drones. */
  readonly for = input.required<'drone' | 'studentGroup'>();
  readonly id = input.required<number>();
  readonly version = input(0);

  protected readonly reports = signal<DefectReport[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  private request: Subscription | null = null;

  constructor() {
    effect(() => {
      const filter = this.for() === 'drone' ? { droneId: this.id() } : { studentGroupId: this.id() };
      this.version();
      untracked(() => this.load(filter));
    });
  }

  private load(filter: { droneId?: number; studentGroupId?: number }): void {
    this.request?.unsubscribe();
    this.request = this.api.listDefects(filter).subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.errorMessage.set(null);
      },
      error: (error: unknown) => this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback'))),
    });
  }
}
