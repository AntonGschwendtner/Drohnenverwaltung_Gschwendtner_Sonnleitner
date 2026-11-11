import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-drones-page',
  imports: [EmptyState, ReactiveFormsModule, StripSkeleton],
  template: `
    <p class="kicker">{{ i18n.t('drones.kicker') }}</p>
    <h1>{{ i18n.t('nav.drones') }}</h1>
    <p class="lede">{{ i18n.t('drones.lede') }}</p>

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
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.name') }}</th>
            <th>{{ i18n.t('field.status') }}</th>
            <th>{{ i18n.t('field.description') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (drone of drones(); track drone.id) {
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
