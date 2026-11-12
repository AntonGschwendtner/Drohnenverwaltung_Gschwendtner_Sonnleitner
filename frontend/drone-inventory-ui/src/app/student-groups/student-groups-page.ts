import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, effect, inject, Injector, OnInit, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, readErrorMessage, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-student-groups-page',
  imports: [ConfirmDialog, EmptyState, PageHead, ReactiveFormsModule, SearchField, StripSkeleton],
  template: `
    <app-page-head
      bay="02"
      [kicker]="i18n.t('groups.kicker')"
      [title]="i18n.t('nav.studentGroups')"
      [lede]="i18n.t('groups.lede')"
    />

    <section class="panel" aria-labelledby="new-student-group">
      <h2 id="new-student-group">{{ i18n.t('groups.new') }}</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createStudentGroup()">
        <label>
          {{ i18n.t('field.name') }}
          <input formControlName="name" name="name" autocomplete="off" />
        </label>
        <button type="submit" [disabled]="saving()" [class.busy]="saving()">{{ i18n.t('groups.add') }}</button>
      </form>
    </section>

    @if (loading()) {
      <app-strip-skeleton />
    } @else if (loadErrorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (studentGroups().length === 0) {
      <app-empty-state>{{ i18n.t('groups.empty') }}</app-empty-state>
    } @else {
      <div class="list-tools">
        <app-search-field [label]="i18n.t('search.label')" [placeholder]="i18n.t('groups.searchHint')" [(value)]="search" />
      </div>

      @if (listErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (visibleStudentGroups().length === 0) {
        <app-empty-state>{{ i18n.t('groups.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.name') }}</th>
            <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (studentGroup of visibleStudentGroups(); track studentGroup.id) {
            @if (editingId() === studentGroup.id) {
              <tr class="editing" [formGroup]="editForm">
                <td>
                  <label class="visually-hidden" [for]="'edit-group-' + studentGroup.id">{{ i18n.t('field.name') }}</label>
                  <input [id]="'edit-group-' + studentGroup.id" formControlName="name" name="editName" autocomplete="off" />
                </td>
                <td class="row-actions">
                  <button type="button" class="save" (click)="saveEdit(studentGroup)" [disabled]="busyId() !== null" [class.busy]="busyId() === studentGroup.id">
                    {{ i18n.t('action.save') }}
                  </button>
                  <button type="button" class="quiet" (click)="cancelEdit()">{{ i18n.t('dialog.cancel') }}</button>
                </td>
              </tr>
            } @else {
              <tr [attr.data-group]="studentGroup.id">
                <td>{{ studentGroup.name }}</td>
                <td class="row-actions">
                  <button type="button" class="quiet edit" (click)="startEdit(studentGroup)" [disabled]="busyId() !== null">
                    {{ i18n.t('action.edit') }}<span class="visually-hidden"> {{ studentGroup.name }}</span>
                  </button>
                  <button type="button" class="quiet delete" (click)="askToDelete(studentGroup, $event)" [disabled]="busyId() !== null" [class.busy]="busyId() === studentGroup.id">
                    {{ i18n.t('action.delete') }}<span class="visually-hidden"> {{ studentGroup.name }}</span>
                  </button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      }
    }

    @if (pendingDelete(); as studentGroup) {
      <app-confirm-dialog
        [heading]="i18n.t('groups.deleteTitle', { group: studentGroup.name })"
        [text]="i18n.t('groups.deleteText', { group: studentGroup.name })"
        [confirmLabel]="i18n.t('action.delete')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmDelete()"
        (cancelled)="cancelDelete()"
      />
    }
  `,
})
export class StudentGroupsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly i18n = inject(I18nService);

  protected readonly form = inject(FormBuilder).nonNullable.group({ name: '' });

  protected readonly editForm = inject(FormBuilder).nonNullable.group({ name: '' });

  protected readonly studentGroups = signal<StudentGroup[]>([]);
  /** Edit and delete work on one strip at a time (REQ-017). */
  protected readonly editingId = signal<number | null>(null);
  protected readonly busyId = signal<number | null>(null);
  protected readonly pendingDelete = signal<StudentGroup | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);
  private deleteTrigger: HTMLElement | null = null;
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);

  /** The search narrows the loaded list in the browser (REQ-011). */
  protected readonly search = signal('');
  protected readonly visibleStudentGroups = computed(() =>
    this.studentGroups().filter((studentGroup) => matchesSearch(studentGroup.name, this.search())),
  );

  constructor() {
    // A new search closes an open edit, so no hidden strip stays in edit mode.
    effect(() => {
      this.search();
      untracked(() => this.editingId.set(null));
    });
  }

  ngOnInit(): void {
    this.loadStudentGroups();
  }

  protected loadStudentGroups(): void {
    this.api.listStudentGroups().subscribe({
      next: (studentGroups) => {
        this.studentGroups.set(studentGroups);
        this.loadErrorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  // The backend checks the name, so the form sends what was entered and shows its answer.
  protected createStudentGroup(): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveErrorMessage.set(null);

    this.api.createStudentGroup(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.loadStudentGroups();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected startEdit(studentGroup: StudentGroup): void {
    this.listErrorMessage.set(null);
    this.editForm.setValue({ name: studentGroup.name });
    this.editingId.set(studentGroup.id);
    this.focusAfterRender(`#edit-group-${studentGroup.id}`);
  }

  protected cancelEdit(): void {
    const id = this.editingId();
    this.editingId.set(null);
    this.listErrorMessage.set(null);
    this.focusAfterRender(`[data-group="${id}"] button.edit`);
  }

  /** Keeps the keyboard focus where the user works, also when the strip turns into a form and back. */
  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.document.querySelector<HTMLElement>(selector)?.focus(), { injector: this.injector });
  }

  // The backend checks the name, so the edit sends what was entered and shows its answer.
  protected saveEdit(studentGroup: StudentGroup): void {
    if (this.busyId() !== null) {
      return;
    }

    this.busyId.set(studentGroup.id);
    this.listErrorMessage.set(null);

    this.api.updateStudentGroup(studentGroup.id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.editingId.set(null);
        this.loadStudentGroups();
        this.focusAfterRender(`[data-group="${studentGroup.id}"] button.edit`);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected askToDelete(studentGroup: StudentGroup, event: Event): void {
    if (this.busyId() !== null) {
      return;
    }

    this.deleteTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingDelete.set(studentGroup);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
    this.deleteTrigger?.focus();
    this.deleteTrigger = null;
  }

  // The backend refuses groups with loans; the page shows its message.
  protected confirmDelete(): void {
    const studentGroup = this.pendingDelete();
    this.pendingDelete.set(null);
    this.deleteTrigger = null;
    if (!studentGroup) {
      return;
    }

    this.busyId.set(studentGroup.id);
    this.listErrorMessage.set(null);

    this.api.deleteStudentGroup(studentGroup.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadStudentGroups();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
}
