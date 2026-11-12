import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Loan } from '../api.service';
import { HistoryPage } from './history-page';

describe('HistoryPage', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let http: HttpTestingController;

  const returnedLoan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: '2026-08-21',
    status: 'Returned',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function respondWith(loans: Loan[]): Promise<void> {
    http.expectOne('/api/loans?status=Returned').flush(loans);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rows(): string[][] {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  it('shows the accessories, the loan date and the return date', async () => {
    await respondWith([returnedLoan]);

    expect(rows()).toEqual([['Group 3', 'TELLO-07', '4', '8', '19.08.2026', '21.08.2026']]);
  });

  it('keeps the order the backend sends, newest return first', async () => {
    await respondWith([
      { ...returnedLoan, id: 2, droneName: 'TELLO-08', returnDate: '2026-08-30' },
      returnedLoan,
    ]);

    expect(rows().map((row) => row[1])).toEqual(['TELLO-08', 'TELLO-07']);
  });

  it('says when there are no returned loans', async () => {
    await respondWith([]);

    expect(fixture.nativeElement.textContent).toContain('No returned loans yet.');
  });

  it('shows the message when the history cannot be loaded', async () => {
    http.expectOne('/api/loans?status=Returned').flush(
      { detail: 'The database is not reachable.' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'The database is not reachable.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No returned loans yet.');
  });
});
