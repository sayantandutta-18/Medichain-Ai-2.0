import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AccessRequest, PopulatedUser } from '../../types/records.js';
import { ConsentBadge } from '../../components/common/Badge.js';
import { CardSkeleton } from '../../components/common/Skeleton.js';
import {
  UserPlus,
  Clock,
  FileText,
  AlertCircle,
  FileQuestion,
  User,
  RefreshCw,
} from 'lucide-react';

export const DoctorRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/access-requests');
      setRequests(res.data.requests || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to retrieve access requests from server. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getPatientName = (patient: PopulatedUser | string) => {
    if (typeof patient === 'object' && patient !== null) {
      if (patient.firstName) return `${patient.firstName} ${patient.lastName || ''}`;
      return patient.email || 'Patient';
    }
    return 'Patient';
  };

  const getPatientId = (patient: PopulatedUser | string) => {
    if (typeof patient === 'object' && patient !== null) {
      return patient._id;
    }
    return String(patient);
  };

  const getExpiryDisplay = (expiresAtStr: string, status: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((expiresAt - now) / (1000 * 60 * 60));

    if (diffHours <= 0) {
      return <span className="text-rose-400 font-medium">Expired</span>;
    }
    if (diffHours < 24) {
      return <span className="text-amber-400 font-medium">Expires in {diffHours}h</span>;
    }
    const days = Math.round(diffHours / 24);
    return (
      <span className={status === 'APPROVED' ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
        Expires in {days} days
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Access Requests</h1>
          <p className="text-sm text-slate-400 mt-1">
            Tracking consent statuses: requested, approved, revoked, and remaining validity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/doctor/request-access"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Request New Access
          </Link>
          <button
            onClick={fetchRequests}
            className="p-2 bg-navy-800 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh Requests"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Requests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4">
            <FileQuestion className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-white">No access requests submitted</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
            You have not requested access to any patient records yet. Request access to begin
            reviewing patient files.
          </p>
          <Link
            to="/doctor/request-access"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Request Patient Access
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {getPatientName(req.patientId)}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Patient ID: {getPatientId(req.patientId)}
                      </p>
                    </div>
                  </div>
                  <ConsentBadge status={req.status} />
                </div>

                <div className="bg-navy-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Stated Clinical Purpose:</span>
                    <p className="text-slate-200 mt-0.5">{req.purpose}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{getExpiryDisplay(req.expiresAt, req.status)}</span>
                    </div>
                    <span className="font-mono text-indigo-300 font-medium">Scope: {req.scope}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Requested on {new Date(req.createdAt).toLocaleDateString()}
                </span>

                {req.status === 'APPROVED' && (
                  <Link
                    to={`/doctor/patients/${getPatientId(req.patientId)}/records`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Records</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
