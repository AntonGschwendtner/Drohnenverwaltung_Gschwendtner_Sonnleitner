import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentGroup } from '../api.service';
import { StudentGroupsPage } from './student-groups-page';

/** Editing and deleting student groups on the page (REQ-017). */
describe('StudentGroupsPage edit and delete', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const groups: StudentGroup[] = [
    { id: 3, name: 'Grup 3' },
    { id: 4, name: 'Group 4' },
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  function button(selector: string, rowIndex = 0): HTMLButtonElement {
    return element.querySelectorAll('tbody tr')[rowIndex].querySelector(selector) as HTMLButtonElement;
  }

  function names(): string[] {
    return Array.from(element.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
  }

  it('edits a group in its strip (scenario "Correct a name")', async () => {
    button('button.edit').click();
    await settle();
    const input = element.querySelector('input[name="editName"]') as HTMLInputElement;
    expect(input.value).toBe('Grup 3');
    input.value = 'Group 3';
    input.dispatchEvent(new Event('input'));
    button('button.save').click();
    await settle();

    const request = http.expectOne({ method: 'PUT', url: '/api/student-groups/3' });
    expect(request.request.body).toEqual({ name: 'Group 3' });
    request.flush({ id: 3, name: 'Group 3' });
    await settle();
    http.expectOne('/api/student-groups').flush([{ id: 3, name: 'Group 3' }, groups[1]]);
    await settle();

    expect(names()).toEqual(['Group 3', 'Group 4']);
  });

  it('shows the message when the name is taken and keeps the strip open', async () => {
    button('button.edit').click();
    await settle();
    button('button.save').click();
    await settle();

    http
      .expectOne({ method: 'PUT', url: '/api/student-groups/3' })
      .flush({ detail: 'A student group named "Group 4" already exists.' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('already exists');
    expect(element.querySelector('tr.editing')).not.toBeNull();
  });

  it('moves the focus into the name field and back to Edit after cancelling', async () => {
    button('button.edit').click();
    await settle();
    expect(document.activeElement).toBe(element.querySelector('input[name="editName"]'));

    button('button.quiet:not(.save)').click();
    await settle();
    expect(document.activeElement).toBe(button('button.edit'));
    http.expectNone({ method: 'PUT' });
  });

  it('deletes a group after the confirmation (scenario "Delete a group without loans")', async () => {
    button('button.delete', 1).click();
    await settle();
    expect(element.querySelector('[role="alertdialog"]')?.textContent).toContain('Delete Group 4?');
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'DELETE', url: '/api/student-groups/4' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne('/api/student-groups').flush([groups[0]]);
    await settle();

    expect(names()).toEqual(['Grup 3']);
  });

  it('shows why a group with loans cannot be deleted (scenario "Group has loans")', async () => {
    button('button.delete').click();
    await settle();
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/student-groups/3' })
      .flush({ detail: 'The student group "Grup 3" has loans and cannot be deleted.' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('has loans and cannot be deleted');
    expect(names()).toEqual(['Grup 3', 'Group 4']);
  });

  it('sends nothing when the deletion is cancelled', async () => {
    button('button.delete').click();
    await settle();
    (element.querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    expect(document.activeElement).toBe(button('button.delete'));
  });
});
