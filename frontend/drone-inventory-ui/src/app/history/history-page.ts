import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiService, Loan, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, EmptyState, PageHead, SearchField, StripSkeleton],
  template: `
    <app-page-head
      bay="04"
      [kicker]="i18n.t('history.kicker')"
      [title]="i18n.t('nav.history')"
      [lede]="i18n.t('history.lede')"
    />

    @if (loading()) {
      <app-strip-skeleton />
    } @else if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (loans().length === 0) {
      <app-empty-state>{{ i18n.t('history.empty') }}</app-empty-state>
    } @else {
      <div class="list-tools">
        <app-search-field [label]="i18n.t('search.label')" [placeholder]="i18n.t('history.searchHint')" [(value)]="search" />
      </div>

      @if (visibleLoans().length === 0) {
        <app-empty-state>{{ i18n.t('history.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.studentGroup') }}</th>
            <th>{{ i18n.t('field.drone') }}</th>
            <th>{{ i18n.t('field.batteries') }}</th>
            <th>{{ i18n.t('field.propellers') }}</th>
            <th>{{ i18n.t('field.loanDate') }}</th>
            <th>{{ i18n.t('field.returnDate') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (loan of visibleLoans(); track loan.id) {
            <tr>
              <td>{{ loan.studentGroupName }}</td>
              <td [attr.data-label]="i18n.t('field.drone')">{{ loan.droneName }}</td>
              <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
              <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
              <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
              <td [attr.data-label]="i18n.t('field.returnDate')">{{ loan.returnDate | date: 'dd.MM.yyyy' }}</td>
            </tr>
          }
        </tbody>
      </table>
      }
    }
  `,
})
export class HistoryPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly loans = signal<Loan[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loading = signal(true);

  /** The search matches the drone or the student group of a loan (REQ-011). */
  protected readonly search = signal('');
  protected readonly visibleLoans = computed(() =>
    this.loans().filter(
      (loan) => matchesSearch(loan.droneName, this.search()) || matchesSearch(loan.studentGroupName, this.search()),
    ),
  );

  ngOnInit(): void {
    this.api.listLoans('Returned').subscribe({
      next: (loans) => {
        this.loans.set(loans);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }
}
