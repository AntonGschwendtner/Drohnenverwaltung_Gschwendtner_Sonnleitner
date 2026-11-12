import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../api.service';
import { DronesPage } from './drones-page';

/** Scenarios of the requirement "Drone status overview" (REQ-014). */
describe('DronesPage status overview', () => {
  let fixture: ComponentFixture<DronesPage>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function respondWith(drones: Drone[]): Promise<void> {
    TestBed.inject(HttpTestingController).expectOne('/api/drones').flush(drones);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function overview(): Record<string, string> {
    return Object.fromEntries(
      Array.from(element.querySelectorAll('.overview-tile')).map((tile) => [
        tile.querySelector('dt')?.textContent?.trim() ?? '',
        tile.querySelector('dd')?.textContent?.trim() ?? '',
      ]),
    );
  }

  const threeDrones: Drone[] = [
    { id: 1, name: 'TELLO-07', status: 'Loaned', description: '' },
    { id: 2, name: 'TELLO-08', status: 'Available', description: '' },
    { id: 3, name: 'MAVIC-02', status: 'Available', description: '' },
  ];

  it('Overview after a loan', async () => {
    await respondWith(threeDrones);

    expect(overview()).toEqual({ Drones: '3', Available: '2', Loaned: '1' });
  });

  it('Overview ignores the search', async () => {
    await respondWith(threeDrones);
    const input = element.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mavic';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(overview()).toEqual({ Drones: '3', Available: '2', Loaned: '1' });
  });

  it('is hidden while the drones load and when they cannot be loaded', async () => {
    expect(element.querySelector('.overview')).toBeNull();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/drones')
      .flush({ detail: 'The database is not reachable.' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('.overview')).toBeNull();
  });
});
