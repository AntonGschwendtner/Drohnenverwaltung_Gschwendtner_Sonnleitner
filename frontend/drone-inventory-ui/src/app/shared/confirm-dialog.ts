import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * A modal question with Cancel and Confirm. Content between the tags, such as form fields, sits above the
 * buttons. Cancel has the focus first, so Enter does not confirm by accident. Escape and a click next to the
 * dialog cancel. Tab and Shift+Tab move through the fields and buttons and never leave the dialog.
 */
@Component({
  selector: 'app-confirm-dialog',
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="dialog-backdrop" (click)="cancelled.emit()"></div>
    <div
      #dialog
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-text"
    >
      <h2 id="confirm-dialog-title">{{ heading() }}</h2>
      <p id="confirm-dialog-text">{{ text() }}</p>
      <ng-content />
      <div class="dialog-actions">
        <button #cancelButton type="button" class="dialog-cancel" (click)="cancelled.emit()">{{ cancelLabel() }}</button>
        <button type="button" class="dialog-confirm" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
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
  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

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
      // Tab and Shift+Tab move through the fields and buttons of the dialog and wrap around.
      event.preventDefault();
      const focusable = Array.from(
        this.dialog().nativeElement.querySelectorAll<HTMLElement>('input, select, textarea, button'),
      ).filter((element) => !element.hasAttribute('disabled'));
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      const next = (current + step + focusable.length) % focusable.length;
      focusable[current === -1 ? 0 : next]?.focus();
    }
  }
}
