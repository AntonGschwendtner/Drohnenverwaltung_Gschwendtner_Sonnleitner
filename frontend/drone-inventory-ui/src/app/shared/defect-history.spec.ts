import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DefectReport } from '../api.service';
import { DefectHistory } from './defect-history';

/** Scenarios of the requirement "Damage history" in the interface (REQ-042). */
describe('DefectHistory', () => {
  let http: HttpTestingController;

  const repaired: DefectReport = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    description: 'Propeller gebrochen',
    reportedOn: '2026-08-10',
    repairedOn: '2026-08-12',
  };
  const open: DefectReport = {
    ...repaired,
    id: 2,
    studentGroupId: null,
    studentGroupName: 'Group 4',
    description: 'Motor 3',
    reportedOn: '2026-08-19',
    repairedOn: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function show(kind: 'drone' | 'studentGroup', reports: DefectReport[]): Promise<ComponentFixture<DefectHistory>> {
    const fixture = TestBed.createComponent(DefectHistory);
    fixture.componentRef.setInput('for', kind);
    fixture.componentRef.setInput('id', kind === 'drone' ? 7 : 3);
    fixture.detectChanges();
    const param = kind === 'drone' ? 'droneId' : 'studentGroupId';
    http
      .expectOne((request) => request.url === '/api/defects' && request.params.get(param) === (kind === 'drone' ? '7' : '3'))
      .flush(reports);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: ComponentFixture<DefectHistory>): string[][] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  it('Damage history of a drone', async () => {
    const fixture = await show('drone', [open, repaired]);

    expect(rows(fixture)).toEqual([
      ['Group 4', 'Motor 3', '19.08.2026', 'Open'],
      ['Group 3', 'Propeller gebrochen', '10.08.2026', '12.08.2026'],
    ]);
    // A group that still exists links to its page; a deleted one shows only the name.
    expect((fixture.nativeElement as HTMLElement).querySelector('tbody tr:last-child a')?.getAttribute('href')).toBe('/student-groups/3');
  });

  it('Damage history of a student group shows the drones', async () => {
    const fixture = await show('studentGroup', [repaired]);

    expect(rows(fixture)).toEqual([['TELLO-07', 'Propeller gebrochen', '10.08.2026', '12.08.2026']]);
    expect((fixture.nativeElement as HTMLElement).querySelector('tbody a')?.getAttribute('href')).toBe('/drones/7');
  });

  it('No damage reported', async () => {
    const fixture = await show('drone', []);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No damage has been reported.');
  });

  it('Loads again when the version changes', async () => {
    const fixture = await show('drone', []);

    fixture.componentRef.setInput('version', 1);
    fixture.detectChanges();

    http.expectOne((request) => request.url === '/api/defects').flush([open]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rows(fixture)).toHaveLength(1);
  });
});
