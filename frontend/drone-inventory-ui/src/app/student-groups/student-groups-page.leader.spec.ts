import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudentGroup } from '../api.service';
import { StudentGroupsPage } from './student-groups-page';

/** Leader and members in the student group list: "List student groups" and "Search student groups" (REQ-031). */
describe('StudentGroupsPage leader and member search', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  // Groups without a leader come first, so sorting by leader has to move them.
  const groups: StudentGroup[] = [
    { id: 4, name: 'Robotics Club', members: [{ id: 21, name: 'Clara Berger', isLeader: false }], leaderName: null },
    { id: 5, name: 'Group 5', members: [], leaderName: null },
    { id: 6, name: 'Drone Team', members: [{ id: 31, name: 'Ben Wagner', isLeader: true }], leaderName: 'Ben Wagner' },
    {
      id: 3,
      name: 'Group 3',
      members: [
        { id: 11, name: 'Anna Huber', isLeader: true },
        { id: 12, name: 'Ben Wagner', isLeader: false },
      ],
      leaderName: 'Anna Huber',
    },
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/student-groups').flush(groups);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function row(groupId: number): HTMLElement {
    return element.querySelector(`[data-group="${groupId}"]`) as HTMLElement;
  }

  function names(): string[] {
    return Array.from(element.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
  }

  async function searchFor(text: string): Promise<void> {
    const input = element.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  it('Members and leader in the list', () => {
    expect(row(3).querySelector('.leader-cell')?.textContent?.trim()).toBe('Anna Huber');
    expect(row(3).querySelector('button.members')?.textContent).toContain('Members (2)');
  });

  it('Group without a leader', () => {
    const cell = row(4).querySelector('.leader-cell');
    expect(cell?.textContent?.trim()).toBe('No leader');
    expect(cell?.classList.contains('none')).toBe(true);
  });

  it('Search by a member', async () => {
    await searchFor('huber');

    expect(names()).toEqual(['Group 3']);
  });

  it('finds a group without a leader by a member, ignoring case', async () => {
    await searchFor('CLARA');

    expect(names()).toEqual(['Robotics Club']);
  });

  it('still searches by the group name', async () => {
    await searchFor('group');

    expect(names()).toEqual(['Group 5', 'Group 3']);
  });

  it('sorts by group leader in both directions with groups without a leader last', async () => {
    const leaderHeader = element.querySelector('th[appSortHeader="leader"] button') as HTMLButtonElement;

    leaderHeader.click();
    await settle();
    expect(names()).toEqual(['Group 3', 'Drone Team', 'Robotics Club', 'Group 5']);

    leaderHeader.click();
    await settle();
    expect(names()).toEqual(['Drone Team', 'Group 3', 'Robotics Club', 'Group 5']);
  });
});
