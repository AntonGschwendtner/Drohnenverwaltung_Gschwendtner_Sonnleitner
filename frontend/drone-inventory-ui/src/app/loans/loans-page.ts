import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Drone, Loan, readErrorMessage, ReturnLoanRequest, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { statusKey } from '../shared/status';
import { SortHeader } from '../shared/sort-header';
import { loanSortValue, SortState, sortItems } from '../shared/sort';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-loans-page',
  imports: [ConfirmDialog, DatePipe, EmptyState, PageHead, ReactiveFormsModule, RouterLink, SortHeader, StripSkeleton],
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
                {{ drone.name }} ({{ i18n.t(statusKey(drone.status)) }})
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
        <label>
          {{ i18n.t('field.dueDate') }}
          <input type="date" formControlName="dueDate" name="dueDate" [min]="today" />
        </label>
        <label class="wide">
          {{ i18n.t('field.note') }}
          <input formControlName="note" name="note" maxlength="500" autocomplete="off" [placeholder]="i18n.t('loans.noteHint')" />
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
              <th appSortHeader="group" [label]="i18n.t('field.studentGroup')" [(sort)]="sort"></th>
              <th appSortHeader="drone" [label]="i18n.t('field.drone')" [(sort)]="sort"></th>
              <th appSortHeader="batteries" [label]="i18n.t('field.batteries')" [(sort)]="sort"></th>
              <th appSortHeader="propellers" [label]="i18n.t('field.propellers')" [(sort)]="sort"></th>
              <th appSortHeader="loanDate" [label]="i18n.t('field.loanDate')" [(sort)]="sort"></th>
              <th appSortHeader="duration" [label]="i18n.t('field.duration')" [(sort)]="sort"></th>
              <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
            </tr>
          </thead>
          <tbody>
            @for (loan of sortedActiveLoans(); track loan.id) {
              <tr [class.long-loan]="loan.isLongRunning || loan.isOverdue">
                <td><a [routerLink]="['/student-groups', loan.studentGroupId]">{{ loan.studentGroupName }}</a></td>
                <td [attr.data-label]="i18n.t('field.drone')"><a [routerLink]="['/drones', loan.droneId]">{{ loan.droneName }}</a>@if (loan.note) {<span class="strip-note">{{ loan.note }}</span>}</td>
                <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
                <td class="duration" [attr.data-label]="i18n.t('field.duration')">
                  <span>{{ i18n.t(loan.daysActive === 1 ? 'loans.day' : 'loans.days', { days: '' + (loan.daysActive ?? 0) }) }}</span>
                  @if (loan.isLongRunning) {
                    <span class="long-running">{{ i18n.t('loans.longRunning') }}</span>
                  }
                  @if (loan.isOverdue) {
                    <span class="long-running overdue">{{ i18n.t('loans.overdue') }}</span>
                  }
                  @if (loan.dueDate) {
                    <span class="due">{{ i18n.t('loans.dueOn', { date: (loan.dueDate | date: 'dd.MM.yyyy') ?? '' }) }}</span>
                  }
                </td>
                <td>
                  <button
                    type="button"
                    (click)="askToReturn(loan, $event)"
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

    @if (pendingReturn(); as loan) {
      <app-confirm-dialog
        [heading]="i18n.t('loans.confirmTitle', { drone: loan.droneName })"
        [text]="i18n.t('loans.confirmText', { drone: loan.droneName, group: loan.studentGroupName })"
        [confirmLabel]="i18n.t('loans.return')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmReturn()"
        (cancelled)="cancelReturn()"
      >
        <div class="dialog-fields">
          <label>
            {{ i18n.t('loans.returnedBatteries') }}
            <input type="number" name="returnedBatteries" min="0" [max]="loan.batteries" [value]="returnedBatteries()" (input)="returnedBatteries.set(numberOf($event))" />
          </label>
          <label>
            {{ i18n.t('loans.returnedPropellers') }}
            <input type="number" name="returnedPropellers" min="0" [max]="loan.propellers" [value]="returnedPropellers()" (input)="returnedPropellers.set(numberOf($event))" />
          </label>
          <label class="wide">
            {{ i18n.t('loans.defect') }}
            <textarea name="defect" rows="2" maxlength="500" [placeholder]="i18n.t('loans.defectHint')" [value]="defect()" (input)="defect.set($any($event.target).value)"></textarea>
          </label>
        </div>
      </app-confirm-dialog>
    }
  `,
})
export class LoansPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly statusKey = statusKey;

  protected readonly form = inject(FormBuilder).group({
    droneId: null as number | null,
    studentGroupId: null as number | null,
    batteries: 0 as number | null,
    propellers: 0 as number | null,
    dueDate: '',
    note: '',
  });

  /** Today as yyyy-MM-dd for the date field; the backend checks the date again (REQ-022). */
  protected readonly today = LoansPage.localDate(new Date());

  protected readonly drones = signal<Drone[]>([]);
  protected readonly studentGroups = signal<StudentGroup[]>([]);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly activeLoans = signal<Loan[]>([]);
  /** Sorting by a column header (REQ-020); without a choice the newest loan stays first. */
  protected readonly sort = signal<SortState<string> | null>(null);
  protected readonly sortedActiveLoans = computed(() =>
    sortItems(
      this.activeLoans(),
      this.sort(),
      loanSortValue,
    ),
  );
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

  /** The loan waiting for the answer of the confirmation dialog (REQ-013). */
  protected readonly pendingReturn = signal<Loan | null>(null);
  private returnTrigger: HTMLElement | null = null;

  protected askToReturn(loan: Loan, event: Event): void {
    if (this.returningId() !== null) {
      return;
    }

    this.returnTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    // The dialog suggests the loaned quantities; the user corrects what is missing (REQ-023).
    this.returnedBatteries.set(loan.batteries);
    this.returnedPropellers.set(loan.propellers);
    this.defect.set('');
    this.pendingReturn.set(loan);
  }

  protected confirmReturn(): void {
    const loan = this.pendingReturn();
    this.pendingReturn.set(null);
    this.returnTrigger = null;
    if (loan) {
      this.returnLoan(loan, {
        items: [
          { type: 'Battery', returnedQuantity: this.returnedBatteries() },
          { type: 'Propeller', returnedQuantity: this.returnedPropellers() },
        ],
        defect: this.defect().trim() ? this.defect() : null,
      });
    }
  }

  // Cancelling sends nothing and gives the focus back to the button that opened the dialog.
  protected cancelReturn(): void {
    this.pendingReturn.set(null);
    this.returnTrigger?.focus();
    this.returnTrigger = null;
  }

  // The backend decides whether the loan can still be returned, so the view only shows its answer.
  protected readonly returnedBatteries = signal<number | null>(0);
  protected readonly returnedPropellers = signal<number | null>(0);
  protected readonly defect = signal('');

  protected numberOf(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  private returnLoan(loan: Loan, request: ReturnLoanRequest): void {
    if (this.returningId() !== null) {
      return;
    }

    this.returningId.set(loan.id);
    this.returnErrorMessage.set(null);
    this.savedMessage.set(null);

    this.api.returnLoan(loan.id, request).subscribe({
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
        note: value.note?.trim() ? value.note : null,
        dueDate: value.dueDate || null,
      })
      .subscribe({
        next: (loan) => {
          this.saving.set(false);
          this.savedMessage.set(this.i18n.t('loans.saved', { drone: loan.droneName, group: loan.studentGroupName }));
          this.form.reset({ droneId: null, studentGroupId: null, batteries: 0, propellers: 0, dueDate: '', note: '' });
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

  private static localDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
