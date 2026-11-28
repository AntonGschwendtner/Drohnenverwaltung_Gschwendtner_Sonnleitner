import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { StudentGroup } from '../api.service';
import { routes } from '../app.routes';
import { StudentGroupDetailPage } from './student-group-detail-page';

/** Scenario "Group with members" of the requirement "Student group details" (REQ-031). */
describe('StudentGroupDetailPage members', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

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
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function section(element: HTMLElement): HTMLElement {
    return element.querySelector('section[aria-labelledby="group-members"]') as HTMLElement;
  }

  it('Group with members', async () => {
    const element = await openWith({
      id: 3,
      name: 'Group 3',
      members: [
        { id: 11, name: 'Anna Huber', isLeader: true },
        { id: 12, name: 'Ben Wagner', isLeader: false },
      ],
      leaderName: 'Anna Huber',
    });

    const members = section(element);
    expect(members.querySelector('h2')?.textContent).toContain('Members');
    expect(Array.from(members.querySelectorAll('.member-name')).map((name) => name.textContent?.trim())).toEqual([
      'Anna Huber',
      'Ben Wagner',
    ]);
    const leaderRow = members.querySelector('li.leader');
    expect(leaderRow?.textContent).toContain('Anna Huber');
    expect(leaderRow?.querySelector('.leader-badge')?.textContent).toContain('Group leader');
  });

  it('says when the group has no members', async () => {
    const element = await openWith({ id: 3, name: 'Group 3', members: [], leaderName: null });

    expect(section(element).textContent).toContain('This group has no members yet.');
  });
});
