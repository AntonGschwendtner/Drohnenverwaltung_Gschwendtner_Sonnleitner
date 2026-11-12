import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * A modal question with Cancel and Confirm. Cancel has the focus first, so Enter does not confirm by
 * accident. Escape and a click next to the dialog cancel. Tab stays inside the dialog.
 */
@Component({
  selector: 'app-confirm-dialog',
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="dialog-backdrop" (click)="cancelled.emit()"></div>
    <div
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-text"
    >
      <h2 id="confirm-dialog-title">{{ heading() }}</h2>
      <p id="confirm-dialog-text">{{ text() }}</p>
      <div class="dialog-actions">
        <button #cancelButton type="button" class="dialog-cancel" (click)="cancelled.emit()">{{ cancelLabel() }}</button>
        <button #confirmButton type="button" class="dialog-confirm" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly confirmButton = viewChild.required<ElementRef<HTMLButtonElement>>('confirmButton');

  constructor() {
    afterNextRender(() => this.cancelButton().nativeElement.focus());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelled.emit();
      return;
    }

    if (event.key === 'Tab') {
      // Two buttons: Tab and Shift+Tab move between them and never leave the dialog.
      event.preventDefault();
      const cancel = this.cancelButton().nativeElement;
      const confirm = this.confirmButton().nativeElement;
      (document.activeElement === cancel ? confirm : cancel).focus();
    }
  }
}
