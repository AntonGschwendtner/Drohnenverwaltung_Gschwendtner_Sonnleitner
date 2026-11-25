import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { HistoryPage } from '../history/history-page';
import { I18nService } from '../i18n.service';
import { LoansPage } from './loans-page';

/** Note, planned return date and the overdue mark in the lists (REQ-021, REQ-022). */
describe('Note and planned return date in the lists', () => {
  const loan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: null,
    status: 'Active',
    daysActive: 8,
    isLongRunning: false,
    note: 'Projekt Vermessung',
    dueDate: '2026-08-26',
    isOverdue: true,
    daysOverdue: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function activeLoans(loans: Loan[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
    http.expectOne('/api/loans?status=Active').flush(loans);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks an overdue loan and shows its note and planned return date', async () => {
    const element = await activeLoans([loan]);
    const row = element.querySelector('section[aria-labelledby="active-loans"] tbody tr') as HTMLElement;

    expect(row.classList.contains('overdue-loan')).toBe(true);
    expect(row.querySelector('.overdue')?.textContent?.trim()).toBe('Overdue for 1 day');
    expect(row.querySelector('.strip-note')?.textContent?.trim()).toBe('Projekt Vermessung');
    expect(row.querySelector('.due')?.textContent?.trim()).toBe('due 26.08.2026');
  });

  it('shows a loan within its planned return date without a mark', async () => {
    const element = await activeLoans([{ ...loan, isOverdue: false, note: null }]);
    const row = element.querySelector('section[aria-labelledby="active-loans"] tbody tr') as HTMLElement;

    expect(row.classList.contains('overdue-loan')).toBe(false);
    expect(row.querySelector('.overdue')).toBeNull();
    expect(row.querySelector('.strip-note')).toBeNull();
    expect(row.querySelector('.due')?.textContent?.trim()).toBe('due 26.08.2026');
  });

  it('says it in German', async () => {
    TestBed.inject(I18nService).language.set('de');
    const element = await activeLoans([loan]);

    expect(element.querySelector('.overdue')?.textContent?.trim()).toBe('Seit 1 Tag überfällig');
    expect(element.querySelector('.due')?.textContent?.trim()).toBe('fällig am 26.08.2026');
  });

  it('keeps note and planned return date in the history', async () => {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/loans?status=Returned')
      .flush([{ ...loan, status: 'Returned', returnDate: '2026-08-28', isOverdue: false, daysActive: null }]);
    await fixture.whenStable();
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr') as HTMLElement;

    expect(row.querySelector('.strip-note')?.textContent?.trim()).toBe('Projekt Vermessung');
    expect(row.querySelector('.due')?.textContent?.trim()).toBe('planned 26.08.2026');
    expect(row.querySelector('.overdue')).toBeNull();
  });
});
