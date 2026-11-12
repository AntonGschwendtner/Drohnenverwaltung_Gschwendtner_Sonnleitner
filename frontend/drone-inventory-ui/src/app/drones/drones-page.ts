import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, DroneStatus, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-drones-page',
  imports: [ConfirmDialog, EmptyState, PageHead, ReactiveFormsModule, SearchField, StripSkeleton],
  template: `
    <app-page-head
      bay="01"
      [kicker]="i18n.t('drones.kicker')"
      [title]="i18n.t('nav.drones')"
      [lede]="i18n.t('drones.lede')"
    />

    @if (!loading() && !loadErrorMessage()) {
      <section class="overview" [attr.aria-label]="i18n.t('overview.label')">
        <dl>
          <div class="overview-tile">
            <dt>{{ i18n.t('overview.total') }}</dt>
            <dd>{{ overview().total }}</dd>
          </div>
          <div class="overview-tile overview-available">
            <dt>{{ i18n.t('status.available') }}</dt>
            <dd>{{ overview().available }}</dd>
          </div>
          <div class="overview-tile overview-loaned">
            <dt>{{ i18n.t('status.loaned') }}</dt>
            <dd>{{ overview().loaned }}</dd>
          </div>
        </dl>
      </section>
    }

    <section class="panel" aria-labelledby="new-drone">
      <h2 id="new-drone">{{ i18n.t('drones.new') }}</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createDrone()">
        <label>
          {{ i18n.t('field.name') }}
          <input formControlName="name" name="name" autocomplete="off" />
        </label>
        <label>
          {{ i18n.t('field.description') }}
          <textarea formControlName="description" name="description" rows="2"></textarea>
        </label>
        <button type="submit" [disabled]="saving()" [class.busy]="saving()">{{ i18n.t('drones.add') }}</button>
      </form>
    </section>

    @if (loading()) {
      <app-strip-skeleton />
    } @else if (loadErrorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (drones().length === 0) {
      <app-empty-state>{{ i18n.t('drones.empty') }}</app-empty-state>
    } @else {
      <div class="list-tools">
        <app-search-field [label]="i18n.t('search.label')" [placeholder]="i18n.t('drones.searchHint')" [(value)]="search" />
        <div class="segmented" role="group" [attr.aria-label]="i18n.t('field.status')">
          @for (option of statusOptions; track option.value) {
            <button type="button" [attr.aria-pressed]="statusFilter() === option.value" (click)="statusFilter.set(option.value)">
              {{ i18n.t(option.label) }}
            </button>
          }
        </div>
      </div>

      @if (listErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (visibleDrones().length === 0) {
        <app-empty-state>{{ i18n.t('drones.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.name') }}</th>
            <th>{{ i18n.t('field.status') }}</th>
            <th>{{ i18n.t('field.description') }}</th>
            <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (drone of visibleDrones(); track drone.id) {
            @if (editingId() === drone.id) {
              <tr class="editing" [formGroup]="editForm">
                <td>
                  <label class="visually-hidden" [for]="'edit-name-' + drone.id">{{ i18n.t('field.name') }}</label>
                  <input [id]="'edit-name-' + drone.id" formControlName="name" name="editName" autocomplete="off" />
                </td>
                <td [class]="'status-' + drone.status.toLowerCase()">
                  {{ i18n.t(drone.status === 'Loaned' ? 'status.loaned' : 'status.available') }}
                </td>
                <td [attr.data-label]="i18n.t('field.description')">
                  <label class="visually-hidden" [for]="'edit-description-' + drone.id">{{ i18n.t('field.description') }}</label>
                  <input [id]="'edit-description-' + drone.id" formControlName="description" name="editDescription" autocomplete="off" />
                </td>
                <td class="row-actions">
                  <button type="button" class="save" (click)="saveEdit(drone)" [disabled]="busyId() !== null" [class.busy]="busyId() === drone.id">
                    {{ i18n.t('action.save') }}
                  </button>
                  <button type="button" class="quiet" (click)="cancelEdit()">{{ i18n.t('dialog.cancel') }}</button>
                </td>
              </tr>
            } @else {
              <tr>
                <td>{{ drone.name }}</td>
                <td [class]="'status-' + drone.status.toLowerCase()">
                  {{ i18n.t(drone.status === 'Loaned' ? 'status.loaned' : 'status.available') }}
                </td>
                <td [attr.data-label]="i18n.t('field.description')">{{ drone.description }}</td>
                <td class="row-actions">
                  <button type="button" class="quiet edit" (click)="startEdit(drone)" [disabled]="busyId() !== null">
                    {{ i18n.t('action.edit') }}<span class="visually-hidden"> {{ drone.name }}</span>
                  </button>
                  <button type="button" class="quiet delete" (click)="askToDelete(drone, $event)" [disabled]="busyId() !== null" [class.busy]="busyId() === drone.id">
                    {{ i18n.t('action.delete') }}<span class="visually-hidden"> {{ drone.name }}</span>
                  </button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      }
    }

    @if (pendingDelete(); as drone) {
      <app-confirm-dialog
        [heading]="i18n.t('drones.deleteTitle', { drone: drone.name })"
        [text]="i18n.t('drones.deleteText', { drone: drone.name })"
        [confirmLabel]="i18n.t('action.delete')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmDelete()"
        (cancelled)="cancelDelete()"
      />
    }
  `,
})
export class DronesPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: '',
    description: '',
  });

  protected readonly editForm = inject(FormBuilder).nonNullable.group({
    name: '',
    description: '',
  });

  protected readonly drones = signal<Drone[]>([]);
  /** Edit and delete work on one strip at a time (REQ-015, REQ-016). */
  protected readonly editingId = signal<number | null>(null);
  protected readonly busyId = signal<number | null>(null);
  protected readonly pendingDelete = signal<Drone | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);
  private deleteTrigger: HTMLElement | null = null;
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);

  /** Search and status filter narrow the loaded list in the browser (REQ-011). */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<DroneStatus | 'All'>('All');
  protected readonly statusOptions = [
    { value: 'All', label: 'filter.all' },
    { value: 'Available', label: 'status.available' },
    { value: 'Loaned', label: 'status.loaned' },
  ] as const;
  /** Counts all drones, independent of search and filter (REQ-014). */
  protected readonly overview = computed(() => {
    const drones = this.drones();
    return {
      total: drones.length,
      available: drones.filter((drone) => drone.status === 'Available').length,
      loaned: drones.filter((drone) => drone.status === 'Loaned').length,
    };
  });
  protected readonly visibleDrones = computed(() =>
    this.drones().filter(
      (drone) =>
        matchesSearch(drone.name, this.search()) &&
        (this.statusFilter() === 'All' || drone.status === this.statusFilter()),
    ),
  );

  ngOnInit(): void {
    this.loadDrones();
  }

  protected loadDrones(): void {
    this.api.listDrones().subscribe({
      next: (drones) => {
        this.drones.set(drones);
        this.loadErrorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  // The backend checks the name, so the form sends what was entered and shows its answer.
  protected createDrone(): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveErrorMessage.set(null);

    this.api.createDrone(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.loadDrones();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected startEdit(drone: Drone): void {
    this.listErrorMessage.set(null);
    this.editForm.setValue({ name: drone.name, description: drone.description });
    this.editingId.set(drone.id);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.listErrorMessage.set(null);
  }

  // The backend checks the name, so the edit sends what was entered and shows its answer.
  protected saveEdit(drone: Drone): void {
    if (this.busyId() !== null) {
      return;
    }

    this.busyId.set(drone.id);
    this.listErrorMessage.set(null);

    this.api.updateDrone(drone.id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.editingId.set(null);
        this.loadDrones();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected askToDelete(drone: Drone, event: Event): void {
    if (this.busyId() !== null) {
      return;
    }

    this.deleteTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingDelete.set(drone);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
    this.deleteTrigger?.focus();
    this.deleteTrigger = null;
  }

  // The backend refuses drones with loans; the page shows its message.
  protected confirmDelete(): void {
    const drone = this.pendingDelete();
    this.pendingDelete.set(null);
    this.deleteTrigger = null;
    if (!drone) {
      return;
    }

    this.busyId.set(drone.id);
    this.listErrorMessage.set(null);

    this.api.deleteDrone(drone.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadDrones();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
}
