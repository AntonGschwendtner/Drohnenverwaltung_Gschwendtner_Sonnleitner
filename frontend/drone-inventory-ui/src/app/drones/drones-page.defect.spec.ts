import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Drone, Loan } from '../api.service';
import { HistoryPage } from '../history/history-page';
import { I18nService } from '../i18n.service';
import { DronesPage } from './drones-page';

/** Defective drones on the drone page and missing parts in the history (REQ-023, REQ-024). */
describe('Defects and missing parts in the interface', () => {
  let http: HttpTestingController;

  const drones: Drone[] = [
    { id: 7, name: 'TELLO-07', status: 'Loaned', description: '' },
    { id: 8, name: 'TELLO-08', status: 'Defective', description: 'Ersatz', defectNote: 'Motor 3 dreht nicht', defectGroupName: 'Group 3' },
    { id: 9, name: 'TELLO-09', status: 'Available', description: '' },
  ];

  const groups = [{ id: 3, name: 'Group 3' }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function dronePage(): Promise<ComponentFixture<DronesPage>> {
    const fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush(drones);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function row(fixture: ComponentFixture<DronesPage>, name: string): HTMLElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')).find((tr) =>
      tr.textContent?.includes(name),
    ) as HTMLElement;
  }

  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Overview counts defective drones', async () => {
    const fixture = await dronePage();
    const tiles = Object.fromEntries(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.overview-tile')).map((tile) => [
        tile.querySelector('dt')?.textContent?.trim(),
        tile.querySelector('dd')?.textContent?.trim(),
      ]),
    );

    expect(tiles).toEqual({ Drones: '3', Available: '1', Loaned: '1', Defective: '1' });
  });

  it('shows the defect and the badge of a defective drone', async () => {
    const fixture = await dronePage();
    const defective = row(fixture, 'TELLO-08');

    expect(defective.querySelector('.status-defective')?.textContent?.trim()).toBe('Defective');
    expect(defective.querySelector('.defect-note')?.textContent?.trim()).toBe('Damage: Motor 3 dreht nicht (Group 3)');
    expect(defective.querySelector('button.repair')).not.toBeNull();
    expect(defective.querySelector('button.report')).toBeNull();
    expect(row(fixture, 'TELLO-07').querySelector('button.report')).toBeNull();
    expect(row(fixture, 'TELLO-09').querySelector('button.report')).not.toBeNull();
  });

  it('filters by Defective', async () => {
    const fixture = await dronePage();
    const element = fixture.nativeElement as HTMLElement;
    const button = Array.from(element.querySelectorAll<HTMLButtonElement>('.segmented button')).find(
      (candidate) => candidate.textContent?.trim() === 'Defective',
    ) as HTMLButtonElement;

    button.click();
    await settle(fixture);

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody tr')?.textContent).toContain('TELLO-08');
  });

  it('reports a defect after the dialog', async () => {
    const fixture = await dronePage();
    (row(fixture, 'TELLO-09').querySelector('button.report') as HTMLButtonElement).click();
    await settle(fixture);
    http.expectOne('/api/student-groups').flush(groups);
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const description = element.querySelector('[role="alertdialog"] textarea') as HTMLTextAreaElement;
    description.value = 'Propeller gebrochen';
    description.dispatchEvent(new Event('input'));
    const group = element.querySelector('[role="alertdialog"] select') as HTMLSelectElement;
    group.value = '3';
    group.dispatchEvent(new Event('change'));
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle(fixture);

    const request = http.expectOne({ method: 'POST', url: '/api/drones/9/defect' });
    expect(request.request.body).toEqual({ description: 'Propeller gebrochen', studentGroupId: 3 });
    request.flush({ ...drones[2], status: 'Defective', defectNote: 'Propeller gebrochen' });
    await settle(fixture);
    http.expectOne('/api/drones').flush(drones);
  });

  it('repairs a drone after the dialog', async () => {
    const fixture = await dronePage();
    (row(fixture, 'TELLO-08').querySelector('button.repair') as HTMLButtonElement).click();
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]')?.textContent).toContain('Is TELLO-08 repaired?');
    ((fixture.nativeElement as HTMLElement).querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle(fixture);

    http.expectOne({ method: 'POST', url: '/api/drones/8/repair' }).flush({ ...drones[1], status: 'Available', defectNote: null });
    await settle(fixture);
    http.expectOne('/api/drones').flush(drones);
  });

  it('shows the message when a defect cannot be reported', async () => {
    const fixture = await dronePage();
    (row(fixture, 'TELLO-09').querySelector('button.report') as HTMLButtonElement).click();
    await settle(fixture);
    http.expectOne('/api/student-groups').flush(groups);
    await settle(fixture);
    ((fixture.nativeElement as HTMLElement).querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle(fixture);

    http
      .expectOne({ method: 'POST', url: '/api/drones/9/defect' })
      .flush({ detail: 'A defect needs a description.' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('A defect needs a description.');
  });

  it('cancelling sends nothing and gives the focus back', async () => {
    const fixture = await dronePage();
    const report = row(fixture, 'TELLO-09').querySelector('button.report') as HTMLButtonElement;
    report.click();
    await settle(fixture);
    http.expectOne('/api/student-groups').flush(groups);
    await settle(fixture);
    ((fixture.nativeElement as HTMLElement).querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle(fixture);

    http.expectNone({ method: 'POST' });
    expect(document.activeElement).toBe(report);
  });

  it('says it in German', async () => {
    TestBed.inject(I18nService).language.set('de');
    const fixture = await dronePage();

    expect(row(fixture, 'TELLO-08').querySelector('.status-defective')?.textContent?.trim()).toBe('Defekt');
    expect(row(fixture, 'TELLO-09').querySelector('button.report')?.textContent).toContain('Schaden melden');
  });

  it('shows missing parts in the history', async () => {
    const loan: Loan = {
      id: 1,
      droneId: 7,
      droneName: 'TELLO-07',
      studentGroupId: 3,
      studentGroupName: 'Group 3',
      batteries: 4,
      propellers: 8,
      loanDate: '2026-08-19',
      returnDate: '2026-08-21',
      status: 'Returned',
      missingBatteries: 1,
      missingPropellers: 0,
    };
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    http.expectOne('/api/loans?status=Returned').flush([loan]);
    await settle(fixture);
    const missing = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.missing')).map((cell) =>
      cell.textContent?.trim(),
    );

    expect(missing).toEqual(['1 missing']);
  });
});
