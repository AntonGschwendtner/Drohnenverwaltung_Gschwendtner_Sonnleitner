import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiService, Loan, readErrorMessage, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { DefectHistory } from '../shared/defect-history';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { StripSkeleton } from '../shared/strip-skeleton';

/**
 * One student group with what it has right now and everything it returned, the newest return first (REQ-019).
 */
@Component({
  selector: 'app-student-group-detail-page',
  imports: [DatePipe, DefectHistory, EmptyState, PageHead, RouterLink, StripSkeleton],
  template: `
    <a class="back-link" routerLink="/student-groups">{{ i18n.t('groups.back') }}</a>

    @if (loading()) {
      <app-strip-skeleton [rows]="2" />
    } @else if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (studentGroup(); as studentGroup) {
      <app-page-head
        bay="02"
        [kicker]="i18n.t('groups.kicker')"
        [title]="studentGroup.name"
        [lede]="i18n.t('groups.detailLede', { count: '' + activeLoans().length })"
      />

      @if (studentGroup.deletedAt) {
        <div class="trash-notice" role="status">
          <span>{{ i18n.t('groups.inTrash', { date: (studentGroup.deletedAt | date: 'dd.MM.yyyy') ?? '' }) }}</span>
          <button type="button" class="tool-link restore" (click)="restore(studentGroup)" [disabled]="restoring()" [class.busy]="restoring()">
            {{ i18n.t('trash.restore') }}
          </button>
        </div>
      }
      @if (restoreError(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <section aria-labelledby="group-members">
        <h2 id="group-members">{{ i18n.t('details.members') }}</h2>
        @if (studentGroup.members.length === 0) {
          <app-empty-state>{{ i18n.t('members.empty') }}</app-empty-state>
        } @else {
          <ul class="member-list">
            @for (member of studentGroup.members; track member.id) {
              <li [class.leader]="member.isLeader">
                <span class="member-name">{{ member.name }}</span>
                @if (member.isLeader) {
                  <span class="leader-badge">{{ i18n.t('members.leader') }}</span>
                }
              </li>
            }
          </ul>
        }
      </section>

      <section aria-labelledby="group-active-loans">
        <h2 id="group-active-loans">{{ i18n.t('loans.active') }}</h2>
        @if (activeLoans().length === 0) {
          <app-empty-state>{{ i18n.t('groups.noActiveLoans') }}</app-empty-state>
        } @else {
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('field.drone') }}</th>
                <th>{{ i18n.t('field.batteries') }}</th>
                <th>{{ i18n.t('field.propellers') }}</th>
                <th>{{ i18n.t('field.loanDate') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (loan of activeLoans(); track loan.id) {
                <tr>
                  <td>@if (loan.droneId !== null) {<a [routerLink]="['/drones', loan.droneId]">{{ loan.droneName }}</a>} @else {<span class="former-group">{{ loan.droneName }}</span>}</td>
                  <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                  <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                  <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section aria-labelledby="group-history">
        <h2 id="group-history">{{ i18n.t('nav.history') }}</h2>
        @if (returnedLoans().length === 0) {
          <app-empty-state>{{ i18n.t('details.noHistory') }}</app-empty-state>
        } @else {
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('field.drone') }}</th>
                <th>{{ i18n.t('field.batteries') }}</th>
                <th>{{ i18n.t('field.propellers') }}</th>
                <th>{{ i18n.t('field.loanDate') }}</th>
                <th>{{ i18n.t('field.returnDate') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (loan of returnedLoans(); track loan.id) {
                <tr>
                  <td>@if (loan.droneId !== null) {<a [routerLink]="['/drones', loan.droneId]">{{ loan.droneName }}</a>} @else {<span class="former-group">{{ loan.droneName }}</span>}</td>
                  <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                  <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                  <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
                  <td [attr.data-label]="i18n.t('field.returnDate')">{{ loan.returnDate | date: 'dd.MM.yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <app-defect-history for="studentGroup" [id]="studentGroup.id" />
    }
  `,
})
export class StudentGroupDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  protected readonly studentGroup = signal<StudentGroup | null>(null);
  protected readonly restoring = signal(false);
  protected readonly restoreError = signal<string | null>(null);

  /** A group in the trash comes back from its own page, for example when it was opened from the history (REQ-033). */
  protected restore(studentGroup: StudentGroup): void {
    if (this.restoring()) {
      return;
    }

    this.restoring.set(true);
    this.restoreError.set(null);
    this.api.restoreStudentGroup(studentGroup.id).subscribe({
      next: (restored) => {
        this.restoring.set(false);
        this.studentGroup.set(restored);
      },
      error: (error: unknown) => {
        this.restoring.set(false);
        this.restoreError.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
  protected readonly loans = signal<Loan[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // The backend sends the active loans first and then the newest return first.
  protected readonly activeLoans = computed(() => this.loans().filter((loan) => loan.status === 'Active'));
  protected readonly returnedLoans = computed(() => this.loans().filter((loan) => loan.status === 'Returned'));

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // switchMap drops the answer for an older id, so a fast change of the address never shows the wrong record.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((id) =>
          forkJoin({ record: this.api.getStudentGroup(id), loans: this.api.listLoansFor({ studentGroupId: id }) }).pipe(
            map((result) => ({ ...result, error: null as unknown })),
            catchError((error: unknown) => of({ record: null, loans: [] as Loan[], error })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ record, loans, error }) => {
        this.studentGroup.set(record);
        this.loans.set(loans);
        this.errorMessage.set(error === null ? null : readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      });
  }
}
