import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { StudentGroup } from '../api.service';
import { routes } from '../app.routes';
import { StudentGroupDetailPage } from './student-group-detail-page';

/** Scenario "Open a group in the trash" with restore on the detail page (REQ-033). */
describe('StudentGroupDetailPage in the trash', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const inTrash: StudentGroup = { id: 3, name: 'Group 3', members: [], leaderName: null, deletedAt: '2026-08-20' };

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

  async function openWith(studentGroup: StudentGroup): Promise<HTMLElement> {
    await harness.navigateByUrl('/student-groups/3', StudentGroupDetailPage);
    http.expectOne('/api/student-groups/3').flush(studentGroup);
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('studentGroupId') === '3').flush([]);
    await settle();
    return harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('Open a group in the trash', async () => {
    const element = await openWith(inTrash);

    expect(element.querySelector('.trash-notice')?.textContent).toContain(
      'This group has been in the trash since 20.08.2026 and cannot loan drones.',
    );
  });

  it('restores the group from its page', async () => {
    const element = await openWith(inTrash);

    (element.querySelector('.trash-notice button.restore') as HTMLButtonElement).click();
    await settle();
    http.expectOne({ method: 'POST', url: '/api/student-groups/3/restore' }).flush({ ...inTrash, deletedAt: null });
    await settle();

    expect(element.querySelector('.trash-notice')).toBeNull();
  });

  it('shows no hint for a group outside the trash', async () => {
    const element = await openWith({ ...inTrash, deletedAt: null });

    expect(element.querySelector('.trash-notice')).toBeNull();
  });
});
