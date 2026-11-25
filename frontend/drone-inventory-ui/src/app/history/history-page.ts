import { DatePipe, DOCUMENT } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Loan, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { SortHeader } from '../shared/sort-header';
import { loanSortValue, SortState, sortItems } from '../shared/sort';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, EmptyState, PageHead, RouterLink, SearchField, SortHeader, StripSkeleton],
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
        <a class="tool-link export-link" [href]="exportUrl()" download>{{ i18n.t('history.export') }}</a>
        <button type="button" class="tool-link print-button" (click)="print()">{{ i18n.t('history.print') }}</button>
      </div>

      <p class="print-only print-date">{{ i18n.t('history.printedOn', { date: (today | date: 'dd.MM.yyyy') ?? '' }) }}</p>

      @if (visibleLoans().length === 0) {
        <app-empty-state>{{ i18n.t('history.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th appSortHeader="group" [label]="i18n.t('field.studentGroup')" [(sort)]="sort"></th>
            <th appSortHeader="drone" [label]="i18n.t('field.drone')" [(sort)]="sort"></th>
            <th appSortHeader="batteries" [label]="i18n.t('field.batteries')" [(sort)]="sort"></th>
            <th appSortHeader="propellers" [label]="i18n.t('field.propellers')" [(sort)]="sort"></th>
            <th appSortHeader="loanDate" [label]="i18n.t('field.loanDate')" [(sort)]="sort"></th>
            <th appSortHeader="returnDate" [label]="i18n.t('field.returnDate')" [(sort)]="sort"></th>
          </tr>
        </thead>
        <tbody>
          @for (loan of visibleLoans(); track loan.id) {
            <tr>
              <td>
                  @if (loan.studentGroupId !== null) {
                    <a [routerLink]="['/student-groups', loan.studentGroupId]">{{ loan.studentGroupName }}</a>
                  } @else {
                    <span class="former-group">{{ loan.studentGroupName }}</span>
                  }
                </td>
              <td [attr.data-label]="i18n.t('field.drone')">@if (loan.droneId !== null) {<a [routerLink]="['/drones', loan.droneId]">{{ loan.droneName }}</a>} @else {<span class="former-group">{{ loan.droneName }}</span>}@if (loan.note) {<span class="strip-note">{{ loan.note }}</span>}</td>
              <td [attr.data-label]="i18n.t('field.batteries')">
                {{ loan.batteries }}
                @if (loan.missingBatteries) {
                  <span class="missing">{{ i18n.t('history.missing', { count: '' + loan.missingBatteries }) }}</span>
                }
              </td>
              <td [attr.data-label]="i18n.t('field.propellers')">
                {{ loan.propellers }}
                @if (loan.missingPropellers) {
                  <span class="missing">{{ i18n.t('history.missing', { count: '' + loan.missingPropellers }) }}</span>
                }
              </td>
              <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
              <td [attr.data-label]="i18n.t('field.returnDate')">
                {{ loan.returnDate | date: 'dd.MM.yyyy' }}
                @if (loan.dueDate) {
                  <span class="due">{{ i18n.t('history.planned', { date: (loan.dueDate | date: 'dd.MM.yyyy') ?? '' }) }}</span>
                }
              </td>
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
  private readonly document = inject(DOCUMENT);
  protected readonly i18n = inject(I18nService);

  protected readonly loans = signal<Loan[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loading = signal(true);

  /**
   * The CSV export of the backend (REQ-025). A plain link sends no Accept-Language from the app, so the
   * chosen language goes into the address and the header row of the file follows it.
   */
  protected readonly exportUrl = computed(() => {
    const language = this.i18n.language();
    return `/api/loans/export?culture=${language}&ui-culture=${language}`;
  });

  /** The print date on the paper (REQ-025). */
  protected readonly today = new Date();

  /** The browser prints the page or saves it as PDF; the print stylesheet keeps only title, date and table. */
  protected print(): void {
    this.document.defaultView?.print();
  }

  /** The search matches the drone or the student group of a loan (REQ-011). */
  protected readonly search = signal('');
  /** Sorting by a column header (REQ-020); without a choice the newest return stays first. */
  protected readonly sort = signal<SortState<string> | null>(null);
  protected readonly visibleLoans = computed(() =>
    sortItems(
      this.loans().filter(
        (loan) => matchesSearch(loan.droneName, this.search()) || matchesSearch(loan.studentGroupName, this.search()),
      ),
      this.sort(),
      loanSortValue,
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
