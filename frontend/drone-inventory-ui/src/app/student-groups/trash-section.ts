import { DatePipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService, readErrorMessage, StudentGroup, TrashedStudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';

/**
 * The trash of the student groups (REQ-033). It opens on demand, so the group list loads as fast as before. A group
 * is restored with everything it had.
 */
@Component({
  selector: 'app-trash-section',
  imports: [ConfirmDialog, DatePipe, EmptyState],
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
                      <button type="button" class="quiet delete-permanently" (click)="askPermanent(group, $event)" [disabled]="busyId() !== null">
                        {{ i18n.t('trash.deletePermanently') }}<span class="visually-hidden"> {{ group.name }}</span>
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

    @if (pendingPermanent(); as group) {
      <app-confirm-dialog
        [heading]="i18n.t('trash.permanentTitle', { group: group.name })"
        [text]="i18n.t('trash.permanentText', { group: group.name })"
        [confirmLabel]="history() === 'keep' ? i18n.t('trash.confirmKeep') : i18n.t('trash.confirmAll')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmPermanent()"
        (cancelled)="cancelPermanent()"
      >
        <fieldset class="history-choice">
          <legend>{{ i18n.t('trash.historyLegend') }}</legend>
          <label>
            <input type="radio" name="history" value="keep" [checked]="history() === 'keep'" (change)="history.set('keep')" />
            {{ i18n.t('trash.keepHistory', { group: group.name }) }}
          </label>
          <label>
            <input type="radio" name="history" value="delete" [checked]="history() === 'delete'" (change)="history.set('delete')" />
            {{ i18n.t('trash.deleteHistory', { count: '' + group.loanCount }) }}
          </label>
        </fieldset>
      </app-confirm-dialog>
    }
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

  /** The group waiting for the answer of the permanent dialog and the chosen fate of its history. */
  protected readonly pendingPermanent = signal<TrashedStudentGroup | null>(null);
  protected readonly history = signal<'keep' | 'delete'>('keep');
  private permanentTrigger: HTMLElement | null = null;
  private loadRequest: Subscription | null = null;

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) {
      this.reload();
    }
  }

  /**
   * Loads the trash again when it is open, for example after a group was moved into it. A message stays visible
   * after the load, such as the reason why a restore failed.
   */
  reload(message: string | null = null): void {
    if (!this.open()) {
      return;
    }

    // A newer load replaces an older one that is still on its way.
    this.loadRequest?.unsubscribe();
    this.loading.set(true);
    this.loadRequest = this.api.listTrash().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.errorMessage.set(message);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  protected askPermanent(group: TrashedStudentGroup, event: Event): void {
    this.permanentTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    // Keeping the history is the safe default; deleting it has to be chosen on purpose.
    this.history.set('keep');
    this.pendingPermanent.set(group);
  }

  protected cancelPermanent(): void {
    this.pendingPermanent.set(null);
    this.permanentTrigger?.focus();
    this.permanentTrigger = null;
  }

  protected confirmPermanent(): void {
    const group = this.pendingPermanent();
    this.pendingPermanent.set(null);
    this.permanentTrigger = null;
    if (!group) {
      return;
    }

    this.busyId.set(group.id);
    this.errorMessage.set(null);
    this.api.deleteStudentGroupPermanently(group.id, this.history()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.groups.update((groups) => groups.filter((candidate) => candidate.id !== group.id));
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.reloadAfterError(error);
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
        this.reloadAfterError(error);
      },
    });
  }

  /** Shows the message and loads the trash again, because the group may have been changed somewhere else. */
  private reloadAfterError(error: unknown): void {
    const message = readErrorMessage(error, this.i18n.t('error.fallback'));
    this.errorMessage.set(message);
    this.reload(message);
  }
}
