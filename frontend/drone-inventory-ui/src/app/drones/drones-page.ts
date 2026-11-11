import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, Drone, readErrorMessage } from '../api.service';

@Component({
  selector: 'app-drones-page',
  template: `
    <h1>Drones</h1>

    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }

    @if (drones().length === 0) {
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
  styles: `
    .status-available {
      color: var(--available);
      font-weight: 600;
    }

    .status-loaned {
      color: var(--loaned);
      font-weight: 600;
    }
  `,
})
export class DronesPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly drones = signal<Drone[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDrones();
  }

  protected loadDrones(): void {
    this.api.listDrones().subscribe({
      next: (drones) => {
        this.drones.set(drones);
        this.errorMessage.set(null);
      },
      error: (error: unknown) => this.errorMessage.set(readErrorMessage(error)),
    });
  }
}
