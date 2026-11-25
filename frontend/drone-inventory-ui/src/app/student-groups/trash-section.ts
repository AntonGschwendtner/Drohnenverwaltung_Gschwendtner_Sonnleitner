import { DatePipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { ApiService, readErrorMessage, StudentGroup, TrashedStudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';

/**
 * The trash of the student groups (REQ-033). It opens on demand, so the group list loads as fast as before. A group
 * is restored with everything it had.
 */
@Component({
  selector: 'app-trash-section',
  imports: [DatePipe, EmptyState],
  template: `
    <section class="trash" aria-labelledby="group-trash">
      <h2 id="group-trash">
        <button
          type="button"
          class="trash-toggle"
          [attr.aria-expanded]="open()"
          aria-controls="group-trash-content"
          (click)="toggle()"
        >
          {{ i18n.t('trash.title') }}
        </button>
      </h2>

      @if (open()) {
        <div id="group-trash-content">
          @if (errorMessage(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }

          @if (loading()) {
            <p class="trash-loading">{{ i18n.t('trash.loading') }}</p>
          } @else if (groups().length === 0) {
            <app-empty-state>{{ i18n.t('trash.empty') }}</app-empty-state>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>{{ i18n.t('field.name') }}</th>
                  <th>{{ i18n.t('trash.deletedOn') }}</th>
                  <th>{{ i18n.t('trash.loans') }}</th>
                  <th>{{ i18n.t('trash.members') }}</th>
                  <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (group of groups(); track group.id) {
                  <tr [attr.data-trashed]="group.id">
                    <td>{{ group.name }}</td>
                    <td [attr.data-label]="i18n.t('trash.deletedOn')">{{ group.deletedAt | date: 'dd.MM.yyyy' }}</td>
                    <td [attr.data-label]="i18n.t('trash.loans')">{{ group.loanCount }}</td>
                    <td [attr.data-label]="i18n.t('trash.members')">{{ group.memberCount }}</td>
                    <td class="row-actions">
                      <button type="button" class="quiet restore" (click)="restore(group)" [disabled]="busyId() !== null" [class.busy]="busyId() === group.id">
                        {{ i18n.t('trash.restore') }}<span class="visually-hidden"> {{ group.name }}</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </section>
  `,
})
export class TrashSection {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  /** A group came back from the trash; the page shows it in its list again. */
  readonly restored = output<StudentGroup>();

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly groups = signal<TrashedStudentGroup[]>([]);
  protected readonly busyId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) {
      this.reload();
    }
  }

  /** Loads the trash again when it is open, for example after a group was moved into it. */
  reload(): void {
    if (!this.open()) {
      return;
    }

    this.loading.set(true);
    this.api.listTrash().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.errorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  protected restore(group: TrashedStudentGroup): void {
    if (this.busyId() !== null) {
      return;
    }

    this.busyId.set(group.id);
    this.errorMessage.set(null);
    this.api.restoreStudentGroup(group.id).subscribe({
      next: (restored) => {
        this.busyId.set(null);
        this.groups.update((groups) => groups.filter((candidate) => candidate.id !== group.id));
        this.restored.emit(restored);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
}
