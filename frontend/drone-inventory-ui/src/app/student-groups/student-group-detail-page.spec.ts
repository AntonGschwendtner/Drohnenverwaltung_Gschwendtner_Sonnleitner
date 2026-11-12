import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Loan, StudentGroup } from '../api.service';
import { routes } from '../app.routes';
import { StudentGroupDetailPage } from './student-group-detail-page';

/** Scenarios of the requirement "Student group details" (REQ-019). */
describe('StudentGroupDetailPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const active: Loan = {
    id: 2,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: null,
    status: 'Active',
  };
  const returned: Loan = { ...active, id: 1, droneId: 8, droneName: 'TELLO-08', returnDate: '2026-08-12', loanDate: '2026-08-10', status: 'Returned' };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function openWith(studentGroup: StudentGroup, loans: Loan[]): Promise<HTMLElement> {
    await harness.navigateByUrl('/student-groups/3', StudentGroupDetailPage);
    http.expectOne('/api/student-groups/3').flush(studentGroup);
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('studentGroupId') === '3').flush(loans);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function section(element: HTMLElement, id: string): HTMLElement {
    return element.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement;
  }

  it('Group with active and returned loans', async () => {
    const element = await openWith({ id: 3, name: 'Group 3' }, [active, returned]);

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Group 3');
    expect(section(element, 'group-active-loans').querySelector('tbody td')?.textContent?.trim()).toBe('TELLO-07');
    const history = section(element, 'group-history').querySelectorAll('tbody tr');
    expect(history).toHaveLength(1);
    expect(history[0].textContent).toContain('TELLO-08');
    expect(history[0].textContent).toContain('12.08.2026');
    expect(section(element, 'group-active-loans').querySelector('a')?.getAttribute('href')).toBe('/drones/7');
  });

  it('says when the group has nothing right now', async () => {
    const element = await openWith({ id: 3, name: 'Group 3' }, []);

    expect(section(element, 'group-active-loans').textContent).toContain('This group has no drone right now.');
    expect(section(element, 'group-history').textContent).toContain('No returned loans yet.');
  });

  it('Unknown student group', async () => {
    await harness.navigateByUrl('/student-groups/3', StudentGroupDetailPage);
    const loans = http.expectOne((request) => request.url === '/api/loans');
    http
      .expectOne('/api/student-groups/3')
      .flush({ detail: 'The student group with the id 3 does not exist.' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(loans.cancelled).toBe(true);
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('does not exist');
  });
});
