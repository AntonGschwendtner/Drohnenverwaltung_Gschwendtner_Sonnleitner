import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, readErrorMessage } from '../api.service';

@Component({
  selector: 'app-drones-page',
  imports: [ReactiveFormsModule],
  template: `
    <p class="kicker">Bay 01 &middot; Fleet</p>
    <h1>Drones</h1>
    <p class="lede">Every drone with its current status. A drone is loaned while it has an active loan.</p>

    <section class="panel" aria-labelledby="new-drone">
      <h2 id="new-drone">New drone</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createDrone()">
        <label>
          Name
          <input formControlName="name" name="name" autocomplete="off" />
        </label>
        <label>
          Description
          <textarea formControlName="description" name="description" rows="2"></textarea>
        </label>
        <button type="submit" [disabled]="saving()">Add drone</button>
      </form>
    </section>

    @if (loadErrorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (drones().length === 0) {
      <p class="empty">No drones yet.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          @for (drone of drones(); track drone.id) {
            <tr>
              <td>{{ drone.name }}</td>
              <td [class]="'status-' + drone.status.toLowerCase()">{{ drone.status }}</td>
              <td>{{ drone.description }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class DronesPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: '',
    description: '',
  });

  protected readonly drones = signal<Drone[]>([]);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.loadDrones();
  }

  protected loadDrones(): void {
    this.api.listDrones().subscribe({
      next: (drones) => {
        this.drones.set(drones);
        this.loadErrorMessage.set(null);
      },
      error: (error: unknown) => this.loadErrorMessage.set(readErrorMessage(error)),
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
        this.saveErrorMessage.set(readErrorMessage(error));
      },
    });
  }
}
