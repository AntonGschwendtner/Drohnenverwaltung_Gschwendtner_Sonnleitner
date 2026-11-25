import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Drone, Loan } from '../api.service';
import { routes } from '../app.routes';
import { DroneDetailPage } from './drone-detail-page';

/** Scenario "Open a drone in the trash" and the restore on the drone page (REQ-034). */
describe('DroneDetailPage in the trash', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const inTrash: Drone = { id: 7, name: 'TELLO-07', status: 'Available', description: '', deletedAt: '2026-08-20' };
  const returned: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 2,
    propellers: 4,
    loanDate: '2026-08-10',
    returnDate: '2026-08-12',
    status: 'Returned',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function openWith(drone: Drone): Promise<HTMLElement> {
    await harness.navigateByUrl('/drones/7', DroneDetailPage);
    http.expectOne('/api/drones/7').flush(drone);
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('droneId') === '7').flush([returned]);
    await settle();
    return harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('Open a drone in the trash', async () => {
    const element = await openWith(inTrash);

    expect(element.querySelector('.trash-notice')?.textContent).toContain(
      'This drone has been in the trash since 20.08.2026 and cannot be loaned.',
    );
    expect(element.querySelector('.qr-label')).toBeNull();
    expect(element.textContent).toContain('Group 3');
  });

  it('restores the drone from its page and shows the QR label again', async () => {
    const element = await openWith(inTrash);

    (element.querySelector('.trash-notice button.restore') as HTMLButtonElement).click();
    await settle();
    http.expectOne({ method: 'POST', url: '/api/drones/7/restore' }).flush({ ...inTrash, deletedAt: null });
    await settle();

    expect(element.querySelector('.trash-notice')).toBeNull();
    expect(element.querySelector('.qr-label')).not.toBeNull();
  });
});
