import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AccessRequest, PopulatedUser } from '../../types/records.js';
import { ConsentBadge } from '../../components/common/Badge.js';
import { CardSkeleton, Skeleton } from '../../components/common/Skeleton.js';
import {
  UserCheck,
  UserPlus,
  Clock,
  FileText,
  ArrowRight,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/access-requests');
      setRequests(res.data.requests || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to retrieve access requests. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
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

  const getTimeRemaining = (expiresAtStr: string, status: string) => {
    if (status !== 'APPROVED') return null;
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((expiresAt - now) / (1000 * 60 * 60));

    if (diffHours <= 0) {
      return <span className="text-rose-400 font-semibold">Expired</span>;
    }
    if (diffHours < 24) {
      return <span className="text-amber-400 font-medium">Expires in {diffHours}h</span>;
    }
    const days = Math.round(diffHours / 24);
    return <span className="text-emerald-400 font-medium">Expires in {days} days</span>;
  };

  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const revokedOrRejected = requests.filter(
    (r) => r.status === 'REVOKED' || r.status === 'REJECTED'
  );

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Practice Hub</h1>
          <p className="text-sm text-slate-400 mt-1">
            Consent-governed patient access with server-side authorization enforcement.
          </p>
        </div>
        <Link
          to="/doctor/request-access"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/40 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Request Patient Access
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Active Approved Consents</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400 mt-1">{approvedRequests.length}</p>
            )}
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Pending Consent Requests</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-amber-400 mt-1">{pendingRequests.length}</p>
            )}
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Revoked / Expired Consents</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-slate-300 mt-1">{revokedOrRejected.length}</p>
            )}
          </div>
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDoctorData}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-900/60 rounded-lg text-xs font-medium text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Active Patients Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Active Patient Consents</h2>
          <Link
            to="/doctor/requests"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>All Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : approvedRequests.length === 0 ? (
          <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4">
              <FileQuestion className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white">No active patient consents</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
              You currently do not have any patient-approved access grants. Request access with a
              stated clinical purpose to review patient records.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedRequests.map((req) => (
              <div
                key={req._id}
                className="bg-navy-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-colors shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {getPatientName(req.patientId)}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {getPatientId(req.patientId).substring(0, 12)}...
                    </p>
                  </div>
                  <ConsentBadge status={req.status} />
                </div>

                <div className="bg-navy-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <span className="text-slate-400 block font-medium">Approved Clinical Purpose:</span>
                  <p className="text-slate-200">{req.purpose}</p>
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Validity:</span>
                    {getTimeRemaining(req.expiresAt, req.status)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <Link
                    to={`/doctor/patients/${getPatientId(req.patientId)}/records`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Authorized Records</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
