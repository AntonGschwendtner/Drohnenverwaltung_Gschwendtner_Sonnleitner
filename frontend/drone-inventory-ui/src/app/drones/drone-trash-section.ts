import { DatePipe } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService, Drone, readErrorMessage, TrashedDrone } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';

/**
 * The trash of the drones (REQ-034), the same as the trash of the student groups. It opens on demand, so the drone
 * list loads as fast as before. A drone is restored with its loans and its defect.
 */
@Component({
  selector: 'app-drone-trash-section',
  imports: [ConfirmDialog, DatePipe, EmptyState],
  template: `
    <section class="trash" aria-labelledby="drone-trash">
      <h2 id="drone-trash">
        <button
          type="button"
          class="trash-toggle"
          [attr.aria-expanded]="open()"
          aria-controls="drone-trash-content"
          (click)="toggle()"
        >
          {{ i18n.t('trash.title') }}
        </button>
      </h2>

      @if (open()) {
        <div id="drone-trash-content">
          @if (errorMessage(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }

          @if (loading()) {
            <p class="trash-loading">{{ i18n.t('trash.loading') }}</p>
          } @else if (drones().length === 0) {
            <app-empty-state>{{ i18n.t('trash.empty') }}</app-empty-state>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>{{ i18n.t('field.name') }}</th>
                  <th>{{ i18n.t('trash.deletedOn') }}</th>
                  <th>{{ i18n.t('trash.loans') }}</th>
                  <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (drone of drones(); track drone.id) {
                  <tr [attr.data-trashed-drone]="drone.id">
                    <td>{{ drone.name }}</td>
                    <td [attr.data-label]="i18n.t('trash.deletedOn')">{{ drone.deletedAt | date: 'dd.MM.yyyy' }}</td>
                    <td [attr.data-label]="i18n.t('trash.loans')">{{ drone.loanCount }}</td>
                    <td class="row-actions">
                      <button type="button" class="quiet restore" (click)="restore(drone)" [disabled]="busyId() !== null" [class.busy]="busyId() === drone.id">
                        {{ i18n.t('trash.restore') }}<span class="visually-hidden"> {{ drone.name }}</span>
                      </button>
                      <button type="button" class="quiet delete-permanently" (click)="askPermanent(drone, $event)" [disabled]="busyId() !== null">
                        {{ i18n.t('trash.deletePermanently') }}<span class="visually-hidden"> {{ drone.name }}</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="trash-footer">
              <button type="button" class="quiet empty-trash" (click)="askEmpty($event)" [disabled]="busyId() !== null">
                {{ i18n.t('trash.emptyAll') }}
              </button>
            </div>
          }
        </div>
      }
    </section>

    @if (pendingPermanent(); as drone) {
      <app-confirm-dialog
        [heading]="i18n.t('trash.permanentTitle', { name: drone.name })"
        [text]="i18n.t('trash.permanentTextDrone', { name: drone.name })"
        [confirmLabel]="history() === 'keep' ? i18n.t('trash.confirmKeep') : i18n.t('trash.confirmAll')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmPermanent()"
        (cancelled)="cancelPermanent()"
      >
        <fieldset class="history-choice">
          <legend>{{ i18n.t('trash.historyLegend') }}</legend>
          <label>
            <input type="radio" name="history" value="keep" [checked]="history() === 'keep'" (change)="history.set('keep')" />
            {{ i18n.t('trash.keepHistory', { name: drone.name }) }}
          </label>
          <label>
            <input type="radio" name="history" value="delete" [checked]="history() === 'delete'" (change)="history.set('delete')" />
            {{ i18n.t('trash.deleteHistory', { count: '' + drone.loanCount }) }}
          </label>
        </fieldset>
      </app-confirm-dialog>
    }

    @if (pendingEmpty()) {
      <app-confirm-dialog
        [heading]="i18n.t('trash.emptyTitle')"
        [text]="i18n.t('trash.emptyTextDrones', { count: '' + drones().length })"
        [confirmLabel]="history() === 'keep' ? i18n.t('trash.confirmKeep') : i18n.t('trash.confirmAll')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmEmpty()"
        (cancelled)="cancelEmpty()"
      >
        <fieldset class="history-choice">
          <legend>{{ i18n.t('trash.historyLegendAll') }}</legend>
          <label>
            <input type="radio" name="history-all" value="keep" [checked]="history() === 'keep'" (change)="history.set('keep')" />
            {{ i18n.t('trash.keepHistoryAll') }}
          </label>
          <label>
            <input type="radio" name="history-all" value="delete" [checked]="history() === 'delete'" (change)="history.set('delete')" />
            {{ i18n.t('trash.deleteHistory', { count: '' + totalLoans() }) }}
          </label>
        </fieldset>
      </app-confirm-dialog>
    }
  `,
})
export class DroneTrashSection {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  /** A drone came back from the trash; the page shows it in its list again. */
  readonly restored = output<Drone>();

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly drones = signal<TrashedDrone[]>([]);
  protected readonly busyId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  /** The drone waiting for the answer of the permanent dialog and the chosen fate of its history. */
  protected readonly pendingPermanent = signal<TrashedDrone | null>(null);
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
   * Loads the trash again when it is open, for example after a drone was moved into it. A message stays visible
   * after the load, such as the reason why a restore failed.
   */
  reload(message: string | null = null): void {
    if (!this.open()) {
      return;
    }

    // A newer load replaces an older one that is still on its way.
    this.loadRequest?.unsubscribe();
    this.loading.set(true);
    this.loadRequest = this.api.listDroneTrash().subscribe({
      next: (drones) => {
        this.drones.set(drones);
        this.errorMessage.set(message);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  protected askPermanent(drone: TrashedDrone, event: Event): void {
    this.permanentTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    // Keeping the history is the safe default; deleting it has to be chosen on purpose.
    this.history.set('keep');
    this.pendingPermanent.set(drone);
  }

  protected cancelPermanent(): void {
    this.pendingPermanent.set(null);
    this.permanentTrigger?.focus();
    this.permanentTrigger = null;
  }

  protected confirmPermanent(): void {
    const drone = this.pendingPermanent();
    this.pendingPermanent.set(null);
    this.permanentTrigger = null;
    if (!drone) {
      return;
    }

    this.busyId.set(drone.id);
    this.errorMessage.set(null);
    this.api.deleteDronePermanently(drone.id, this.history()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.drones.update((drones) => drones.filter((candidate) => candidate.id !== drone.id));
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.reloadAfterError(error);
      },
    });
  }

  /** The dialog for emptying the whole trash is open. */
  protected readonly pendingEmpty = signal(false);
  protected readonly totalLoans = computed(() => this.drones().reduce((sum, drone) => sum + drone.loanCount, 0));

  protected askEmpty(event: Event): void {
    this.permanentTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.history.set('keep');
    this.pendingEmpty.set(true);
  }

  protected cancelEmpty(): void {
    this.pendingEmpty.set(false);
    this.permanentTrigger?.focus();
    this.permanentTrigger = null;
  }

  protected confirmEmpty(): void {
    this.pendingEmpty.set(false);
    this.permanentTrigger = null;
    this.busyId.set(-1);
    this.errorMessage.set(null);
    this.api.emptyDroneTrash(this.history()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reload();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.reloadAfterError(error);
      },
    });
  }

  protected restore(drone: TrashedDrone): void {
    if (this.busyId() !== null) {
      return;
    }

    this.busyId.set(drone.id);
    this.errorMessage.set(null);
    this.api.restoreDrone(drone.id).subscribe({
      next: (restored) => {
        this.busyId.set(null);
        this.drones.update((drones) => drones.filter((candidate) => candidate.id !== drone.id));
        this.restored.emit(restored);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.reloadAfterError(error);
      },
    });
  }

  /** Shows the message and loads the trash again, because the drone may have been changed somewhere else. */
  private reloadAfterError(error: unknown): void {
    const message = readErrorMessage(error, this.i18n.t('error.fallback'));
    this.errorMessage.set(message);
    this.reload(message);
  }
}
