import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { AuthProvider } from '../context/AuthContext.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { RequestPatientAccess } from '../pages/doctor/RequestPatientAccess.js';
import { DoctorPatientRecords } from '../pages/doctor/DoctorPatientRecords.js';
import { DoctorLayout } from '../components/layout/DoctorLayout.js';

describe('Checkpoint 12 - Doctor Dashboard & Consent-Aware UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Doctor Verification Status Banner', () => {
    it('displays PENDING verification status banner when doctor is unverified', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          user: {
            id: 'doc-1',
            email: 'dr.pending@hospital.dev',
            role: 'DOCTOR',
            isVerified: false,
            verificationStatus: 'PENDING',
          },
        },
      });

      render(
        <AuthProvider>
          <MemoryRouter>
            <DoctorLayout />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Verification Status: PENDING REVIEW/i)).toBeInTheDocument();
      });
    });

    it('displays VERIFIED banner when doctor is fully verified', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          user: {
            id: 'doc-2',
            email: 'dr.verified@hospital.dev',
            role: 'DOCTOR',
            isVerified: true,
            verificationStatus: 'VERIFIED',
          },
        },
      });

      render(
        <AuthProvider>
          <MemoryRouter>
            <DoctorLayout />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Practitioner Verified/i)).toBeInTheDocument();
      });
    });
  });

  describe('Doctor Dashboard & Requests Lifecycle', () => {
    it('renders active patient consents with expiration status and metrics', async () => {
      const mockRequests = [
        {
          _id: 'req-app-1',
          patientId: { _id: 'pat-1', firstName: 'John', lastName: 'Doe', email: 'john@patient.dev' },
          status: 'APPROVED' as const,
          purpose: 'Follow-up on surgical incision',
          scope: 'VIEW',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'req-pend-1',
          patientId: { _id: 'pat-2', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@patient.dev' },
          status: 'PENDING' as const,
          purpose: 'Evaluate lab work for anemia',
          scope: 'VIEW',
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { requests: mockRequests },
      });

      render(
        <MemoryRouter>
          <DoctorDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/Follow-up on surgical incision/i)).toBeInTheDocument();
        expect(screen.getByText(/Expires in 3 days/i)).toBeInTheDocument();
        expect(screen.getByText('View Authorized Records')).toBeInTheDocument();
      });
    });

    it('submits a new patient access request with stated clinical purpose', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          accessRequest: {
            _id: 'req-new-99',
            patientId: 'patient-abc',
            purpose: 'Preoperative cardiac clearance',
            expiresAt: '2026-10-18T10:00:00Z',
          },
        },
      });

      render(
        <MemoryRouter>
          <RequestPatientAccess />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Target Patient User ID/i), {
        target: { value: 'patient-abc' },
      });
      fireEvent.change(screen.getByLabelText(/Clinical Justification & Purpose/i), {
        target: { value: 'Preoperative cardiac clearance' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Send Access Request/i }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/access-requests', {
          patientId: 'patient-abc',
          purpose: 'Preoperative cardiac clearance',
          expiresInHours: 72,
        });
        expect(screen.getByText('Access Request Dispatched')).toBeInTheDocument();
      });
    });
  });

  describe('Doctor Authorized Patient Records — Security Boundaries', () => {
    it('renders records ONLY when API returns 200 and never offers edit or delete actions', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          records: [
            {
              _id: 'rec-doc-1',
              title: 'Thoracic CT Scan',
              type: 'IMAGING',
              status: 'INTEGRITY_VERIFIED',
              sha256: '998877665544',
              sizeBytes: 1048576,
              createdAt: '2026-10-05T00:00:00Z',
              blockchainAnchor: { status: 'ANCHORED', txDigest: '0xtest' },
            },
          ],
        },
      });

      render(
        <MemoryRouter initialEntries={['/doctor/patients/patient-1/records']}>
          <Routes>
            <Route
              path="/doctor/patients/:patientId/records"
              element={<DoctorPatientRecords />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Thoracic CT Scan')).toBeInTheDocument();
        expect(screen.getByText('Download')).toBeInTheDocument();
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });

      // Strict security boundary check: Doctor view must NEVER contain delete or edit buttons
      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/update/i)).not.toBeInTheDocument();
    });

    it('denies and clears records display when backend returns 403 (unauthorized/revoked)', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            message:
              'Unauthorized: Doctor has no active approved consent for this patient',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/doctor/patients/patient-revoked/records']}>
          <Routes>
            <Route
              path="/doctor/patients/:patientId/records"
              element={<DoctorPatientRecords />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText('Access Denied by Central Security Policy')
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Doctor has no active approved consent for this patient/i)
        ).toBeInTheDocument();
      });

      // Unauthorized records must NEVER render
      expect(screen.queryByText('Download')).not.toBeInTheDocument();
      expect(screen.queryByText('Verify')).not.toBeInTheDocument();
    });
  });
});
