import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, Loan, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe],
  template: `
    <p class="kicker">{{ i18n.t('history.kicker') }}</p>
    <h1>{{ i18n.t('nav.history') }}</h1>
    <p class="lede">{{ i18n.t('history.lede') }}</p>

    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (loans().length === 0) {
      <p class="empty">{{ i18n.t('history.empty') }}</p>
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
          @for (loan of loans(); track loan.id) {
            <tr>
              <td>{{ loan.studentGroupName }}</td>
              <td>{{ loan.droneName }}</td>
              <td>{{ loan.batteries }}</td>
              <td>{{ loan.propellers }}</td>
              <td>{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
              <td>{{ loan.returnDate | date: 'dd.MM.yyyy' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class HistoryPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly loans = signal<Loan[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listLoans('Returned').subscribe({
      next: (loans) => this.loans.set(loans),
      error: (error: unknown) => this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback'))),
    });
  }
}
