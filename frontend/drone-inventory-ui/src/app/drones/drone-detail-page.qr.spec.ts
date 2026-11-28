import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { create } from 'qrcode';
import { vi } from 'vitest';
import { routes } from '../app.routes';
import { DroneDetailPage } from './drone-detail-page';

/** Scenarios of the requirement "Drone QR code" (REQ-026). */
describe('DroneDetailPage QR label', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.match((request) => request.url === '/api/defects').filter((request) => !request.cancelled).forEach((request) => request.flush([]));
    http.verify();
    vi.restoreAllMocks();
  });

  async function open(): Promise<HTMLElement> {
    await harness.navigateByUrl('/drones/7', DroneDetailPage);
    http.expectOne('/api/drones/7').flush({ id: 7, name: 'TELLO-07', status: 'Available', description: '' });
    http.expectOne((request) => request.url === '/api/loans' && request.params.get('droneId') === '7').flush([]);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  /** The squares a scanner reads for this text, built the same way as the component draws them. */
  function expectedPath(text: string): string {
    const { size, data } = create(text, { errorCorrectionLevel: 'M' }).modules;
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (data[row * size + column]) {
          path += `M${column + 4} ${row + 4}h1v1h-1z`;
        }
      }
    }
    return path;
  }

  it('Show the QR code', async () => {
    const element = await open();
    const label = element.querySelector('section[aria-labelledby="drone-qr"]') as HTMLElement;
    const svg = label.querySelector('svg[role="img"]') as SVGElement;

    expect(svg.getAttribute('aria-label')).toBe('QR code that opens the loan of TELLO-07');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe(expectedPath(`${location.origin}/loans?drone=7`));
    expect(label.querySelector('.qr-name')?.textContent?.trim()).toBe('TELLO-07');
  });

  it('Print a label', async () => {
    const element = await open();
    const document = TestBed.inject(DOCUMENT);
    let classDuringPrint = false;
    vi.spyOn(window, 'print').mockImplementation(() => {
      classDuringPrint = document.body.classList.contains('printing-label');
    });

    (element.querySelector('.label-button') as HTMLButtonElement).click();

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(classDuringPrint).toBe(true);

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('printing-label')).toBe(false);
  });
});
