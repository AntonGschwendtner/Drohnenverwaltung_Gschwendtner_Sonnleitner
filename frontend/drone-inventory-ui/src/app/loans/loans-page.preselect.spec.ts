import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Drone, Loan } from '../api.service';
import { routes } from '../app.routes';
import { LoansPage } from './loans-page';

/** Scenarios of the requirement "Open the loan page for one drone" (REQ-026). */
describe('LoansPage opened for one drone', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const drones: Drone[] = [
    { id: 7, name: 'TELLO-07', status: 'Available', description: '' },
    { id: 8, name: 'TELLO-08', status: 'Loaned', description: '' },
    { id: 9, name: 'TELLO-09', status: 'Defective', description: '', defectNote: 'Motor' },
  ];
  const activeLoan: Loan = {
    id: 1,
    droneId: 8,
    droneName: 'TELLO-08',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 0,
    propellers: 0,
    loanDate: '2026-08-19',
    returnDate: null,
    status: 'Active',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url, LoansPage);
    http.expectOne('/api/drones').flush(drones);
    http.expectOne('/api/student-groups').flush([{ id: 3, name: 'Group 3', members: [], leaderName: null }]);
    http.expectOne('/api/loans?status=Active').flush([activeLoan]);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function chosenDrone(element: HTMLElement): string {
    const select = element.querySelector('select[name="droneId"]') as HTMLSelectElement;
    return select.options[select.selectedIndex].textContent?.trim() ?? '';
  }

  it('Available drone from a QR code', async () => {
    const element = await open('/loans?drone=7');

    expect(chosenDrone(element)).toBe('TELLO-07');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('Loaned drone from a QR code', async () => {
    const element = await open('/loans?drone=8');

    expect(chosenDrone(element)).toBe('Choose a drone');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('TELLO-08 is loaned to Group 3 right now.');
  });

  it('says that a defective drone cannot be loaned', async () => {
    const element = await open('/loans?drone=9');

    expect(chosenDrone(element)).toBe('Choose a drone');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('TELLO-09 is defective');
  });

  it('says when the drone from the QR code does not exist', async () => {
    const element = await open('/loans?drone=99');

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('does not exist');
  });

  it('drops the hint once the chosen drone has been loaned', async () => {
    const element = await open('/loans?drone=7');
    const group = element.querySelector('select[name="studentGroupId"]') as HTMLSelectElement;
    group.selectedIndex = 1;
    group.dispatchEvent(new Event('change'));
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    http
      .expectOne({ method: 'POST', url: '/api/loans' })
      .flush({ ...activeLoan, id: 2, droneId: 7, droneName: 'TELLO-07' });
    http.expectOne('/api/drones').flush([{ ...drones[0], status: 'Loaned' }, drones[1], drones[2]]);
    http.expectOne('/api/student-groups').flush([{ id: 3, name: 'Group 3', members: [], leaderName: null }]);
    http.expectOne('/api/loans?status=Active').flush([activeLoan, { ...activeLoan, id: 2, droneId: 7, droneName: 'TELLO-07' }]);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('TELLO-07');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('chooses nothing without a drone in the address', async () => {
    const element = await open('/loans');

    expect(chosenDrone(element)).toBe('Choose a drone');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
