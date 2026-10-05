import { PDFDocument } from '@cantoo/pdf-lib';
import { protectPdf, unlockPdf } from './security';
import { makeEncryptedPdf, makePdf } from './testing';

const allowAll = { printing: true, copying: true, modifying: true };

describe('protectPdf', () => {
  it('encrypts so the file only opens with the password', async () => {
    const output = await protectPdf(
      { name: 'contract.pdf', data: await makePdf(100, 200) },
      { userPassword: 'open-sesame', permissions: allowAll },
    );
    expect(output.filename).toBe('contract-protected.pdf');

    const locked = await PDFDocument.load(output.data, { ignoreEncryption: true });
    expect(locked.isEncrypted).toBe(true);
    await expect(PDFDocument.load(output.data, { password: 'nope' })).rejects.toThrow();
    const opened = await PDFDocument.load(output.data, { password: 'open-sesame' });
    expect(opened.getPageCount()).toBe(2);
  });

  it('accepts restrictions with or without an owner password', async () => {
    const data = await makePdf(100);
    const restricted = { printing: false, copying: false, modifying: true };
    for (const ownerPassword of [undefined, 'boss']) {
      const output = await protectPdf(
        { name: 'a.pdf', data: data.slice() },
        { userPassword: 'pw', ownerPassword, permissions: restricted },
      );
      const opened = await PDFDocument.load(output.data, { password: 'pw' });
      expect(opened.getPageCount()).toBe(1);
    }
  });

  it('refuses an empty password and already-protected files', async () => {
    await expect(
      protectPdf(
        { name: 'a.pdf', data: await makePdf(100) },
        { userPassword: '', permissions: allowAll },
      ),
    ).rejects.toThrow('Enter a password.');
    await expect(
      protectPdf(
        { name: 'locked.pdf', data: await makeEncryptedPdf() },
        { userPassword: 'x', permissions: allowAll },
      ),
    ).rejects.toMatchObject({ code: 'encrypted' });
  });
});

describe('unlockPdf', () => {
  it('removes the password with the right one', async () => {
    const output = await unlockPdf(
      { name: 'locked.pdf', data: await makeEncryptedPdf('s3cret') },
      's3cret',
    );
    expect(output.filename).toBe('locked-unlocked.pdf');
    const doc = await PDFDocument.load(output.data);
    expect(doc.isEncrypted).toBe(false);
    expect(doc.getPageCount()).toBe(1);

    // No leftovers from the encrypted original: one fresh XRef stream, no /Encrypt.
    const text = new TextDecoder('latin1').decode(output.data);
    expect(text.match(/\/Type \/XRef/g)).toHaveLength(1);
    expect(text).not.toContain('/Encrypt');
  });

  it('round-trips with protectPdf', async () => {
    const locked = await protectPdf(
      { name: 'a.pdf', data: await makePdf(100, 200, 300) },
      { userPassword: 'pw', permissions: { printing: false, copying: false, modifying: false } },
    );
    const unlocked = await unlockPdf({ name: 'a.pdf', data: locked.data }, 'pw');
    expect((await PDFDocument.load(unlocked.data)).getPageCount()).toBe(3);
  });

  it('explains wrong, missing and unnecessary passwords', async () => {
    const locked = await makeEncryptedPdf('right');
    await expect(unlockPdf({ name: 'x.pdf', data: locked.slice() }, 'wrong')).rejects.toMatchObject(
      {
        code: 'wrong-password',
        message: 'That password doesn’t open “x.pdf”.',
      },
    );
    await expect(unlockPdf({ name: 'x.pdf', data: locked.slice() }, '')).rejects.toThrow(
      '“x.pdf” needs its password to open.',
    );
    await expect(unlockPdf({ name: 'plain.pdf', data: await makePdf(100) }, '')).rejects.toThrow(
      '“plain.pdf” isn’t password-protected.',
    );
  });

  it('lifts restrictions from files that open without a password', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.encrypt({ userPassword: '', ownerPassword: 'owner', permissions: { printing: false } });
    const output = await unlockPdf({ name: 'r.pdf', data: await doc.save() }, '');
    expect((await PDFDocument.load(output.data)).isEncrypted).toBe(false);
  });
});
