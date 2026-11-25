import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Drone, Reservation } from '../api.service';
import { LoansPage } from '../loans/loans-page';
import { ReservationsPage } from './reservations-page';

/** Reservations on their page and as hints in the loan form (REQ-027 to REQ-029). */
describe('Reservations', () => {
  let http: HttpTestingController;

  const drones: Drone[] = [
    { id: 7, name: 'TELLO-07', status: 'Available', description: '', nextReservationDate: '2026-08-21', nextReservationGroup: 'Group 3' },
    { id: 8, name: 'TELLO-08', status: 'Loaned', description: '' },
    { id: 9, name: 'TELLO-09', status: 'Defective', description: '', defectNote: 'Motor' },
  ];
  const groups = [{ id: 3, name: 'Group 3', members: [], leaderName: null }];
  const reservation: Reservation = {
    id: 5,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    date: '2026-08-21',
    isToday: false,
    droneIsLoaned: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function openPage(reservations: Reservation[]): Promise<{ fixture: ComponentFixture<ReservationsPage>; element: HTMLElement }> {
    const fixture = TestBed.createComponent(ReservationsPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush(drones);
    http.expectOne('/api/student-groups').flush(groups);
    http.expectOne('/api/reservations').flush(reservations);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function choose(element: HTMLElement, name: string, index: number): void {
    const select = element.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change'));
  }

  it('offers only drones that are not defective', async () => {
    const { element } = await openPage([]);

    const options = Array.from(element.querySelectorAll('select[name="droneId"] option')).map((option) => option.textContent?.trim());
    expect(options).toEqual(['Choose a drone', 'TELLO-07', 'TELLO-08']);
    expect(element.textContent).toContain('No reservations from today on.');
  });

  it('reserves a drone and lists it (scenario "Reserve a drone")', async () => {
    const { fixture, element } = await openPage([]);
    choose(element, 'droneId', 1);
    choose(element, 'studentGroupId', 1);
    const date = element.querySelector('input[name="date"]') as HTMLInputElement;
    date.value = '2026-08-21';
    date.dispatchEvent(new Event('input'));
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);

    const request = http.expectOne({ method: 'POST', url: '/api/reservations' });
    expect(request.request.body).toEqual({ droneId: 7, studentGroupId: 3, date: '2026-08-21' });
    request.flush(reservation);
    http.expectOne('/api/reservations').flush([reservation]);
    await settle(fixture);

    expect(element.querySelector('[role="status"]')?.textContent).toContain('TELLO-07 is reserved for Group 3.');
    expect(element.querySelector('[data-reservation="5"]')?.textContent).toContain('21.08.2026');
  });

  it('shows why a reservation is rejected', async () => {
    const { fixture, element } = await openPage([]);
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);

    http
      .expectOne({ method: 'POST', url: '/api/reservations' })
      .flush({ detail: 'The drone "TELLO-07" is already reserved on 21.08.2026.' }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('already reserved on 21.08.2026');
  });

  it('marks a loaned drone and today in the list', async () => {
    const { element } = await openPage([{ ...reservation, isToday: true, droneIsLoaned: true }]);

    const row = element.querySelector('[data-reservation="5"]') as HTMLElement;
    expect(row.textContent).toContain('loaned right now');
    expect(row.querySelector('.due-today-badge')?.textContent?.trim()).toBe('Today');
  });

  it('cancels a reservation after the confirmation (scenario "Cancel a reservation")', async () => {
    const { fixture, element } = await openPage([reservation]);

    (element.querySelector('button.cancel-reservation') as HTMLButtonElement).click();
    await settle(fixture);
    expect(element.querySelector('[role="alertdialog"]')?.textContent).toContain('TELLO-07 for Group 3 on 21.08.2026');
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle(fixture);
    http.expectOne({ method: 'DELETE', url: '/api/reservations/5' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(element.querySelector('[data-reservation="5"]')).toBeNull();
  });

  it('shows the next reservation in the loan form (scenario "Loan before the reserved day")', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush(drones);
    http.expectOne('/api/student-groups').flush(groups);
    http.expectOne('/api/loans?status=Active').flush([]);
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;

    choose(element, 'droneId', 1);
    await settle(fixture);

    expect(element.querySelector('.reservation-note')?.textContent).toContain('TELLO-07 is reserved for Group 3 on 21.08.2026.');
  });
});
