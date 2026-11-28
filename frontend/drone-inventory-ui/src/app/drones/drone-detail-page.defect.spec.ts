import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Drone } from '../api.service';
import { routes } from '../app.routes';
import { DroneDetailPage } from './drone-detail-page';

/** Reporting and repairing a defect on the detail page of a drone (REQ-024). */
describe('DroneDetailPage defect', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const available: Drone = { id: 7, name: 'TELLO-07', status: 'Available', description: '' };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  // The damage history loads itself (REQ-042); its own spec checks it.
  afterEach(() => {
    http.match((request) => request.url === '/api/defects').filter((request) => !request.cancelled).forEach((request) => request.flush([]));
    http.verify();
  });

  async function open(drone: Drone): Promise<HTMLElement> {
    await harness.navigateByUrl('/drones/7', DroneDetailPage);
    http.expectOne('/api/drones/7').flush(drone);
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('droneId') === '7').flush([]);
    await settle();
    return harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('Report a defect with the reporting group', async () => {
    const element = await open(available);

    (element.querySelector('button.report') as HTMLButtonElement).click();
    await settle();
    http.expectOne('/api/student-groups').flush([{ id: 3, name: 'Group 3' }]);
    await settle();
    const dialog = element.querySelector('[role="alertdialog"]') as HTMLElement;
    const group = dialog.querySelector('select') as HTMLSelectElement;
    group.value = '3';
    group.dispatchEvent(new Event('change'));
    const description = dialog.querySelector('textarea') as HTMLTextAreaElement;
    description.value = 'Motor 3';
    description.dispatchEvent(new Event('input'));
    (dialog.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    const request = http.expectOne({ method: 'POST', url: '/api/drones/7/defect' });
    expect(request.request.body).toEqual({ description: 'Motor 3', studentGroupId: 3 });
    request.flush({ ...available, status: 'Defective', defectNote: 'Motor 3', defectGroupName: 'Group 3' });
    await settle();

    expect(element.querySelector('.defect-note')?.textContent?.trim()).toBe('Damage: Motor 3 (Group 3)');
    expect(element.querySelector('button.repair')).not.toBeNull();
  });

  it('Repair a defective drone', async () => {
    const element = await open({ ...available, status: 'Defective', defectNote: 'Motor 3', defectGroupName: 'Group 3' });

    expect(element.querySelector('button.report')).toBeNull();
    (element.querySelector('button.repair') as HTMLButtonElement).click();
    await settle();
    (element.querySelector('[role="alertdialog"] .dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'POST', url: '/api/drones/7/repair' }).flush(available);
    await settle();

    expect(element.querySelector('.defect-note')).toBeNull();
    expect(element.querySelector('button.report')).not.toBeNull();
  });

  it('Shows the message of the backend', async () => {
    const element = await open(available);

    (element.querySelector('button.report') as HTMLButtonElement).click();
    await settle();
    http.expectOne('/api/student-groups').flush([]);
    await settle();
    (element.querySelector('[role="alertdialog"] .dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'POST', url: '/api/drones/7/defect' })
      .flush({ detail: 'Choose the student group that reports the defect.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Choose the student group that reports the defect.');
  });

  it('No defect buttons for a loaned drone', async () => {
    const element = await open({ ...available, status: 'Loaned' });

    expect(element.querySelector('button.report')).toBeNull();
    expect(element.querySelector('button.repair')).toBeNull();
  });
});
