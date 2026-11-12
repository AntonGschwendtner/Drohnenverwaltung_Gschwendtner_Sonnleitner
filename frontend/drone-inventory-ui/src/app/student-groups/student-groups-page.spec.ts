import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentGroupsPage } from './student-groups-page';

describe('StudentGroupsPage', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function names(): string[] {
    return Array.from(element().querySelectorAll('tbody td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
  }

  async function submitName(name: string): Promise<void> {
    const field = element().querySelector('[name="name"]') as HTMLInputElement;
    field.value = name;
    field.dispatchEvent(new Event('input'));
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  }

  it('shows the student groups', async () => {
    http.expectOne('/api/student-groups').flush([
      { id: 1, name: 'Group 3' },
      { id: 2, name: 'Group 4' },
    ]);
    await settle();

    expect(names()).toEqual(['Group 3', 'Group 4']);
  });

  it('says when there are no student groups', async () => {
    http.expectOne('/api/student-groups').flush([]);
    await settle();

    expect(element().textContent).toContain('No student groups yet.');
  });

  it('sends a student group and shows it in the list', async () => {
    http.expectOne('/api/student-groups').flush([]);
    await settle();

    await submitName('Group 3');

    const request = http.expectOne({ method: 'POST', url: '/api/student-groups' });
    expect(request.request.body).toEqual({ name: 'Group 3' });
    request.flush({ id: 1, name: 'Group 3' });
    await settle();

    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush([{ id: 1, name: 'Group 3' }]);
    await settle();

    expect(names()).toEqual(['Group 3']);
    expect((element().querySelector('[name="name"]') as HTMLInputElement).value).toBe('');
  });

  it('shows the rejection message from the backend', async () => {
    http.expectOne('/api/student-groups').flush([{ id: 1, name: 'Group 3' }]);
    await settle();

    await submitName('Group 3');

    http.expectOne({ method: 'POST', url: '/api/student-groups' }).flush(
      { detail: 'A student group named "Group 3" already exists.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'A student group named "Group 3" already exists.',
    );
    expect((element().querySelector('[name="name"]') as HTMLInputElement).value).toBe('Group 3');
    expect((element().querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('sends once and blocks the button while the request runs', async () => {
    http.expectOne('/api/student-groups').flush([]);
    await settle();

    await submitName('Group 3');
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();

    const request = http.expectOne({ method: 'POST', url: '/api/student-groups' });
    expect((element().querySelector('button') as HTMLButtonElement).disabled).toBe(true);

    request.flush({ detail: 'Try again.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect((element().querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the message when the list cannot be loaded', async () => {
    http.expectOne('/api/student-groups').flush(
      { detail: 'The database is not reachable.' },
      { status: 500, statusText: 'Server Error' },
    );
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('The database is not reachable.');
    expect(element().textContent).not.toContain('No student groups yet.');
  });
});
