import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DronesPage } from '../drones/drones-page';

describe('Loading, empty and busy states', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows placeholder strips until the drones arrive, then the empty state', async () => {
    const fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.skeleton')).not.toBeNull();
    expect(element.textContent).not.toContain('No drones yet.');

    TestBed.inject(HttpTestingController).expectOne('/api/drones').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('.skeleton')).toBeNull();
    expect(element.querySelector('.empty svg')).not.toBeNull();
    expect(element.querySelector('.empty')?.textContent).toContain('No drones yet.');
  });

  it('marks the submit button as busy while the drone is saved', async () => {
    const fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/drones').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector('button[type="submit"]') as HTMLButtonElement;

    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.classList.contains('busy')).toBe(true);

    http.expectOne({ method: 'POST', url: '/api/drones' }).flush(
      { detail: 'A drone needs a name.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.classList.contains('busy')).toBe(false);
  });
});
