import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PendingDoctor {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  licenseNumber?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

export const DoctorVerification: React.FC = () => {
  const [doctors, setDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/doctors/pending');
      setDoctors(res.data.doctors || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch pending doctor verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/admin/doctors/${id}/approve`);
      setDoctors((prev) => prev.filter((d) => d._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve doctor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/admin/doctors/${id}/reject`);
      setDoctors((prev) => prev.filter((d) => d._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reject doctor');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-400" />
            Medical Practitioner Verification
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and verify medical license numbers prior to granting patient record request privileges.
          </p>
        </div>
        <button
          onClick={fetchPendingDoctors}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Verification Requests ({doctors.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading pending doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No doctors pending verification at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Practitioner</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">License Number</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Registered</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {doctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      Dr. {doc.firstName ? `${doc.firstName} ${doc.lastName || ''}` : 'Practitioner'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{doc.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-md font-mono text-[11px]">
                        {doc.licenseNumber || 'Not provided'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(doc._id)}
                        disabled={actionLoading === doc._id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(doc._id)}
                        disabled={actionLoading === doc._id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg text-xs transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
