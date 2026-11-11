import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../api.service';
import { DronesPage } from './drones-page';

describe('DronesPage', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function respondWith(drones: Drone[]): Promise<void> {
    http.expectOne('/api/drones').flush(drones);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rows(): string[][] {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  it('shows name, status and description of each drone', async () => {
    await respondWith([
      { id: 1, name: 'TELLO-07', status: 'Available', description: 'SSID: TELLO-9FA21B' },
      { id: 2, name: 'TELLO-08', status: 'Loaned', description: 'Spare drone' },
    ]);

    expect(rows()).toEqual([
      ['TELLO-07', 'Available', 'SSID: TELLO-9FA21B'],
      ['TELLO-08', 'Loaned', 'Spare drone'],
    ]);
  });

  it('shows Available and Loaned as the backend reports them', async () => {
    await respondWith([
      { id: 1, name: 'TELLO-07', status: 'Loaned', description: '' },
    ]);

    expect(rows()[0][1]).toBe('Loaned');
  });

  it('says when there are no drones', async () => {
    await respondWith([]);

    expect(fixture.nativeElement.textContent).toContain('No drones yet.');
  });

  it('shows the message when the list cannot be loaded', async () => {
    http.expectOne('/api/drones').flush(
      { detail: 'The database is not reachable.' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'The database is not reachable.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No drones yet.');
  });
});
