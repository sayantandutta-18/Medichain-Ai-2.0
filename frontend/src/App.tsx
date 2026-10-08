import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ProtectedRoute } from './routes/ProtectedRoute.js';
import { PatientLayout } from './components/layout/PatientLayout.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { Dashboard } from './pages/patient/Dashboard.js';
import { RecordsList } from './pages/patient/RecordsList.js';
import { UploadRecord } from './pages/patient/UploadRecord.js';
import { ConsentRequests } from './pages/patient/ConsentRequests.js';
import { AuditLogView } from './pages/patient/AuditLogView.js';
import { EmergencyCard } from './pages/patient/EmergencyCard.js';
import { Appointments } from './pages/patient/Appointments.js';
import { Medications } from './pages/patient/Medications.js';
import { NotFound } from './pages/NotFound.js';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Patient Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <PatientLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/records" element={<RecordsList />} />
              <Route path="/upload" element={<UploadRecord />} />
              <Route path="/requests" element={<ConsentRequests />} />
              <Route path="/audit" element={<AuditLogView />} />
              <Route path="/emergency" element={<EmergencyCard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/medications" element={<Medications />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
