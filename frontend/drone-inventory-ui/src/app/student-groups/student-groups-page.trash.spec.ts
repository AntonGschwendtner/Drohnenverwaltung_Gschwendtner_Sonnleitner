import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudentGroup, TrashedStudentGroup } from '../api.service';
import { StudentGroupsPage } from './student-groups-page';

/** Scenarios of "Student group trash" and "Restore student group" on the page (REQ-033). */
describe('StudentGroupsPage trash', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const group3: StudentGroup = { id: 3, name: 'Group 3', members: [], leaderName: null };
  const group4: StudentGroup = { id: 4, name: 'Group 4', members: [], leaderName: null };
  const trashed: TrashedStudentGroup = { id: 5, name: 'Group 5', deletedAt: '2026-08-20', loanCount: 2, memberCount: 3 };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/student-groups').flush([group3, group4]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function toggle(): HTMLButtonElement {
    return element.querySelector('button.trash-toggle') as HTMLButtonElement;
  }

  function listedNames(): string[] {
    return Array.from(element.querySelectorAll('tbody tr[data-group] td:first-child')).map(
      (cell) => cell.textContent?.trim() ?? '',
    );
  }

  async function openTrash(groups: TrashedStudentGroup[]): Promise<void> {
    toggle().click();
    await settle();
    http.expectOne('/api/student-groups/trash').flush(groups);
    await settle();
  }

  it('loads the trash only when it is opened', async () => {
    http.expectNone('/api/student-groups/trash');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    await openTrash([]);

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('Show the trash', async () => {
    await openTrash([trashed]);

    const row = element.querySelector('[data-trashed="5"]') as HTMLElement;
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim());
    expect(cells.slice(0, 4)).toEqual(['Group 5', '20.08.2026', '2', '3']);
  });

  it('Empty trash', async () => {
    await openTrash([]);

    expect(element.querySelector('.trash')?.textContent).toContain('The trash is empty.');
  });

  it('Restore a group', async () => {
    await openTrash([trashed]);

    (element.querySelector('[data-trashed="5"] button.restore') as HTMLButtonElement).click();
    await settle();
    http
      .expectOne({ method: 'POST', url: '/api/student-groups/5/restore' })
      .flush({ id: 5, name: 'Group 5', members: [], leaderName: null, deletedAt: null });
    await settle();
    http.expectOne('/api/student-groups').flush([group3, group4, { id: 5, name: 'Group 5', members: [], leaderName: null }]);
    await settle();

    expect(element.querySelector('[data-trashed="5"]')).toBeNull();
    expect(element.querySelector('.trash')?.textContent).toContain('The trash is empty.');
    expect(listedNames()).toEqual(['Group 3', 'Group 4', 'Group 5']);
  });

  it('shows why a group cannot be restored', async () => {
    await openTrash([trashed]);

    (element.querySelector('[data-trashed="5"] button.restore') as HTMLButtonElement).click();
    await settle();
    http
      .expectOne({ method: 'POST', url: '/api/student-groups/5/restore' })
      .flush({ detail: '"Group 5" is not in the trash.' }, { status: 404, statusText: 'Not Found' });
    await settle();

    // The group may have been restored somewhere else, so the trash loads again and keeps the message.
    http.expectOne('/api/student-groups/trash').flush([]);
    await settle();

    expect(element.querySelector('.trash [role="alert"]')?.textContent).toContain('is not in the trash');
    expect(element.querySelector('[data-trashed="5"]')).toBeNull();
  });

  it('moves a deleted group into the open trash', async () => {
    await openTrash([]);

    (element.querySelector('[data-group="4"] button.delete') as HTMLButtonElement).click();
    await settle();
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();
    http.expectOne({ method: 'DELETE', url: '/api/student-groups/4' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne('/api/student-groups').flush([group3]);
    http.expectOne('/api/student-groups/trash').flush([{ id: 4, name: 'Group 4', deletedAt: '2026-08-19', loanCount: 0, memberCount: 0 }]);
    await settle();

    expect(listedNames()).toEqual(['Group 3']);
    expect(element.querySelector('[data-trashed="4"]')?.textContent).toContain('Group 4');
  });

  it('closes the trash again', async () => {
    await openTrash([trashed]);

    toggle().click();
    await settle();

    expect(element.querySelector('[data-trashed="5"]')).toBeNull();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });
});
