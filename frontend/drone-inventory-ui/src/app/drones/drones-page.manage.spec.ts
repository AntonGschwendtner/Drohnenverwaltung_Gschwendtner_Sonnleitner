import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../api.service';
import { DronesPage } from './drones-page';

/** Editing and deleting drones on the page (REQ-015, REQ-016). */
describe('DronesPage edit and delete', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const drones: Drone[] = [
    { id: 7, name: 'TELO-07', status: 'Available', description: 'SSID: TELLO-9FA21B' },
    { id: 9, name: 'TELLO-09', status: 'Available', description: 'new' },
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/drones').flush(drones);
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

  async function type(name: string, value: string): Promise<void> {
    const input = element.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  it('edits a drone in its strip and sends name and description (scenario "Correct a name")', async () => {
    button('button.edit').click();
    await settle();
    expect((element.querySelector('input[name="editName"]') as HTMLInputElement).value).toBe('TELO-07');

    await type('editName', 'TELLO-07');
    button('button.save').click();
    await settle();

    const request = http.expectOne({ method: 'PUT', url: '/api/drones/7' });
    expect(request.request.body).toEqual({ name: 'TELLO-07', description: 'SSID: TELLO-9FA21B' });
    request.flush({ ...drones[0], name: 'TELLO-07' });
    await settle();
    http.expectOne('/api/drones').flush([{ ...drones[0], name: 'TELLO-07' }, drones[1]]);
    await settle();

    expect(element.querySelector('tr.editing')).toBeNull();
    expect(names()).toEqual(['TELLO-07', 'TELLO-09']);
  });

  it('keeps the strip open and shows the message when the name is taken', async () => {
    button('button.edit').click();
    await settle();
    await type('editName', 'TELLO-09');
    button('button.save').click();
    await settle();

    http
      .expectOne({ method: 'PUT', url: '/api/drones/7' })
      .flush({ detail: 'A drone named "TELLO-09" already exists.' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('A drone named "TELLO-09" already exists.');
    expect(element.querySelector('tr.editing')).not.toBeNull();
  });

  it('cancels editing without a request', async () => {
    button('button.edit').click();
    await settle();
    await type('editName', 'other');
    button('button.quiet:not(.save)').click();
    await settle();

    http.expectNone({ method: 'PUT' });
    expect(names()).toEqual(['TELO-07', 'TELLO-09']);
  });

  it('deletes a drone after the confirmation (scenario "Delete a drone without loans")', async () => {
    button('button.delete', 1).click();
    await settle();
    expect(element.querySelector('[role="alertdialog"]')?.textContent).toContain('Delete TELLO-09?');
    http.expectNone({ method: 'DELETE' });

    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'DELETE', url: '/api/drones/9' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne('/api/drones').flush([drones[0]]);
    await settle();

    expect(names()).toEqual(['TELO-07']);
  });

  it('shows why a drone with loans cannot be deleted (scenario "Drone has a returned loan")', async () => {
    button('button.delete').click();
    await settle();
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/drones/7' })
      .flush(
        { detail: 'The drone "TELO-07" has loans and cannot be deleted, so the loan history stays complete.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('has loans and cannot be deleted');
    expect(names()).toEqual(['TELO-07', 'TELLO-09']);
  });

  it('sends nothing when the deletion is cancelled', async () => {
    button('button.delete').click();
    await settle();
    (element.querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    expect(element.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(button('button.delete'));
  });
});
