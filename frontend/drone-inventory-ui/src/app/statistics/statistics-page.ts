import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiService, readErrorMessage, Statistics, Usage } from '../api.service';
import { I18nService } from '../i18n.service';
import { PageHead } from '../shared/page-head';
import { StripSkeleton } from '../shared/strip-skeleton';

type Period = 'schoolYear' | 'last30Days' | 'allTime';

/**
 * How the drones are used (REQ-030): totals and bars per drone and per student group for this school year, the last
 * 30 days or all time. The backend computes every figure; the bars only show them, with the numbers as text.
 */
@Component({
  selector: 'app-statistics-page',
  imports: [DatePipe, DecimalPipe, PageHead, StripSkeleton],
  template: `
    <app-page-head bay="06" [kicker]="i18n.t('statistics.kicker')" [title]="i18n.t('nav.statistics')" [lede]="i18n.t('statistics.lede')" />

    <div class="segmented period-switch" role="group" [attr.aria-label]="i18n.t('statistics.period')">
      @for (option of periods; track option) {
        <button type="button" [class.on]="period() === option" [attr.aria-pressed]="period() === option" (click)="choose(option)">
          {{ i18n.t(periodLabels[option]) }}
        </button>
      }
    </div>

    @if (loading()) {
      <app-strip-skeleton [rows]="3" />
    } @else if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (statistics(); as stats) {
      <p class="statistics-range">{{ stats.from | date: 'dd.MM.yyyy' }} – {{ stats.to | date: 'dd.MM.yyyy' }}</p>
      <section class="overview" [attr.aria-label]="i18n.t('statistics.totals')">
        <dl>
          <div class="overview-tile">
            <dt>{{ i18n.t('statistics.loans') }}</dt>
            <dd>{{ stats.loanCount }}</dd>
          </div>
          <div class="overview-tile overview-loaned">
            <dt>{{ i18n.t('statistics.active') }}</dt>
            <dd>{{ stats.activeCount }}</dd>
          </div>
          <div class="overview-tile overview-available">
            <dt>{{ i18n.t('statistics.average') }}</dt>
            <dd>{{ stats.averageDays === null ? i18n.t('statistics.notAvailable') : (stats.averageDays | number: '1.1-1') }}</dd>
          </div>
        </dl>
      </section>

      <section class="usage" aria-labelledby="usage-drones">
        <h2 id="usage-drones">{{ i18n.t('statistics.perDrone') }}</h2>
        <ul class="usage-list">
          @for (row of stats.drones; track row.id) {
            <li class="usage-row">
              <span class="usage-name">{{ row.name }}</span>
              <span class="usage-bar" aria-hidden="true"><span [style.width.%]="share(row, maxDroneLoans())"></span></span>
              <span class="usage-numbers">{{ i18n.t('statistics.figures', { loans: '' + row.loanCount, days: '' + row.loanDays }) }}</span>
            </li>
          }
        </ul>
      </section>

      <section class="usage" aria-labelledby="usage-groups">
        <h2 id="usage-groups">{{ i18n.t('statistics.perGroup') }}</h2>
        <ul class="usage-list">
          @for (row of stats.studentGroups; track row.id) {
            <li class="usage-row">
              <span class="usage-name">{{ row.name }}</span>
              <span class="usage-bar" aria-hidden="true"><span [style.width.%]="share(row, maxGroupLoans())"></span></span>
              <span class="usage-numbers">{{ i18n.t('statistics.figures', { loans: '' + row.loanCount, days: '' + row.loanDays }) }}</span>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class StatisticsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly periods: Period[] = ['schoolYear', 'last30Days', 'allTime'];
  protected readonly periodLabels = {
    schoolYear: 'statistics.schoolYear',
    last30Days: 'statistics.last30Days',
    allTime: 'statistics.allTime',
  } as const;
  protected readonly period = signal<Period>('schoolYear');
  protected readonly statistics = signal<Statistics | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly maxDroneLoans = computed(() => Math.max(0, ...(this.statistics()?.drones ?? []).map((row) => row.loanCount)));
  protected readonly maxGroupLoans = computed(() => Math.max(0, ...(this.statistics()?.studentGroups ?? []).map((row) => row.loanCount)));

  ngOnInit(): void {
    this.load();
  }

  protected choose(period: Period): void {
    this.period.set(period);
    this.load();
  }

  protected share(row: Usage, max: number): number {
    return max === 0 ? 0 : Math.round((row.loanCount / max) * 100);
  }

  /** This school year is the default of the backend; the other periods are sent as dates. */
  private load(): void {
    const today = new Date();
    const range =
      this.period() === 'last30Days'
        ? { from: StatisticsPage.localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: StatisticsPage.localDate(today) }
        : this.period() === 'allTime'
          ? { from: '2000-01-01', to: StatisticsPage.localDate(today) }
          : {};

    this.loading.set(true);
    this.errorMessage.set(null);
    this.api.getStatistics(range).subscribe({
      next: (statistics) => {
        this.statistics.set(statistics);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  private static localDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
