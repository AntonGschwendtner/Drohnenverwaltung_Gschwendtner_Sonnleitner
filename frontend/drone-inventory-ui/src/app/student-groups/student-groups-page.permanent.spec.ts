import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrashedStudentGroup } from '../api.service';
import { StudentGroupsPage } from './student-groups-page';

/** Scenarios of "Delete student group permanently" with the choice about the history (REQ-033). */
describe('StudentGroupsPage permanent delete', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

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
    http.expectOne('/api/student-groups').flush([]);
    await settle();
    (element.querySelector('button.trash-toggle') as HTMLButtonElement).click();
    await settle();
    http.expectOne('/api/student-groups/trash').flush([trashed]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function dialog(): HTMLElement | null {
    return element.querySelector('[role="alertdialog"]');
  }

  function radio(value: 'keep' | 'delete'): HTMLInputElement {
    return dialog()?.querySelector(`input[type="radio"][value="${value}"]`) as HTMLInputElement;
  }

  async function askPermanent(): Promise<void> {
    (element.querySelector('[data-trashed="5"] button.delete-permanently') as HTMLButtonElement).click();
    await settle();
  }

  it('asks with keeping the history chosen', async () => {
    await askPermanent();

    expect(dialog()?.querySelector('h2')?.textContent).toContain('Delete Group 5 for good?');
    expect(radio('keep').checked).toBe(true);
    expect(radio('delete').checked).toBe(false);
    expect(dialog()?.textContent).toContain('Also delete the history: 2 loans are deleted');
    expect((dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).textContent).toContain('Delete, keep history');
  });

  it('Keep the history', async () => {
    await askPermanent();
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/student-groups/5/permanent?history=keep' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(element.querySelector('[data-trashed="5"]')).toBeNull();
    expect(element.querySelector('.trash')?.textContent).toContain('The trash is empty.');
  });

  it('Delete with the history', async () => {
    await askPermanent();
    radio('delete').click();
    await settle();

    expect((dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).textContent).toContain('Delete everything');
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/student-groups/5/permanent?history=delete' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(element.querySelector('[data-trashed="5"]')).toBeNull();
  });

  it('starts with keeping the history again after a cancel', async () => {
    await askPermanent();
    radio('delete').click();
    (dialog()?.querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    await askPermanent();
    expect(radio('keep').checked).toBe(true);
  });

  it('shows why a group cannot be deleted for good', async () => {
    await askPermanent();
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/student-groups/5/permanent?history=keep' })
      .flush({ detail: '"Group 5" still has "TELLO-07". Return the drone first.' }, { status: 409, statusText: 'Conflict' });
    await settle();
    http.expectOne('/api/student-groups/trash').flush([trashed]);
    await settle();

    expect(element.querySelector('.trash [role="alert"]')?.textContent).toContain('Return the drone first');
    expect(element.querySelector('[data-trashed="5"]')).not.toBeNull();
  });
});
