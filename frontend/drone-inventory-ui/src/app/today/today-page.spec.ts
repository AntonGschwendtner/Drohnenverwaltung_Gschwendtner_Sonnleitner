import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Drone, Loan, Reservation } from '../api.service';
import { routes } from '../app.routes';
import { TodayPage } from './today-page';

/** Scenarios of the requirement "Today page" (REQ-036). */
describe('TodayPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const base: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 0,
    propellers: 0,
    loanDate: '2026-08-10',
    returnDate: null,
    status: 'Active',
    daysActive: 9,
  };
  const drones: Drone[] = [
    { id: 7, name: 'TELLO-07', status: 'Loaned', description: '' },
    { id: 10, name: 'TELLO-10', status: 'Available', description: '' },
    { id: 11, name: 'TELLO-11', status: 'Available', description: '' },
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(loans: Loan[], reservations: Reservation[] = []): Promise<HTMLElement> {
    await harness.navigateByUrl('/today', TodayPage);
    http.expectOne('/api/loans?status=Active').flush(loans);
    http.expectOne('/api/drones').flush(drones);
    http.expectOne('/api/reservations').flush(reservations);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function tile(element: HTMLElement, label: string): string {
    const tiles = Array.from(element.querySelectorAll('.overview-tile'));
    const match = tiles.find((candidate) => candidate.querySelector('dt')?.textContent?.trim() === label);
    return match?.querySelector('dd')?.textContent?.trim() ?? '';
  }

  function names(element: HTMLElement, section: string): string[] {
    return Array.from(element.querySelectorAll(`section[aria-labelledby="${section}"] .today-what`)).map(
      (item) => item.textContent?.trim() ?? '',
    );
  }

  it('Something is due or late', async () => {
    const element = await open([
      { ...base, id: 1, droneName: 'TELLO-08', dueDate: '2026-08-18', isOverdue: true, daysOverdue: 1 },
      { ...base, id: 2, droneName: 'TELLO-07', dueDate: '2026-08-16', isOverdue: true, daysOverdue: 3 },
      { ...base, id: 3, droneName: 'TELLO-09', dueDate: '2026-08-19', isDueToday: true },
      { ...base, id: 4, droneName: 'TELLO-12' },
    ]);

    expect(tile(element, 'Active loans')).toBe('4');
    expect(tile(element, 'Overdue')).toBe('2');
    expect(tile(element, 'Due today')).toBe('1');
    expect(tile(element, 'Available drones')).toBe('2');
    expect(names(element, 'today-overdue')).toEqual(['TELLO-07 · Group 3', 'TELLO-08 · Group 3']);
    expect(element.querySelector('section[aria-labelledby="today-overdue"] .overdue')?.textContent?.trim()).toBe(
      'Overdue for 3 days',
    );
    expect(names(element, 'today-due')).toEqual(['TELLO-09 · Group 3']);
    expect(element.querySelector('app-empty-state')).toBeNull();
  });

  it('lists long-running loans', async () => {
    const element = await open([{ ...base, isLongRunning: true, daysActive: 12 }]);

    expect(names(element, 'today-long')).toEqual(['TELLO-07 · Group 3']);
    expect(element.querySelector('section[aria-labelledby="today-long"] .today-when')?.textContent?.trim()).toBe('12 days');
  });

  it('Reserved today', async () => {
    const element = await open(
      [],
      [
        { id: 5, droneId: 7, droneName: 'TELLO-07', studentGroupId: 3, studentGroupName: 'Group 3', date: '2026-08-19', isToday: true, droneIsLoaned: false },
        { id: 6, droneId: 8, droneName: 'TELLO-08', studentGroupId: 3, studentGroupName: 'Group 3', date: '2026-08-21', isToday: false, droneIsLoaned: false },
      ],
    );

    expect(names(element, 'today-reserved')).toEqual(['TELLO-07 · Group 3']);
    expect(element.querySelector('app-empty-state')).toBeNull();
  });

  it('Nothing is due', async () => {
    const element = await open([{ ...base }]);

    expect(element.querySelector('app-empty-state')?.textContent).toContain('Nothing needs attention today');
    expect(element.querySelector('.today-list')).toBeNull();
  });

  it('Go to the loan', async () => {
    const element = await open([{ ...base, dueDate: '2026-08-16', isOverdue: true, daysOverdue: 3 }]);

    (element.querySelector('section[aria-labelledby="today-overdue"] a.today-go') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/loans');
    http.match(() => true).forEach((request) => request.flush([]));
  });

  it('shows the message when the loans cannot be loaded', async () => {
    await harness.navigateByUrl('/today', TodayPage);
    const drones = http.expectOne('/api/drones');
    const reservations = http.expectOne('/api/reservations');
    http.expectOne('/api/loans?status=Active').flush({ detail: 'Down.' }, { status: 500, statusText: 'Error' });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect((harness.routeNativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Down.');
    expect(drones.cancelled).toBe(true);
    expect(reservations.cancelled).toBe(true);
  });
});
