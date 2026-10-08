import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { Dashboard } from '../pages/patient/Dashboard.js';
import { RecordsList } from '../pages/patient/RecordsList.js';
import { UploadRecord } from '../pages/patient/UploadRecord.js';
import { ConsentRequests } from '../pages/patient/ConsentRequests.js';
import { AuditLogView } from '../pages/patient/AuditLogView.js';

describe('Checkpoint 11 - Patient Dashboard & Real APIs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Patient Dashboard', () => {
    it('displays loading skeleton and then renders real metrics from API', async () => {
      vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
        if (url.includes('/records')) {
          return Promise.resolve({
            data: {
              records: [
                {
                  _id: 'rec-1',
                  title: 'Complete Metabolic Panel',
                  type: 'LAB_REPORT',
                  status: 'INTEGRITY_VERIFIED',
                  sha256: 'abc123hash',
                  sizeBytes: 2048,
                  createdAt: '2026-10-01T10:00:00Z',
                  blockchainAnchor: { status: 'ANCHORED', txDigest: '0x123' },
                },
              ],
              pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
            },
          });
        }
        if (url.includes('/access-requests')) {
          return Promise.resolve({
            data: {
              requests: [
                {
                  _id: 'req-1',
                  status: 'PENDING',
                  purpose: 'Cardiology Review',
                  doctorId: { firstName: 'Alice', lastName: 'Smith' },
                  expiresAt: '2026-10-15T00:00:00Z',
                },
              ],
            },
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Verify stats appear after fetch
      await waitFor(() => {
        expect(screen.getByText('Patient Health Overview')).toBeInTheDocument();
        expect(screen.getByText('Complete Metabolic Panel')).toBeInTheDocument();
        expect(screen.getByText('SHA-256 Verified')).toBeInTheDocument();
        expect(screen.getByText('Sui Anchored')).toBeInTheDocument();
      });
    });

    it('shows educational empty state when 0 records exist', async () => {
      vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
        if (url.includes('/records')) {
          return Promise.resolve({
            data: {
              records: [],
              pagination: { total: 0, page: 1, limit: 5, totalPages: 0 },
            },
          });
        }
        if (url.includes('/access-requests')) {
          return Promise.resolve({ data: { requests: [] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No records found')).toBeInTheDocument();
        expect(
          screen.getByText(/Upload your first report to see your timeline/i)
        ).toBeInTheDocument();
      });
    });

    it('shows controlled error state when API fails, without crashing', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
        response: { data: { message: 'Database connection offline' } },
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Data Fetch Interrupted')).toBeInTheDocument();
        expect(screen.getByText('Database connection offline')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('My Records Page', () => {
    it('renders records list with verification and Sui badges', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          records: [
            {
              _id: 'rec-1',
              title: 'MRI Brain Scan',
              type: 'IMAGING',
              status: 'INTEGRITY_VERIFIED',
              sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
              sizeBytes: 524288,
              createdAt: '2026-10-02T12:00:00Z',
              blockchainAnchor: { status: 'ANCHORED', txDigest: '0xsui123' },
            },
          ],
          pagination: { total: 1, page: 1, limit: 6, totalPages: 1 },
        },
      });

      render(
        <MemoryRouter>
          <RecordsList />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('MRI Brain Scan')).toBeInTheDocument();
        expect(screen.getByText('SHA-256 Verified')).toBeInTheDocument();
        expect(screen.getByText('Sui Anchored')).toBeInTheDocument();
      });
    });

    it('opens integrity verification modal and displays hash match details', async () => {
      const mockRecord = {
        _id: 'rec-verify-1',
        title: 'Lipid Panel',
        type: 'LAB_REPORT' as const,
        status: 'INTEGRITY_VERIFIED' as const,
        sha256: 'a1b2c3d4e5f6',
        sizeBytes: 1024,
        createdAt: '2026-10-02T12:00:00Z',
        blockchainAnchor: { status: 'NOT_ANCHORED' as const },
      };

      vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
        if (url.includes('/records/rec-verify-1/verify')) {
          return Promise.resolve({
            data: {
              recordId: 'rec-verify-1',
              integrityStatus: 'INTEGRITY_VERIFIED',
              storedHash: 'a1b2c3d4e5f6',
              computedHash: 'a1b2c3d4e5f6',
              matches: true,
              blockchainStatus: 'NOT_ANCHORED',
              verifiedAt: '2026-10-08T00:00:00Z',
            },
          });
        }
        return Promise.resolve({
          data: {
            records: [mockRecord],
            pagination: { total: 1, page: 1, limit: 6, totalPages: 1 },
          },
        });
      });

      render(
        <MemoryRouter>
          <RecordsList />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Lipid Panel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText('Cryptographic Hash Validated')).toBeInTheDocument();
        expect(
          screen.getByText(/The re-computed SHA-256 hash matches the database metadata byte-for-byte/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Upload Record Flow', () => {
    it('validates file selection and submits form with progress', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          message: 'Record uploaded and encrypted',
          record: {
            id: 'rec-uploaded-99',
            title: 'Cardiology ECG',
            sha256: 'fedcba0987654321',
          },
        },
      });

      render(
        <MemoryRouter>
          <UploadRecord />
        </MemoryRouter>
      );

      // Create a mock PDF file
      const file = new File(['%PDF-1.4 mock content'], 'ecg-report.pdf', {
        type: 'application/pdf',
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      fireEvent.change(fileInput, { target: { files: [file] } });

      const titleInput = screen.getByLabelText(/Document Title/i);
      fireEvent.change(titleInput, { target: { value: 'Cardiology ECG' } });

      const submitBtn = screen.getByRole('button', { name: /Encrypt & Upload/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/records',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
        expect(screen.getByText('Record Encrypted & Sealed Successfully')).toBeInTheDocument();
        expect(screen.getByText('rec-uploaded-99')).toBeInTheDocument();
      });
    });
  });

  describe('Access Requests & Consent Flow', () => {
    it('renders incoming doctor requests and dispatches approve action', async () => {
      const mockRequest = {
        _id: 'req-doc-1',
        doctorId: { firstName: 'Robert', lastName: 'Chen', email: 'dr.chen@clinic.dev' },
        status: 'PENDING' as const,
        purpose: 'Orthopedic evaluation prior to procedure',
        scope: 'VIEW',
        expiresAt: '2026-10-20T12:00:00Z',
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { requests: [mockRequest] },
      });
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { message: 'Approved successfully' },
      });

      render(
        <MemoryRouter>
          <ConsentRequests />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Robert Chen')).toBeInTheDocument();
        expect(screen.getByText('Orthopedic evaluation prior to procedure')).toBeInTheDocument();
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
      });

      const approveBtn = screen.getByRole('button', { name: /Approve Access/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/access-requests/req-doc-1/approve');
      });
    });
  });

  describe('Privacy & Tamper-Evident Audit Log', () => {
    it('fetches and displays chained audit events', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          logs: [
            {
              _id: 'log-1',
              action: 'RECORD_UPLOADED',
              role: 'PATIENT',
              requestId: 'req-trace-404',
              hash: '9a8b7c6d5e4f3a2b1c',
              createdAt: '2026-10-08T08:00:00Z',
            },
          ],
        },
      });

      render(
        <MemoryRouter>
          <AuditLogView />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('RECORD_UPLOADED')).toBeInTheDocument();
        expect(screen.getByText('req-trace-404')).toBeInTheDocument();
        expect(screen.getByText('Cryptographic Immutability')).toBeInTheDocument();
      });
    });
  });
});
