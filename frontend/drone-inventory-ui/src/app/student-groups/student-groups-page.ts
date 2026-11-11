import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, readErrorMessage, StudentGroup } from '../api.service';

@Component({
  selector: 'app-student-groups-page',
  imports: [ReactiveFormsModule],
  template: `
    <p class="kicker">Bay 02 &middot; Crews</p>
    <h1>Student groups</h1>
    <p class="lede">The groups that can loan drones and are responsible for them.</p>

    <section class="panel" aria-labelledby="new-student-group">
      <h2 id="new-student-group">New student group</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createStudentGroup()">
        <label>
          Name
          <input formControlName="name" name="name" autocomplete="off" />
        </label>
        <button type="submit" [disabled]="saving()">Add student group</button>
      </form>
    </section>

    @if (loadErrorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (studentGroups().length === 0) {
      <p class="empty">No student groups yet.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          @for (studentGroup of studentGroups(); track studentGroup.id) {
            <tr>
              <td>{{ studentGroup.name }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class StudentGroupsPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({ name: '' });

  protected readonly studentGroups = signal<StudentGroup[]>([]);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.loadStudentGroups();
  }

  protected loadStudentGroups(): void {
    this.api.listStudentGroups().subscribe({
      next: (studentGroups) => {
        this.studentGroups.set(studentGroups);
        this.loadErrorMessage.set(null);
      },
      error: (error: unknown) => this.loadErrorMessage.set(readErrorMessage(error)),
    });
  }

  // The backend checks the name, so the form sends what was entered and shows its answer.
  protected createStudentGroup(): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveErrorMessage.set(null);

    this.api.createStudentGroup(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.loadStudentGroups();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveErrorMessage.set(readErrorMessage(error));
      },
    });
  }
}
