import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, Loan, readErrorMessage, StudentGroup } from '../api.service';

@Component({
  selector: 'app-loans-page',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1>Loans</h1>

    <section class="panel" aria-labelledby="new-loan">
      <h2 id="new-loan">New loan</h2>

      @if (loadErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (savedMessage(); as message) {
        <p class="saved" role="status">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createLoan()">
        <label>
          Drone
          <select formControlName="droneId" name="droneId">
            <option [ngValue]="null">Choose a drone</option>
            @for (drone of drones(); track drone.id) {
              <option [ngValue]="drone.id">{{ drone.name }} ({{ drone.status }})</option>
            }
          </select>
        </label>
        <label>
          Student group
          <select formControlName="studentGroupId" name="studentGroupId">
            <option [ngValue]="null">Choose a student group</option>
            @for (studentGroup of studentGroups(); track studentGroup.id) {
              <option [ngValue]="studentGroup.id">{{ studentGroup.name }}</option>
            }
          </select>
        </label>
        <label>
          Batteries
          <input type="number" formControlName="batteries" name="batteries" />
        </label>
        <label>
          Propellers
          <input type="number" formControlName="propellers" name="propellers" />
        </label>
        <button type="submit" [disabled]="saving()">Loan drone</button>
      </form>
    </section>

    <section aria-labelledby="active-loans">
      <h2 id="active-loans">Active loans</h2>

      @if (activeLoansErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      } @else if (activeLoans().length === 0) {
        <p class="empty">No active loans.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Student group</th>
              <th>Drone</th>
              <th>Batteries</th>
              <th>Propellers</th>
              <th>Loan date</th>
            </tr>
          </thead>
          <tbody>
            @for (loan of activeLoans(); track loan.id) {
              <tr>
                <td>{{ loan.studentGroupName }}</td>
                <td>{{ loan.droneName }}</td>
                <td>{{ loan.batteries }}</td>
                <td>{{ loan.propellers }}</td>
                <td>{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .saved {
      margin: 0 0 1rem;
      color: var(--available);
      font-weight: 600;
    }
  `,
})
export class LoansPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly form = inject(FormBuilder).group({
    droneId: null as number | null,
    studentGroupId: null as number | null,
    batteries: 0 as number | null,
    propellers: 0 as number | null,
  });

  protected readonly drones = signal<Drone[]>([]);
  protected readonly studentGroups = signal<StudentGroup[]>([]);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly activeLoans = signal<Loan[]>([]);
  protected readonly activeLoansErrorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadChoices();
    this.loadActiveLoans();
  }

  protected loadActiveLoans(): void {
    this.api.listLoans('Active').subscribe({
      next: (loans) => {
        this.activeLoans.set(loans);
        this.activeLoansErrorMessage.set(null);
      },
      error: (error: unknown) => this.activeLoansErrorMessage.set(readErrorMessage(error)),
    });
  }

  protected loadChoices(): void {
    this.loadErrorMessage.set(null);
    this.api.listDrones().subscribe({
      next: (drones) => this.drones.set(drones),
      error: (error: unknown) => this.loadErrorMessage.set(readErrorMessage(error)),
    });
    this.api.listStudentGroups().subscribe({
      next: (studentGroups) => this.studentGroups.set(studentGroups),
      error: (error: unknown) => this.loadErrorMessage.set(readErrorMessage(error)),
    });
  }

  // The backend decides whether the loan is allowed, so the form sends what was entered and shows its answer.
  protected createLoan(): void {
    if (this.saving()) {
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveErrorMessage.set(null);
    this.savedMessage.set(null);

    this.api
      .createLoan({
        droneId: value.droneId,
        studentGroupId: value.studentGroupId,
        items: [
          { type: 'Battery', quantity: value.batteries },
          { type: 'Propeller', quantity: value.propellers },
        ],
      })
      .subscribe({
        next: (loan) => {
          this.saving.set(false);
          this.savedMessage.set(`${loan.droneName} is loaned to ${loan.studentGroupName}.`);
          this.form.reset({ droneId: null, studentGroupId: null, batteries: 0, propellers: 0 });
          this.loadChoices();
          this.loadActiveLoans();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveErrorMessage.set(readErrorMessage(error));
        },
      });
  }
}
