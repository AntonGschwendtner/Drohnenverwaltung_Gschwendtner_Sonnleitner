import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, DroneStatus, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-drones-page',
  imports: [EmptyState, PageHead, ReactiveFormsModule, SearchField, StripSkeleton],
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

      @if (visibleDrones().length === 0) {
        <app-empty-state>{{ i18n.t('drones.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.name') }}</th>
            <th>{{ i18n.t('field.status') }}</th>
            <th>{{ i18n.t('field.description') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (drone of visibleDrones(); track drone.id) {
            <tr>
              <td>{{ drone.name }}</td>
              <td [class]="'status-' + drone.status.toLowerCase()">
                {{ i18n.t(drone.status === 'Loaned' ? 'status.loaned' : 'status.available') }}
              </td>
              <td [attr.data-label]="i18n.t('field.description')">{{ drone.description }}</td>
            </tr>
          }
        </tbody>
      </table>
      }
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

  protected readonly drones = signal<Drone[]>([]);
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
}
