import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Drone, Loan } from '../api.service';
import { routes } from '../app.routes';
import { DroneDetailPage } from './drone-detail-page';

/** Scenarios of the requirement "Drone details" (REQ-018). */
describe('DroneDetailPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const returned: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 4,
    studentGroupName: 'Group 4',
    batteries: 2,
    propellers: 4,
    loanDate: '2026-08-10',
    returnDate: '2026-08-12',
    status: 'Returned',
  };
  const active: Loan = {
    ...returned,
    id: 2,
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
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

  async function open(id: number): Promise<HTMLElement> {
    const navigation = harness.navigateByUrl(`/drones/${id}`, DroneDetailPage);
    await navigation;
    return harness.routeNativeElement as HTMLElement;
  }

  async function respond(drone: Drone, loans: Loan[]): Promise<void> {
    http.expectOne('/api/drones/7').flush(drone);
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('droneId') === '7').flush(loans);
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function section(id: string): HTMLElement {
    return harness.routeNativeElement?.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement;
  }

  it('Drone with an active and a returned loan', async () => {
    const element = await open(7);
    await respond({ id: 7, name: 'TELLO-07', status: 'Loaned', description: 'SSID: TELLO-9FA21B' }, [active, returned]);

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('TELLO-07');
    expect(element.textContent).toContain('SSID: TELLO-9FA21B');
    expect(element.querySelector('.detail-status')?.textContent).toContain('Loaned');
    expect(section('drone-active-loan').querySelector('tbody td')?.textContent?.trim()).toBe('Group 3');
    const historyRows = section('drone-history').querySelectorAll('tbody tr');
    expect(historyRows).toHaveLength(1);
    expect(historyRows[0].textContent).toContain('Group 4');
    expect(historyRows[0].textContent).toContain('12.08.2026');
  });

  it('Drone that was never loaned', async () => {
    const element = await open(7);
    await respond({ id: 7, name: 'TELLO-09', status: 'Available', description: '' }, []);

    expect(element.querySelector('.detail-status')?.textContent).toContain('Available');
    expect(section('drone-active-loan').textContent).toContain('Not loaned right now.');
    expect(section('drone-history').textContent).toContain('No returned loans yet.');
    expect(element.textContent).toContain('No description.');
  });

  it('Unknown drone', async () => {
    const element = await open(7);
    // The loans request is cancelled when the drone is unknown.
    const loans = http.expectOne((request) => request.url === '/api/loans');
    http.expectOne('/api/drones/7').flush({ detail: 'The drone with the id 7 does not exist.' }, { status: 404, statusText: 'Not Found' });
    expect(loans.cancelled).toBe(true);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('The drone with the id 7 does not exist.');
    expect(element.querySelector('a.back-link')?.getAttribute('href')).toBe('/drones');
  });

  it('links group names to their detail page', async () => {
    await open(7);
    await respond({ id: 7, name: 'TELLO-07', status: 'Loaned', description: '' }, [active]);

    const link = section('drone-active-loan').querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/student-groups/3');
  });

  it('is reachable from the drone list', async () => {
    await harness.navigateByUrl('/drones');
    http.expectOne('/api/drones').flush([{ id: 7, name: 'TELLO-07', status: 'Available', description: '' }]);
    await harness.fixture.whenStable();
    harness.detectChanges();

    const link = harness.routeNativeElement?.querySelector('tbody td a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/drones/7');

    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/drones/7');
    http.expectOne('/api/drones/7').flush({ id: 7, name: 'TELLO-07', status: 'Available', description: '' });
    http.expectOne((request) => request.url === '/api/loans').flush([]);
  });
});
