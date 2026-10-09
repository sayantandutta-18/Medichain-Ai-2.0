import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ProtectedRoute } from './routes/ProtectedRoute.js';
import { RoleRoute } from './routes/RoleRoute.js';
import { PatientLayout } from './components/layout/PatientLayout.js';
import { DoctorLayout } from './components/layout/DoctorLayout.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';

// Patient Pages
import { Dashboard as PatientDashboard } from './pages/patient/Dashboard.js';
import { RecordsList } from './pages/patient/RecordsList.js';
import { MedicalTimeline } from './pages/patient/MedicalTimeline.js';
import { HealthAnalytics } from './pages/patient/HealthAnalytics.js';
import { UploadRecord } from './pages/patient/UploadRecord.js';
import { ConsentRequests } from './pages/patient/ConsentRequests.js';
import { AuditLogView } from './pages/patient/AuditLogView.js';
import { EmergencyCard } from './pages/patient/EmergencyCard.js';
import { Appointments } from './pages/patient/Appointments.js';
import { Medications } from './pages/patient/Medications.js';

// Common Pages
import { BlockchainExplorer } from './pages/common/BlockchainExplorer.js';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { DoctorRequests } from './pages/doctor/DoctorRequests.js';
import { RequestPatientAccess } from './pages/doctor/RequestPatientAccess.js';
import { DoctorPatientRecords } from './pages/doctor/DoctorPatientRecords.js';
import { DoctorAuditLog } from './pages/doctor/DoctorAuditLog.js';

// Admin Pages
import { DoctorVerification } from './pages/admin/DoctorVerification.js';

// Public Unauthenticated Pages
import { PublicEmergencyView } from './pages/public/PublicEmergencyView.js';
import { PublicShareView } from './pages/public/PublicShareView.js';

import { NotFound } from './pages/NotFound.js';

const HomeRouter: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'DOCTOR') {
    return <Navigate to="/doctor" replace />;
  }
  return <PatientDashboard />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public Unauthenticated Viewer Routes (Feature 03 & 04) */}
            <Route path="/emergency/:token" element={<PublicEmergencyView />} />
            <Route path="/share/:token" element={<PublicShareView />} />

            {/* Authenticated Patient Portal */}
            <Route
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <PatientLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRouter />} />
              <Route path="/records" element={<RecordsList />} />
              <Route path="/timeline" element={<MedicalTimeline />} />
              <Route path="/analytics" element={<HealthAnalytics />} />
              <Route path="/explorer" element={<BlockchainExplorer />} />
              <Route path="/upload" element={<UploadRecord />} />
              <Route path="/requests" element={<ConsentRequests />} />
              <Route path="/audit" element={<AuditLogView />} />
              <Route path="/emergency" element={<EmergencyCard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/medications" element={<Medications />} />
            </Route>

            {/* Authenticated Doctor Portal */}
            <Route
              path="/doctor"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['DOCTOR']}>
                    <DoctorLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<DoctorDashboard />} />
              <Route path="requests" element={<DoctorRequests />} />
              <Route path="request-access" element={<RequestPatientAccess />} />
              <Route path="patients/:patientId/records" element={<DoctorPatientRecords />} />
              <Route path="explorer" element={<BlockchainExplorer />} />
              <Route path="audit" element={<DoctorAuditLog />} />
            </Route>

            {/* Admin Doctor Verification Route (Feature 01) */}
            <Route
              path="/admin/doctors"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <div className="min-h-screen bg-navy-950 p-6 md:p-8">
                      <DoctorVerification />
                    </div>
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
