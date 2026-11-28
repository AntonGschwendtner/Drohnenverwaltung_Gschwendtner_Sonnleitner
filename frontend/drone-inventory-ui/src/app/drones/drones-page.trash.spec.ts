import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Drone, TrashedDrone } from '../api.service';
import { DronesPage } from './drones-page';

/** Scenarios of the drone trash on the drone page (REQ-034). */
describe('DronesPage trash', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const tello8: Drone = { id: 8, name: 'TELLO-08', status: 'Available', description: '' };
  const trashed: TrashedDrone = { id: 7, name: 'TELLO-07', deletedAt: '2026-08-20', loanCount: 2 };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/drones').flush([tello8]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function openTrash(drones: TrashedDrone[]): Promise<void> {
    http.expectNone('/api/drones/trash');
    (element.querySelector('#drone-trash button.trash-toggle') as HTMLButtonElement).click();
    await settle();
    http.expectOne('/api/drones/trash').flush(drones);
    await settle();
  }

  function row(): HTMLElement | null {
    return element.querySelector('[data-trashed-drone="7"]');
  }

  function dialog(): HTMLElement | null {
    return element.querySelector('[role="alertdialog"]');
  }

  it('Show the drone trash', async () => {
    await openTrash([trashed]);

    const cells = Array.from(row()?.querySelectorAll('td') ?? []).map((cell) => cell.textContent?.trim());
    expect(cells.slice(0, 3)).toEqual(['TELLO-07', '20.08.2026', '2']);
  });

  it('Empty drone trash', async () => {
    await openTrash([]);

    expect(element.querySelector('section[aria-labelledby="drone-trash"]')?.textContent).toContain('The trash is empty.');
  });

  it('Empty the whole trash after the dialog', async () => {
    await openTrash([trashed, { id: 9, name: 'TELLO-09', deletedAt: '2026-08-20', loanCount: 1 }]);

    (element.querySelector('button.empty-trash') as HTMLButtonElement).click();
    await settle();
    expect(dialog()?.textContent).toContain('All 2 drones in the trash are deleted for good.');
    expect(dialog()?.textContent).toContain('3 loans are deleted');
    (dialog()?.querySelector('input[value="delete"]') as HTMLInputElement).click();
    await settle();
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    const request = http.expectOne((candidate) => candidate.method === 'DELETE' && candidate.url === '/api/drones/trash');
    expect(request.request.params.get('history')).toBe('delete');
    request.flush({ deleted: 2 });
    await settle();
    http.expectOne('/api/drones/trash').flush([]);
    await settle();

    expect(element.querySelector('section[aria-labelledby="drone-trash"]')?.textContent).toContain('The trash is empty.');
  });

  it('Cancelling the empty dialog sends nothing', async () => {
    await openTrash([trashed]);

    (element.querySelector('button.empty-trash') as HTMLButtonElement).click();
    await settle();
    (dialog()?.querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    expect(row()).not.toBeNull();
  });

  it('Restore a drone', async () => {
    await openTrash([trashed]);

    (row()?.querySelector('button.restore') as HTMLButtonElement).click();
    await settle();
    http
      .expectOne({ method: 'POST', url: '/api/drones/7/restore' })
      .flush({ id: 7, name: 'TELLO-07', status: 'Available', description: '', deletedAt: null });
    await settle();
    http.expectOne('/api/drones').flush([{ id: 7, name: 'TELLO-07', status: 'Available', description: '' }, tello8]);
    await settle();

    expect(row()).toBeNull();
    const names = Array.from(element.querySelectorAll('tbody tr[data-drone] td:first-child')).map((cell) => cell.textContent?.trim());
    expect(names).toContain('TELLO-07');
  });

  it('keeps the drone history when deleted for good', async () => {
    await openTrash([trashed]);

    (row()?.querySelector('button.delete-permanently') as HTMLButtonElement).click();
    await settle();
    expect(dialog()?.textContent).toContain('TELLO-07 is deleted. This cannot be undone.');
    expect((dialog()?.querySelector('input[value="keep"]') as HTMLInputElement).checked).toBe(true);
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'DELETE', url: '/api/drones/7/permanent?history=keep' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    expect(row()).toBeNull();
  });

  it('deletes the drone with the history when chosen', async () => {
    await openTrash([trashed]);

    (row()?.querySelector('button.delete-permanently') as HTMLButtonElement).click();
    await settle();
    (dialog()?.querySelector('input[value="delete"]') as HTMLInputElement).click();
    await settle();
    expect(dialog()?.textContent).toContain('2 loans are deleted');
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'DELETE', url: '/api/drones/7/permanent?history=delete' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    expect(row()).toBeNull();
  });

  it('moves a deleted drone into the open trash', async () => {
    await openTrash([]);

    (element.querySelector('[data-drone="8"] button.delete') as HTMLButtonElement).click();
    await settle();
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();
    http.expectOne({ method: 'DELETE', url: '/api/drones/8' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/drones/trash').flush([{ id: 8, name: 'TELLO-08', deletedAt: '2026-08-19', loanCount: 0 }]);
    await settle();

    expect(element.querySelector('[data-trashed-drone="8"]')?.textContent).toContain('TELLO-08');
  });
});
