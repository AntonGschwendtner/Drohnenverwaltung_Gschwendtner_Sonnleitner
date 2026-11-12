import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Drone, Loan, readErrorMessage, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-loans-page',
  imports: [DatePipe, EmptyState, PageHead, ReactiveFormsModule, StripSkeleton],
  template: `
    <app-page-head
      bay="03"
      [kicker]="i18n.t('loans.kicker')"
      [title]="i18n.t('nav.loans')"
      [lede]="i18n.t('loans.lede')"
    />

    <section class="panel" aria-labelledby="new-loan">
      <h2 id="new-loan">{{ i18n.t('loans.new') }}</h2>

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
          {{ i18n.t('field.drone') }}
          <select formControlName="droneId" name="droneId">
            <option [ngValue]="null">{{ i18n.t('loans.chooseDrone') }}</option>
            @for (drone of drones(); track drone.id) {
              <option [ngValue]="drone.id">
                {{ drone.name }} ({{ i18n.t(drone.status === 'Loaned' ? 'status.loaned' : 'status.available') }})
              </option>
            }
          </select>
        </label>
        <label>
          {{ i18n.t('field.studentGroup') }}
          <select formControlName="studentGroupId" name="studentGroupId">
            <option [ngValue]="null">{{ i18n.t('loans.chooseGroup') }}</option>
            @for (studentGroup of studentGroups(); track studentGroup.id) {
              <option [ngValue]="studentGroup.id">{{ studentGroup.name }}</option>
            }
          </select>
        </label>
        <label>
          {{ i18n.t('field.batteries') }}
          <input type="number" formControlName="batteries" name="batteries" />
        </label>
        <label>
          {{ i18n.t('field.propellers') }}
          <input type="number" formControlName="propellers" name="propellers" />
        </label>
        <button type="submit" [disabled]="saving()" [class.busy]="saving()">{{ i18n.t('loans.submit') }}</button>
      </form>
    </section>

    <section aria-labelledby="active-loans">
      <h2 id="active-loans">{{ i18n.t('loans.active') }}</h2>

      @if (returnErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (loadingActiveLoans()) {
        <app-strip-skeleton [rows]="2" />
      } @else if (activeLoansErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      } @else if (activeLoans().length === 0) {
        <app-empty-state>{{ i18n.t('loans.empty') }}</app-empty-state>
      } @else {
        <table>
          <thead>
            <tr>
              <th>{{ i18n.t('field.studentGroup') }}</th>
              <th>{{ i18n.t('field.drone') }}</th>
              <th>{{ i18n.t('field.batteries') }}</th>
              <th>{{ i18n.t('field.propellers') }}</th>
              <th>{{ i18n.t('field.loanDate') }}</th>
              <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
            </tr>
          </thead>
          <tbody>
            @for (loan of activeLoans(); track loan.id) {
              <tr>
                <td>{{ loan.studentGroupName }}</td>
                <td [attr.data-label]="i18n.t('field.drone')">{{ loan.droneName }}</td>
                <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
                <td>
                  <button
                    type="button"
                    (click)="returnLoan(loan)"
                    [disabled]="returningId() !== null"
                    [class.busy]="returningId() === loan.id"
                  >
                    {{ i18n.t('loans.return') }}<span class="visually-hidden"> {{ loan.droneName }}</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class LoansPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

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
  protected readonly returnErrorMessage = signal<string | null>(null);
  protected readonly returningId = signal<number | null>(null);
  protected readonly loadingActiveLoans = signal(true);

  ngOnInit(): void {
    this.loadChoices();
    this.loadActiveLoans();
  }

  protected loadActiveLoans(): void {
    this.api.listLoans('Active').subscribe({
      next: (loans) => {
        this.activeLoans.set(loans);
        this.activeLoansErrorMessage.set(null);
        this.loadingActiveLoans.set(false);
      },
      error: (error: unknown) => {
        this.activeLoansErrorMessage.set(this.errorMessage(error));
        this.loadingActiveLoans.set(false);
      },
    });
  }

  protected loadChoices(): void {
    this.loadErrorMessage.set(null);
    this.api.listDrones().subscribe({
      next: (drones) => this.drones.set(drones),
      error: (error: unknown) => this.loadErrorMessage.set(this.errorMessage(error)),
    });
    this.api.listStudentGroups().subscribe({
      next: (studentGroups) => this.studentGroups.set(studentGroups),
      error: (error: unknown) => this.loadErrorMessage.set(this.errorMessage(error)),
    });
  }

  // The backend decides whether the loan can still be returned, so the view only shows its answer.
  protected returnLoan(loan: Loan): void {
    if (this.returningId() !== null) {
      return;
    }

    this.returningId.set(loan.id);
    this.returnErrorMessage.set(null);
    this.savedMessage.set(null);

    this.api.returnLoan(loan.id).subscribe({
      next: (returnedLoan) => {
        this.returningId.set(null);
        this.savedMessage.set(this.i18n.t('loans.returned', { drone: returnedLoan.droneName }));
        this.loadActiveLoans();
        this.loadChoices();
      },
      error: (error: unknown) => {
        this.returningId.set(null);
        this.returnErrorMessage.set(this.errorMessage(error));
        this.loadActiveLoans();
      },
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
          this.savedMessage.set(this.i18n.t('loans.saved', { drone: loan.droneName, group: loan.studentGroupName }));
          this.form.reset({ droneId: null, studentGroupId: null, batteries: 0, propellers: 0 });
          this.loadChoices();
          this.loadActiveLoans();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveErrorMessage.set(this.errorMessage(error));
        },
      });
  }

  private errorMessage(error: unknown): string {
    return readErrorMessage(error, this.i18n.t('error.fallback'));
  }
}
