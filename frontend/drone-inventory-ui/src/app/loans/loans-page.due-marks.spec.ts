import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { LoansPage } from './loans-page';

/** Scenarios of "Due today and days overdue" in the list of active loans (REQ-035). */
describe('LoansPage due marks', () => {
  let fixture: ComponentFixture<LoansPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const base: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 0,
    propellers: 0,
    loanDate: '2026-08-19',
    returnDate: null,
    status: 'Active',
    daysActive: 7,
  };

  async function open(loans: Loan[], language = 'en'): Promise<void> {
    localStorage.setItem('drone-inventory-language', language);
    TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
    http.expectOne('/api/loans?status=Active').flush(loans);
    await fixture.whenStable();
    fixture.detectChanges();
    localStorage.removeItem('drone-inventory-language');
  }

  afterEach(() => http.verify());

  function row(): HTMLElement {
    return element.querySelector('tbody tr') as HTMLElement;
  }

  it('Due today', async () => {
    await open([{ ...base, dueDate: '2026-08-26', isDueToday: true, isOverdue: false, daysOverdue: null }]);

    expect(row().classList.contains('due-today')).toBe(true);
    expect(row().classList.contains('overdue-loan')).toBe(false);
    expect(row().querySelector('.due-today-badge')?.textContent?.trim()).toBe('Due today');
  });

  it('Overdue for days', async () => {
    await open([{ ...base, dueDate: '2026-08-26', isOverdue: true, daysOverdue: 3 }]);

    expect(row().classList.contains('overdue-loan')).toBe(true);
    expect(row().querySelector('.overdue')?.textContent?.trim()).toBe('Overdue for 3 days');
    expect(row().querySelector('.due-today-badge')).toBeNull();
  });

  it('Overdue for one day', async () => {
    await open([{ ...base, dueDate: '2026-08-26', isOverdue: true, daysOverdue: 1 }]);

    expect(row().querySelector('.overdue')?.textContent?.trim()).toBe('Overdue for 1 day');
  });

  it('Not due yet', async () => {
    await open([{ ...base, dueDate: '2026-08-26', isOverdue: false, isDueToday: false, daysOverdue: null }]);

    expect(row().classList.contains('due-today')).toBe(false);
    expect(row().classList.contains('overdue-loan')).toBe(false);
    expect(row().querySelector('.overdue, .due-today-badge')).toBeNull();
  });

  it('shows the marks in German', async () => {
    await open(
      [
        { ...base, id: 1, dueDate: '2026-08-26', isOverdue: true, daysOverdue: 3 },
        { ...base, id: 2, droneId: 8, droneName: 'TELLO-08', dueDate: '2026-08-29', isDueToday: true },
      ],
      'de',
    );

    expect(element.querySelector('.overdue')?.textContent?.trim()).toBe('Seit 3 Tagen überfällig');
    expect(element.querySelector('.due-today-badge')?.textContent?.trim()).toBe('Heute fällig');
  });
});
