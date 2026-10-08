import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export const RequestPatientAccess: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72); // Default 3 days

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    id: string;
    patientId: string;
    expiresAt: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) {
      setErrorMessage('Please provide a valid Patient ID.');
      return;
    }
    if (purpose.trim().length < 5) {
      setErrorMessage('Please state a detailed clinical justification (minimum 5 characters).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/access-requests', {
        patientId: patientId.trim(),
        purpose: purpose.trim(),
        expiresInHours,
      });

      const accessRequest = res.data.accessRequest || res.data;
      setSuccessData({
        id: accessRequest._id,
        patientId: patientId.trim(),
        expiresAt: accessRequest.expiresAt,
      });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit access request. Verify Patient ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientId('');
    setPurpose('');
    setExpiresInHours(72);
    setSuccessData(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Request Patient Record Access</h1>
        <p className="text-sm text-slate-400 mt-1">
          Access requests require mandatory clinical purpose disclosure and explicit patient consent.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-start gap-3 text-xs text-indigo-200">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-indigo-300">Consent-First Architecture</p>
          <p className="text-indigo-200/90 mt-0.5">
            Doctors cannot view patient records without active consent. All requests are logged in the
            tamper-evident cryptographic audit chain.
          </p>
        </div>
      </div>

      {successData ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-white">Access Request Dispatched</h2>
              <p className="text-xs text-emerald-200/90 mt-1">
                The access request has been transmitted to the patient. It will appear on their
                consent portal for review and approval.
              </p>
              <div className="mt-3 bg-navy-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <p className="text-slate-400">
                  Request ID: <span className="text-slate-200">{successData.id}</span>
                </p>
                <p className="text-slate-400">
                  Target Patient: <span className="text-teal-300">{successData.patientId}</span>
                </p>
                <p className="text-slate-400">
                  Expires: <span className="text-slate-200">{new Date(successData.expiresAt).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/doctor/requests"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <span>View in Access Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-navy-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-navy-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="patient-id" className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Patient User ID *
            </label>
            <input
              id="patient-id"
              type="text"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. 64b8f... (Patient's MongoDB ObjectId)"
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Obtained directly from the patient or clinical intake barcode.
            </p>
          </div>

          <div>
            <label htmlFor="request-purpose" className="block text-xs font-medium text-slate-300 mb-1.5">
              Clinical Justification & Purpose *
            </label>
            <textarea
              id="request-purpose"
              required
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Consultation regarding persistent acute thoracic pain and evaluation of prior pulmonary imaging."
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="request-duration" className="block text-xs font-medium text-slate-300 mb-1.5">
              Requested Consent Duration
            </label>
            <select
              id="request-duration"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={24}>24 Hours (1 Day — Urgent Review)</option>
              <option value={48}>48 Hours (2 Days)</option>
              <option value={72}>72 Hours (3 Days — Standard)</option>
              <option value={168}>168 Hours (7 Days — Treatment Cycle)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/40 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Submitting Request...' : 'Send Access Request'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
