import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, Drone, Loan, readErrorMessage, Reservation } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { StripSkeleton } from '../shared/strip-skeleton';

/**
 * The start page (REQ-036): what needs attention today. Overdue loans come first, the most overdue on top, then the
 * loans due today and the long-running loans. Every loan links to the loan page, where it is returned.
 */
@Component({
  selector: 'app-today-page',
  imports: [DatePipe, EmptyState, PageHead, RouterLink, StripSkeleton],
  template: `
    <app-page-head bay="00" [kicker]="i18n.t('today.kicker')" [title]="i18n.t('nav.today')" [lede]="i18n.t('today.lede')" />

    @if (loading()) {
      <app-strip-skeleton [rows]="3" />
    } @else if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else {
      <section class="overview" [attr.aria-label]="i18n.t('today.numbers')">
        <dl>
          <div class="overview-tile">
            <dt>{{ i18n.t('today.activeLoans') }}</dt>
            <dd>{{ activeLoans().length }}</dd>
          </div>
          <div class="overview-tile overview-due-today">
            <dt>{{ i18n.t('loans.dueToday') }}</dt>
            <dd>{{ dueToday().length }}</dd>
          </div>
          <div class="overview-tile overview-defective">
            <dt>{{ i18n.t('loans.overdue') }}</dt>
            <dd>{{ overdue().length }}</dd>
          </div>
          <div class="overview-tile overview-available">
            <dt>{{ i18n.t('today.availableDrones') }}</dt>
            <dd>{{ availableDrones() }}</dd>
          </div>
        </dl>
      </section>

      @if (overdue().length === 0 && dueToday().length === 0 && longRunning().length === 0 && reservedToday().length === 0) {
        <app-empty-state>{{ i18n.t('today.nothing') }}</app-empty-state>
      }

      @if (overdue().length > 0) {
        <section class="today-list" aria-labelledby="today-overdue">
          <h2 id="today-overdue">{{ i18n.t('loans.overdue') }}</h2>
          <ul>
            @for (loan of overdue(); track loan.id) {
              <li class="today-item overdue-item" [attr.data-loan]="loan.id">
                <span class="today-what">{{ loan.droneName }} · {{ loan.studentGroupName }}</span>
                <span class="long-running overdue">
                  {{ loan.daysOverdue === 1 ? i18n.t('loans.overdueDay') : i18n.t('loans.overdueDays', { days: '' + (loan.daysOverdue ?? 0) }) }}
                </span>
                <span class="today-when">{{ i18n.t('loans.dueOn', { date: (loan.dueDate | date: 'dd.MM.yyyy') ?? '' }) }}</span>
                <a class="tool-link today-go" routerLink="/loans">{{ i18n.t('today.toLoans') }}</a>
              </li>
            }
          </ul>
        </section>
      }

      @if (dueToday().length > 0) {
        <section class="today-list" aria-labelledby="today-due">
          <h2 id="today-due">{{ i18n.t('loans.dueToday') }}</h2>
          <ul>
            @for (loan of dueToday(); track loan.id) {
              <li class="today-item due-today-item" [attr.data-loan]="loan.id">
                <span class="today-what">{{ loan.droneName }} · {{ loan.studentGroupName }}</span>
                <span class="long-running due-today-badge">{{ i18n.t('loans.dueToday') }}</span>
                <a class="tool-link today-go" routerLink="/loans">{{ i18n.t('today.toLoans') }}</a>
              </li>
            }
          </ul>
        </section>
      }

      @if (reservedToday().length > 0) {
        <section class="today-list" aria-labelledby="today-reserved">
          <h2 id="today-reserved">{{ i18n.t('today.reserved') }}</h2>
          <ul>
            @for (reservation of reservedToday(); track reservation.id) {
              <li class="today-item due-today-item" [attr.data-reservation]="reservation.id">
                <span class="today-what">{{ reservation.droneName }} · {{ reservation.studentGroupName }}</span>
                <a class="tool-link today-go" routerLink="/loans" [queryParams]="{ drone: reservation.droneId }">{{ i18n.t('today.toLoans') }}</a>
              </li>
            }
          </ul>
        </section>
      }

      @if (longRunning().length > 0) {
        <section class="today-list" aria-labelledby="today-long">
          <h2 id="today-long">{{ i18n.t('loans.longRunning') }}</h2>
          <ul>
            @for (loan of longRunning(); track loan.id) {
              <li class="today-item" [attr.data-loan]="loan.id">
                <span class="today-what">{{ loan.droneName }} · {{ loan.studentGroupName }}</span>
                <span class="today-when">{{ i18n.t('loans.days', { days: '' + (loan.daysActive ?? 0) }) }}</span>
                <a class="tool-link today-go" routerLink="/loans">{{ i18n.t('today.toLoans') }}</a>
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class TodayPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeLoans = signal<Loan[]>([]);
  private readonly drones = signal<Drone[]>([]);
  /** Today's reservations (REQ-028); the backend marks them. */
  protected readonly reservedToday = signal<Reservation[]>([]);

  /** The most overdue loan first; the backend counts the days (REQ-035). */
  protected readonly overdue = computed(() =>
    this.activeLoans()
      .filter((loan) => loan.isOverdue)
      .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0)),
  );
  protected readonly dueToday = computed(() => this.activeLoans().filter((loan) => loan.isDueToday));
  protected readonly longRunning = computed(() =>
    this.activeLoans()
      .filter((loan) => loan.isLongRunning)
      .sort((a, b) => (b.daysActive ?? 0) - (a.daysActive ?? 0)),
  );
  protected readonly availableDrones = computed(() => this.drones().filter((drone) => drone.status === 'Available').length);

  ngOnInit(): void {
    forkJoin({ loans: this.api.listLoans('Active'), drones: this.api.listDrones(), reservations: this.api.listReservations() }).subscribe({
      next: ({ loans, drones, reservations }) => {
        this.activeLoans.set(loans);
        this.drones.set(drones);
        this.reservedToday.set(reservations.filter((reservation) => reservation.isToday));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }
}
