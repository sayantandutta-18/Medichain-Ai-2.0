import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { Appointments } from '../pages/patient/Appointments.js';
import { Medications } from '../pages/patient/Medications.js';
import { HealthGoals } from '../pages/patient/HealthGoals.js';
import { ActivityFeed } from '../pages/patient/ActivityFeed.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({
    user: { id: 'patient-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.dev', role: 'PATIENT' },
    isAuthenticated: true,
  }),
}));

describe('Checkpoint 14: Features 11–20 Frontend Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Appointments: renders consultations header and scheduled appointments list', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/appointments/doctors')) {
        return Promise.resolve({
          data: {
            doctors: [
              {
                _id: 'doc-1',
                firstName: 'Gregory',
                lastName: 'House',
                email: 'house@princeton.edu',
                licenseNumber: 'MD-12345',
              },
            ],
          },
        });
      }
      if (url.includes('/appointments')) {
        return Promise.resolve({
          data: {
            appointments: [
              {
                _id: 'apt-1',
                doctorId: {
                  _id: 'doc-1',
                  firstName: 'Gregory',
                  lastName: 'House',
                  email: 'house@princeton.edu',
                },
                slotStart: '2026-10-15T10:00:00.000Z',
                slotEnd: '2026-10-15T10:30:00.000Z',
                status: 'SCHEDULED',
                reason: 'Diagnostic follow-up',
                telehealthRoomId: 'medichain-telehealth-apt-1',
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <MemoryRouter>
        <Appointments />
      </MemoryRouter>
    );

    expect(screen.getByText(/Appointments & Telehealth Consultations/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Dr. Gregory House/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnostic follow-up/i)).toBeInTheDocument();
      expect(screen.getByText(/Join Telehealth Room/i)).toBeInTheDocument();
    });
  });

  it('Medications: renders drug interaction screening widget and prescriptions', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/prescriptions')) {
        return Promise.resolve({
          data: {
            prescriptions: [
              {
                _id: 'rx-1',
                medications: [
                  {
                    name: 'Warfarin',
                    dosage: '5mg',
                    frequency: 'Daily',
                    duration: '30 days',
                  },
                ],
                notes: 'Monitor INR levels.',
                createdAt: '2026-10-01T12:00:00Z',
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <MemoryRouter>
        <Medications />
      </MemoryRouter>
    );

    expect(screen.getByText(/Automated Drug-Drug Interaction Checker/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Warfarin/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Request Refill/i).length).toBeGreaterThan(0);
    });
  });

  it('HealthGoals: renders milestone tracking dashboard and dynamic progress', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/goals/progress')) {
        return Promise.resolve({
          data: {
            progress: [
              {
                id: 'goal-1',
                metricType: 'HEART_RATE',
                initialValue: 85,
                currentValue: 70,
                targetValue: 65,
                unit: 'bpm',
                progressPct: 75,
                startDate: '2026-10-01T00:00:00Z',
                targetDate: '2026-11-01T00:00:00Z',
                daysRemaining: 23,
                status: 'IN_PROGRESS',
                notes: 'Cardio endurance training',
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <MemoryRouter>
        <HealthGoals />
      </MemoryRouter>
    );

    expect(screen.getByText(/Health Goals & Milestone Tracking/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/HEART RATE/i)).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText(/23 day\(s\) remaining/i)).toBeInTheDocument();
    });
  });

  it('ActivityFeed: renders authenticated security audit events and status badges', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/activity/feed')) {
        return Promise.resolve({
          data: {
            activities: [
              {
                id: 'audit-1',
                type: 'SECURITY_AUDIT',
                action: 'OFFLINE_PACKAGE_GENERATED',
                timestamp: '2026-10-09T08:00:00Z',
                details: 'Security event logged: OFFLINE PACKAGE GENERATED',
                hash: '1234567890abcdef1234567890abcdef',
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <MemoryRouter>
        <ActivityFeed />
      </MemoryRouter>
    );

    expect(screen.getByText(/Patient Activity & Security Event Feed/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/OFFLINE PACKAGE GENERATED/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/1234567890abcdef1234567890abcdef/i)).toBeInTheDocument();
    });
  });
});
