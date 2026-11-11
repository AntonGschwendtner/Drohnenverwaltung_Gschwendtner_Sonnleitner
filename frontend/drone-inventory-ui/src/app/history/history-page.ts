import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, Loan, readErrorMessage } from '../api.service';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe],
  template: `
    <p class="kicker">Bay 04 &middot; Logbook</p>
    <h1>Loan history</h1>
    <p class="lede">Every returned loan stays here, the newest return first.</p>

    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (loans().length === 0) {
      <p class="empty">No returned loans yet.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Student group</th>
            <th>Drone</th>
            <th>Batteries</th>
            <th>Propellers</th>
            <th>Loan date</th>
            <th>Return date</th>
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

  protected readonly loans = signal<Loan[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listLoans('Returned').subscribe({
      next: (loans) => this.loans.set(loans),
      error: (error: unknown) => this.errorMessage.set(readErrorMessage(error)),
    });
  }
}
