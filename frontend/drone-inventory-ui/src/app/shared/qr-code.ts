import { Component, computed, input } from '@angular/core';
import { create } from 'qrcode';

/**
 * A QR code drawn as SVG from the module matrix of the qrcode package (REQ-026). Drawing the squares in the
 * template keeps Angular's sanitizer happy and works without a canvas.
 */
@Component({
  selector: 'app-qr-code',
  template: `
    <svg class="qr" [attr.viewBox]="viewBox()" role="img" [attr.aria-label]="label()" shape-rendering="crispEdges">
      <rect [attr.width]="size() + 8" [attr.height]="size() + 8" fill="#ffffff" />
      <path [attr.d]="path()" fill="#000000" />
    </svg>
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly label = input.required<string>();

  private readonly modules = computed(() => create(this.value(), { errorCorrectionLevel: 'M' }).modules);
  protected readonly size = computed(() => this.modules().size);
  // Four modules of quiet zone around the code, as scanners expect.
  protected readonly viewBox = computed(() => `0 0 ${this.size() + 8} ${this.size() + 8}`);
  protected readonly path = computed(() => {
    const { size, data } = this.modules();
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (data[row * size + column]) {
          path += `M${column + 4} ${row + 4}h1v1h-1z`;
        }
      }
    }
    return path;
  });
}
