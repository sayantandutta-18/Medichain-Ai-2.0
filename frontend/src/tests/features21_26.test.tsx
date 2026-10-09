import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { VoiceAssistantModal } from '../components/common/VoiceAssistantModal.js';
import { SecuritySettings } from '../pages/patient/SecuritySettings.js';
import { EmergencyCard } from '../pages/patient/EmergencyCard.js';
import { RecordsList } from '../pages/patient/RecordsList.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({
    user: { id: 'patient-21', firstName: 'Diana', lastName: 'Prince', email: 'diana@test.dev', role: 'PATIENT' },
    isAuthenticated: true,
  }),
}));

describe('Checkpoint 15: Features 21–26 & Voice Assistant Frontend Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Voice AI Assistant Component Test
  it('VoiceAssistantModal: displays preview guardrail and requires explicit confirmation for actions modifying data', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        status: 'SUCCESS',
        intent: {
          intent: 'SCHEDULE_APPOINTMENT',
          naturalLanguageSummary: 'Schedule appointment consultation with Dr. McCoy tomorrow',
          requiresConfirmation: true,
          previewData: { doctor: 'Dr. McCoy', date: 'tomorrow' },
          disclaimer: 'AI voice preview. Not a diagnostic tool.',
        },
      },
    });

    render(
      <MemoryRouter>
        <VoiceAssistantModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByText('AI Voice Health Assistant')).toBeInTheDocument();
    expect(screen.getByText('Voice Command Preview Guardrail')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Schedule an appointment/i);
    fireEvent.change(input, { target: { value: 'Schedule appointment with Dr McCoy' } });

    const parseBtn = screen.getByRole('button', { name: /Parse/i });
    fireEvent.click(parseBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirmation Required/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm & Execute Action/i)).toBeInTheDocument();
    });
  });

  // Feature 24 & 26: Security & Webhooks Settings Test
  it('SecuritySettings: displays active device sessions and medical event webhooks', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/auth/sessions')) {
        return Promise.resolve({
          data: {
            sessions: [
              {
                sessionId: 'sess-1',
                deviceType: 'Desktop',
                userAgent: 'Mozilla/5.0 Chrome/115',
                ip: '192.168.1.10',
                lastActive: new Date().toISOString(),
                revoked: false,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (url.includes('/webhooks')) {
        return Promise.resolve({
          data: {
            subscriptions: [
              {
                id: 'sub-1',
                url: 'https://health-subscriber.org/webhook',
                maskedSecret: 'whsec_a1...9b2c',
                events: ['RECORD_CREATED', 'CONSENT_APPROVED'],
                active: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <SecuritySettings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Active Device Sessions/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Medical Event Webhooks/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Desktop/i)).toBeInTheDocument();
      expect(screen.getByText('https://health-subscriber.org/webhook')).toBeInTheDocument();
    });
  });

  // Feature 21: Emergency Card with SVG QR Code
  it('EmergencyCard: displays QR preview button and opens SVG modal', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/emergency/card')) {
        return Promise.resolve({
          data: {
            card: {
              bloodGroup: 'O+',
              allergies: ['Penicillin'],
              emergencyContacts: [{ name: 'Steve Trevor', relationship: 'Partner', phoneNumber: '555-0199' }],
              conditionsSummary: 'None',
            },
            emergencyToken: 'emergency-token-21',
          },
        });
      }
      if (url.includes('/emergency/qr')) {
        return Promise.resolve({
          data: {
            status: 'SUCCESS',
            svg: '<svg viewBox="0 0 300 300"><rect width="300" height="300"/></svg>',
            dataUrl: 'data:image/svg+xml;utf8,<svg></svg>',
          },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <EmergencyCard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('EMERGENCY HEALTH CARD')).toBeInTheDocument();
      expect(screen.getByText('View QR')).toBeInTheDocument();
    });

    const qrBtn = screen.getByTitle(/Click to view full emergency QR Code/i);
    fireEvent.click(qrBtn);

    await waitFor(() => {
      expect(screen.getByText(/Emergency Responder QR Code/i)).toBeInTheDocument();
      expect(screen.getByText('Download SVG')).toBeInTheDocument();
    });
  });

  // Feature 22 & 25: RecordsList Translation & Dossier Export
  it('RecordsList: displays Export Dossier button and Translate option on record cards', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/records')) {
        return Promise.resolve({
          data: {
            records: [
              {
                _id: 'rec-21',
                title: 'Comprehensive Blood Count',
                type: 'LAB_REPORT',
                status: 'FINAL',
                sha256: 'a1b2c3d4e5f6',
                blockchainAnchor: { status: 'ANCHORED', txDigest: '0xabc123' },
                currentVersion: 1,
                createdAt: new Date().toISOString(),
              },
            ],
            totalPages: 1,
            totalRecords: 1,
          },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <RecordsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Dossier')).toBeInTheDocument();
      expect(screen.getByText('Translate (AI)')).toBeInTheDocument();
    });
  });
});
