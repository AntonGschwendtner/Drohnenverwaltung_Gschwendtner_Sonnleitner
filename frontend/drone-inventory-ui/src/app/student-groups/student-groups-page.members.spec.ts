import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudentGroup } from '../api.service';
import { StudentGroupsPage } from './student-groups-page';

/** Scenarios of the requirement "Members view" and the leader actions in it (REQ-031). */
describe('StudentGroupsPage members', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const group3: StudentGroup = {
    id: 3,
    name: 'Group 3',
    members: [
      { id: 11, name: 'Anna Huber', isLeader: true },
      { id: 12, name: 'Ben Wagner', isLeader: false },
    ],
    leaderName: 'Anna Huber',
  };
  const group4: StudentGroup = { id: 4, name: 'Group 4', members: [], leaderName: null };

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

  function membersButton(groupId: number): HTMLButtonElement {
    return element.querySelector(`[data-group="${groupId}"] button.members`) as HTMLButtonElement;
  }

  function dialog(): HTMLElement | null {
    return element.querySelector('.members-dialog');
  }

  function memberNames(): string[] {
    return Array.from(dialog()?.querySelectorAll('.member-name') ?? []).map((name) => name.textContent?.trim() ?? '');
  }

  function memberRow(memberId: number): HTMLElement {
    return dialog()?.querySelector(`[data-member="${memberId}"]`) as HTMLElement;
  }

  async function open(groupId: number): Promise<void> {
    membersButton(groupId).click();
    await settle();
  }

  it('shows the number of members on the button of each group', () => {
    expect(membersButton(3).textContent).toContain('Members (2)');
    expect(membersButton(4).textContent).toContain('Members (0)');
  });

  it('Open the members', async () => {
    await open(3);

    expect(dialog()?.querySelector('h2')?.textContent).toContain('Members of Group 3');
    expect(memberNames()).toEqual(['Anna Huber', 'Ben Wagner']);
    expect(memberRow(11).querySelector('.leader-badge')?.textContent).toContain('Group leader');
    expect(memberRow(12).querySelector('.leader-badge')).toBeNull();
  });

  it('Group without members', async () => {
    await open(4);

    expect(dialog()?.textContent).toContain('This group has no members yet.');
    expect(dialog()?.querySelector('.member-list')).toBeNull();
  });

  it('Add a member in the members view', async () => {
    await open(3);
    const input = dialog()?.querySelector('input[name="memberName"]') as HTMLInputElement;
    input.value = 'Clara Berger';
    input.dispatchEvent(new Event('input'));
    (dialog()?.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();

    const request = http.expectOne({ method: 'POST', url: '/api/student-groups/3/members' });
    expect(request.request.body).toEqual({ name: 'Clara Berger' });
    request.flush({ id: 13, name: 'Clara Berger', isLeader: false });
    http.expectOne({ method: 'GET', url: '/api/student-groups/3' }).flush({
      ...group3,
      members: [group3.members[0], group3.members[1], { id: 13, name: 'Clara Berger', isLeader: false }],
    });
    await settle();

    expect(memberNames()).toEqual(['Anna Huber', 'Ben Wagner', 'Clara Berger']);
    expect(membersButton(3).textContent).toContain('Members (3)');
    expect(input.value).toBe('');
  });

  it('shows the message of the backend and keeps the name', async () => {
    await open(3);
    const input = dialog()?.querySelector('input[name="memberName"]') as HTMLInputElement;
    input.value = 'anna huber';
    input.dispatchEvent(new Event('input'));
    (dialog()?.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();

    http
      .expectOne({ method: 'POST', url: '/api/student-groups/3/members' })
      .flush({ detail: '"anna huber" is already a member of "Group 3".' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('is already a member');
    expect(input.value).toBe('anna huber');
    expect(memberNames()).toEqual(['Anna Huber', 'Ben Wagner']);
  });

  it('removes a member only after the second click', async () => {
    await open(3);
    (memberRow(12).querySelector('button.remove') as HTMLButtonElement).click();
    await settle();

    expect(memberRow(12).textContent).toContain('Remove Ben Wagner from the group?');
    http.expectNone({ method: 'DELETE' });

    (memberRow(12).querySelector('button.confirm-remove') as HTMLButtonElement).click();
    await settle();
    http.expectOne({ method: 'DELETE', url: '/api/student-groups/3/members/12' }).flush(null);
    http.expectOne({ method: 'GET', url: '/api/student-groups/3' }).flush({ ...group3, members: [group3.members[0]] });
    await settle();

    expect(memberNames()).toEqual(['Anna Huber']);
    expect(membersButton(3).textContent).toContain('Members (1)');
  });

  it('keeps the member when the removal is cancelled', async () => {
    await open(3);
    (memberRow(12).querySelector('button.remove') as HTMLButtonElement).click();
    await settle();
    (memberRow(12).querySelector('button.cancel-remove') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    expect(memberNames()).toEqual(['Anna Huber', 'Ben Wagner']);
  });

  it('makes another member the group leader', async () => {
    await open(3);
    (memberRow(12).querySelector('button.make-leader') as HTMLButtonElement).click();
    await settle();

    const request = http.expectOne({ method: 'PUT', url: '/api/student-groups/3/leader' });
    expect(request.request.body).toEqual({ memberId: 12 });
    const changed: StudentGroup = {
      ...group3,
      members: [
        { id: 11, name: 'Anna Huber', isLeader: false },
        { id: 12, name: 'Ben Wagner', isLeader: true },
      ],
      leaderName: 'Ben Wagner',
    };
    request.flush(changed);
    http.expectOne({ method: 'GET', url: '/api/student-groups/3' }).flush(changed);
    await settle();

    expect(memberRow(12).querySelector('.leader-badge')).not.toBeNull();
    expect(memberRow(11).querySelector('.leader-badge')).toBeNull();
    expect(memberRow(11).querySelector('button.make-leader')).not.toBeNull();
  });

  it('leaves the group without a leader', async () => {
    await open(3);
    (dialog()?.querySelector('button.no-leader') as HTMLButtonElement).click();
    await settle();

    const request = http.expectOne({ method: 'PUT', url: '/api/student-groups/3/leader' });
    expect(request.request.body).toEqual({ memberId: null });
    const changed: StudentGroup = {
      ...group3,
      members: group3.members.map((member) => ({ ...member, isLeader: false })),
      leaderName: null,
    };
    request.flush(changed);
    http.expectOne({ method: 'GET', url: '/api/student-groups/3' }).flush(changed);
    await settle();

    expect(dialog()?.querySelector('.leader-badge')).toBeNull();
    expect(dialog()?.querySelector('button.no-leader')).toBeNull();
  });

  it('closes with the close button and with Escape', async () => {
    await open(3);
    (dialog()?.querySelector('button.close') as HTMLButtonElement).click();
    await settle();
    expect(dialog()).toBeNull();

    await open(3);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(dialog()).toBeNull();
  });

  it('stays open while a change is on its way', async () => {
    await open(3);
    (memberRow(12).querySelector('button.make-leader') as HTMLButtonElement).click();
    await settle();

    expect((dialog()?.querySelector('button.close') as HTMLButtonElement).disabled).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (element.querySelector('.dialog-backdrop') as HTMLElement).click();
    await settle();
    expect(dialog()).not.toBeNull();

    http.expectOne({ method: 'PUT', url: '/api/student-groups/3/leader' }).flush(group3);
    http.expectOne({ method: 'GET', url: '/api/student-groups/3' }).flush(group3);
    await settle();
    expect((dialog()?.querySelector('button.close') as HTMLButtonElement).disabled).toBe(false);
  });

  it('Escape first cancels an open removal question', async () => {
    await open(3);
    (memberRow(12).querySelector('button.remove') as HTMLButtonElement).click();
    await settle();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(dialog()).not.toBeNull();
    expect(memberRow(12).querySelector('button.confirm-remove')).toBeNull();
    http.expectNone({ method: 'DELETE' });
  });

  it('gives the focus back to the members button when closed', async () => {
    await open(3);
    (dialog()?.querySelector('button.close') as HTMLButtonElement).click();
    await settle();

    expect(document.activeElement).toBe(membersButton(3));
  });

  it('shows the dialog in German', async () => {
    localStorage.setItem('drone-inventory-language', 'de');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/student-groups').flush([group3]);
    await settle();
    localStorage.removeItem('drone-inventory-language');

    expect(membersButton(3).textContent).toContain('Mitglieder (2)');
    await open(3);
    expect(dialog()?.querySelector('h2')?.textContent).toContain('Mitglieder von Group 3');
    expect(memberRow(11).querySelector('.leader-badge')?.textContent).toContain('Gruppenleiter');
  });
});
