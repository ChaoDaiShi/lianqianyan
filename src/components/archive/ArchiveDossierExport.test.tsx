// @vitest-environment jsdom

import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArchiveDossierExport, type ArchiveDossierSnapshot } from './ArchiveDossierExport';

const snapshot: ArchiveDossierSnapshot = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  courseName: '数据结构',
  overview: { answeredQuestionCount: 12, submittedExamCount: 2, overallMastery: 0.72 },
  evidence: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('ArchiveDossierExport', () => {
  it('downloads the exact signed receipt rendered by the print report', async () => {
    vi.stubGlobal('crypto', webcrypto);
    let downloadedBlob: Blob | null = null;
    let downloadedFilename = '';
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return 'blob:dossier-receipt';
      }),
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(<ArchiveDossierExport snapshot={snapshot} />);
    fireEvent.click(screen.getByRole('button', { name: '打印 / 保存 PDF' }));

    await waitFor(() => {
      expect(anchorClick).toHaveBeenCalledOnce();
      expect(print).toHaveBeenCalledOnce();
    });
    expect(downloadedBlob).not.toBeNull();
    const receipt = JSON.parse(await readBlob(downloadedBlob!));
    const signedPayload = JSON.parse(receipt.signedData);

    expect(receipt.algorithm).toBe(screen.getByTestId('archive-print-algorithm').textContent);
    expect(receipt.publicKey).toEqual(JSON.parse(screen.getByTestId('archive-print-public-key').textContent!));
    expect(receipt.signature).toBe(screen.getByTestId('archive-print-signature').textContent);
    expect(receipt.signedData).toBe(screen.getByTestId('archive-print-signed-data').textContent);
    expect(receipt.publicKeyFingerprint).toBe(screen.getByTestId('archive-print-fingerprint').textContent);
    expect(signedPayload).toEqual({ ...snapshot, generatedAt: signedPayload.generatedAt });
    expect(screen.getByTestId('archive-print-receipt-id').textContent).toBe(`${receipt.publicKeyFingerprint} · ${signedPayload.generatedAt}`);
    expect(downloadedFilename).toContain(signedPayload.generatedAt.replace(/[:.]/g, '-'));
    expect(downloadedFilename).toContain(receipt.publicKeyFingerprint.replace(/:/g, '-'));
    expect(screen.getByTestId('archive-print-algorithm').textContent).toBe('ECDSA-P256-SHA256');
    expect(screen.getAllByText(/SHA-256:/).length).toBeGreaterThan(0);
    expect(screen.getByText(/签名对应 JSON 摘要/)).not.toBeNull();
  });
});
