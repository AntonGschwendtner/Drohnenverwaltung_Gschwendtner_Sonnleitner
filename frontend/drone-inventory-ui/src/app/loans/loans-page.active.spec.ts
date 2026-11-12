import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Loan } from '../api.service';
import { LoansPage } from './loans-page';

describe('LoansPage active loans', () => {
  let fixture: ComponentFixture<LoansPage>;
  let http: HttpTestingController;

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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
  });

  afterEach(() => http.verify());

  async function respondWithActiveLoans(loans: Loan[]): Promise<void> {
    http.expectOne('/api/loans?status=Active').flush(loans);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rows(): string[][] {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(element.querySelectorAll('section[aria-labelledby="active-loans"] tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .slice(0, 5)
        .map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  it('shows group, drone, batteries, propellers and the loan date as dd.MM.yyyy', async () => {
    await respondWithActiveLoans([loan]);

    expect(rows()).toEqual([['Group 3', 'TELLO-07', '4', '8', '19.08.2026']]);
  });

  it('shows each active loan in its own row', async () => {
    await respondWithActiveLoans([
      loan,
      { ...loan, id: 2, droneName: 'TELLO-08', batteries: 0, propellers: 0, loanDate: '2026-12-01' },
    ]);

    expect(rows()).toEqual([
      ['Group 3', 'TELLO-07', '4', '8', '19.08.2026'],
      ['Group 3', 'TELLO-08', '0', '0', '01.12.2026'],
    ]);
  });

  function durationCell(): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    return element.querySelector('section[aria-labelledby="active-loans"] tbody td.duration') as HTMLElement;
  }

  it('shows how many days a loan has been running, without a mark below 8 days (REQ-012)', async () => {
    await respondWithActiveLoans([{ ...loan, daysActive: 7, isLongRunning: false }]);

    expect(durationCell().textContent?.trim()).toBe('7 days');
    expect(durationCell().querySelector('.long-running')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody tr.long-loan')).toBeNull();
  });

  it('marks a long-running loan (REQ-012)', async () => {
    await respondWithActiveLoans([{ ...loan, daysActive: 9, isLongRunning: true }]);

    expect(durationCell().textContent).toContain('9 days');
    expect(durationCell().querySelector('.long-running')?.textContent?.trim()).toBe('Long loan');
    expect(fixture.nativeElement.querySelector('tbody tr.long-loan')).not.toBeNull();
  });

  it('says "1 day" for a loan from yesterday', async () => {
    await respondWithActiveLoans([{ ...loan, daysActive: 1, isLongRunning: false }]);

    expect(durationCell().textContent?.trim()).toBe('1 day');
  });

  it('says when there are no active loans', async () => {
    await respondWithActiveLoans([]);

    expect(fixture.nativeElement.textContent).toContain('No active loans.');
  });

  it('shows the message when the active loans cannot be loaded', async () => {
    http.expectOne('/api/loans?status=Active').flush(
      { detail: 'The database is not reachable.' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section[aria-labelledby="active-loans"]') as HTMLElement;
    expect(section.querySelector('[role="alert"]')?.textContent).toContain('The database is not reachable.');
    expect(section.textContent).not.toContain('No active loans.');
  });
});
