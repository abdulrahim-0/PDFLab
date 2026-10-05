import { Component, computed, inject, signal } from '@angular/core';
import type { PdfPermissions } from '../../core/pdf/ops/security';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { PasswordField } from '../../shared/password-field/password-field';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

@Component({
  selector: 'app-protect',
  imports: [FileDropzone, PasswordField, SinglePdfWorkspace, ToolPage],
  templateUrl: './protect.html',
})
export class Protect {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly ownerPassword = signal('');
  protected readonly permissions = signal<PdfPermissions>({
    printing: true,
    copying: true,
    modifying: true,
  });

  protected readonly permissionOptions: readonly { key: keyof PdfPermissions; label: string }[] = [
    { key: 'printing', label: 'Allow printing' },
    { key: 'copying', label: 'Allow copying text and images' },
    { key: 'modifying', label: 'Allow editing' },
  ];

  protected readonly restricted = computed(() =>
    Object.values(this.permissions()).some((allowed) => !allowed),
  );
  protected readonly confirmError = computed(() =>
    this.confirm() && this.confirm() !== this.password() ? 'The passwords don’t match.' : null,
  );
  protected readonly ownerError = computed(() =>
    this.ownerPassword() && this.ownerPassword() === this.password()
      ? 'Use a different password from the one that opens the file.'
      : null,
  );
  protected readonly passwordHint = computed(() =>
    this.password() && this.password().length < 8
      ? 'Tip: longer passwords (8+ characters) are much harder to guess.'
      : '',
  );
  protected readonly ready = computed(
    () =>
      !!this.password() &&
      this.confirm() === this.password() &&
      !this.ownerError() &&
      !this.source.unreadable(),
  );

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected set<T>(setter: (value: T) => void, value: T): void {
    setter(value);
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  protected togglePermission(key: keyof PdfPermissions, allowed: boolean): void {
    this.set(this.permissions.set, { ...this.permissions(), [key]: allowed });
  }

  protected protect(): Promise<void> {
    const file = this.source.file();
    if (!file || !this.ready()) {
      return Promise.resolve();
    }
    const options = {
      userPassword: this.password(),
      ownerPassword: this.restricted() ? this.ownerPassword() || undefined : undefined,
      permissions: this.permissions(),
    };
    return this.run.run((onProgress) => this.pdf.protect(file, options, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.password.set('');
    this.confirm.set('');
    this.ownerPassword.set('');
    this.run.reset();
  }
}
