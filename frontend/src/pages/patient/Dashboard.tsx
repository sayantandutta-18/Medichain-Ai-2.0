import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { MedicalRecord, AccessRequest } from '../../types/records.js';
import { IntegrityBadge, BlockchainBadge } from '../../components/common/Badge.js';
import { CardSkeleton, Skeleton } from '../../components/common/Skeleton.js';
import {
  FileText,
  ShieldCheck,
  UserCheck,
  Clock,
  Upload,
  ArrowRight,
  AlertCircle,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [verifiedCount, setVerifiedCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [activeConsentsCount, setActiveConsentsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch records
      const recordsRes = await apiClient.get('/records?limit=5');
      const fetchedRecords: MedicalRecord[] = recordsRes.data.records || [];
      const total: number = recordsRes.data.pagination?.total || 0;
      setRecords(fetchedRecords);
      setTotalRecords(total);

      const verified = fetchedRecords.filter(
        (r) => r.status === 'INTEGRITY_VERIFIED' || r.status === 'ENCRYPTED'
      ).length;
      setVerifiedCount(verified);

      // 2. Fetch access requests
      const requestsRes = await apiClient.get('/access-requests');
      const fetchedRequests: AccessRequest[] = requestsRes.data.requests || [];
      const pending = fetchedRequests.filter((r) => r.status === 'PENDING').length;
      const approved = fetchedRequests.filter((r) => r.status === 'APPROVED').length;
      setPendingRequestsCount(pending);
      setActiveConsentsCount(approved);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to retrieve dashboard data from server. Please verify your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-white">Data Fetch Interrupted</h2>
              <p className="text-sm text-red-200/90 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/60 hover:bg-red-800 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Patient Health Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time cryptographic verification and access control status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-teal-900/30 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Report
          </Link>
          <Link
            to="/requests"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Review Requests
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Encrypted Records</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-white mt-1">{totalRecords}</p>
            )}
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
            <FileText className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Integrity Verified</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400 mt-1">{verifiedCount}</p>
            )}
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Active Consents</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-teal-300 mt-1">{activeConsentsCount}</p>
            )}
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
            <UserCheck className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-navy-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Pending Requests</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-amber-400 mt-1">{pendingRequestsCount}</p>
            )}
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Health Records</h2>
          <Link
            to="/records"
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : records.length === 0 ? (
          // Empty State That Teaches
          <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
              <FileQuestion className="w-10 h-10 text-teal-400" />
            </div>
            <h3 className="text-base font-semibold text-white">No records found</h3>
            <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
              Upload your first report to see your timeline. Your documents are encrypted with AES-256-GCM
              client-isolated keys and anchored on the blockchain.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Your First Report
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((record) => (
              <div
                key={record._id}
                className="bg-navy-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{record.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {record.type.replace('_', ' ')} •{' '}
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <IntegrityBadge status={record.status} />
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <BlockchainBadge
                    status={record.blockchainAnchor?.status}
                    txDigest={record.blockchainAnchor?.txDigest}
                  />
                  <span className="text-slate-400 font-mono">
                    {(record.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
