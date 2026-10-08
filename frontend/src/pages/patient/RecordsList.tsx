import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import {
  MedicalRecord,
  VerifyResult,
  AiExplanation,
} from '../../types/records.js';
import { IntegrityBadge, BlockchainBadge } from '../../components/common/Badge.js';
import { CardSkeleton } from '../../components/common/Skeleton.js';
import { Modal } from '../../components/common/Modal.js';
import {
  FileText,
  Download,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Cpu,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  Info,
} from 'lucide-react';

export const RecordsList: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [verifyModalRecord, setVerifyModalRecord] = useState<MedicalRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const [aiModalRecord, setAiModalRecord] = useState<MedicalRecord | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [deleteModalRecord, setDeleteModalRecord] = useState<MedicalRecord | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [anchorLoadingId, setAnchorLoadingId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `/records?page=${page}&limit=6`;
      if (selectedType !== 'ALL') {
        query += `&type=${selectedType}`;
      }
      if (searchQuery.trim()) {
        query += `&title=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await apiClient.get(query);
      setRecords(res.data.records || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retrieve records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleDownload = async (record: MedicalRecord) => {
    try {
      const res = await apiClient.get(`/records/${record._id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: record.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', record.originalFilename || `${record.title}.bin`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Download failed. Access denied or file missing.');
    }
  };

  const handleOpenVerify = async (record: MedicalRecord) => {
    setVerifyModalRecord(record);
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await apiClient.get(`/records/${record._id}/verify`);
      setVerifyResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Integrity verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenAi = async (record: MedicalRecord) => {
    setAiModalRecord(record);
    setAiExplanation(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await apiClient.post(`/ai/records/${record._id}/explain`);
      setAiExplanation(res.data.explanation);
    } catch (err: any) {
      setAiError(
        err.response?.data?.message ||
          'AI assistance is currently unavailable or configuration key is not set.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnchorOnSui = async (recordId: string) => {
    setAnchorLoadingId(recordId);
    try {
      await apiClient.post(`/records/${recordId}/anchor`);
      await fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Blockchain anchoring failed');
    } finally {
      setAnchorLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalRecord) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/records/${deleteModalRecord._id}`);
      setDeleteModalRecord(null);
      await fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Record deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  const recordTypes: Array<{ label: string; value: string }> = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Lab Reports', value: 'LAB_REPORT' },
    { label: 'Prescriptions', value: 'PRESCRIPTION' },
    { label: 'Imaging', value: 'IMAGING' },
    { label: 'Discharge Summaries', value: 'DISCHARGE_SUMMARY' },
    { label: 'Clinical Notes', value: 'CLINICAL_NOTE' },
    { label: 'Vaccinations', value: 'VACCINATION' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Medical Records</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Cryptographically sealed vault with verifiable tamper-evidence.
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-teal-900/30 cursor-pointer self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          Upload Record
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-navy-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search records by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="bg-navy-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full md:w-auto"
          >
            {recordTypes.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Records Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : records.length === 0 ? (
        // Empty State That Teaches
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
            <FileQuestion className="w-10 h-10 text-teal-400" />
          </div>
          <h3 className="text-base font-bold text-white">No records found</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
            Upload your first report to see your timeline. Every record is stored with client-bound
            AES-256-GCM encryption and SHA-256 integrity validation.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {records.map((record) => (
            <div
              key={record._id}
              className="bg-navy-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-2 bg-slate-800 rounded-xl text-teal-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <IntegrityBadge status={record.status} />
                </div>

                <h3 className="text-base font-bold text-white line-clamp-1">{record.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Type: <span className="text-slate-300">{record.type.replace('_', ' ')}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Date: {new Date(record.createdAt).toLocaleDateString()}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <BlockchainBadge
                    status={record.blockchainAnchor?.status}
                    txDigest={record.blockchainAnchor?.txDigest}
                  />
                  <span className="text-slate-400 font-mono text-[11px]">
                    {(record.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownload(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    Download
                  </button>

                  <button
                    onClick={() => handleOpenVerify(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Verify
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenAi(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 border border-teal-700/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Explain (AI)
                  </button>

                  {record.blockchainAnchor?.status !== 'ANCHORED' ? (
                    <button
                      disabled={anchorLoadingId === record._id}
                      onClick={() => handleAnchorOnSui(record._id)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-700/40 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      {anchorLoadingId === record._id ? 'Anchoring...' : 'Anchor Sui'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteModalRecord(record)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-800/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Showing Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span> ({totalRecords} records)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-navy-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-navy-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Cryptographic Verification Modal */}
      <Modal
        isOpen={!!verifyModalRecord}
        onClose={() => setVerifyModalRecord(null)}
        title="Cryptographic Integrity & Blockchain Verification"
      >
        {verifying ? (
          <div className="p-8 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto" />
            <p className="text-sm text-slate-400">
              Re-computing SHA-256 plaintext hash and verifying Sui blockchain state...
            </p>
          </div>
        ) : verifyResult ? (
          <div className="space-y-4 text-xs">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                verifyResult.matches
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {verifyResult.matches ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {verifyResult.matches
                    ? 'Cryptographic Hash Validated'
                    : 'Integrity Check Failed! Tamper Detected.'}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {verifyResult.matches
                    ? 'The re-computed SHA-256 hash matches the database metadata byte-for-byte.'
                    : 'Computed hash differs from original uploaded document.'}
                </p>
              </div>
            </div>

            <div className="bg-navy-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div>
                <span className="text-slate-400 block mb-1">Stored SHA-256 Hash:</span>
                <code className="text-teal-300 font-mono text-[11px] break-all block bg-navy-900 p-2 rounded">
                  {verifyResult.storedHash}
                </code>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Recomputed Hash:</span>
                <code className="text-teal-300 font-mono text-[11px] break-all block bg-navy-900 p-2 rounded">
                  {verifyResult.computedHash}
                </code>
              </div>
            </div>

            <div className="bg-navy-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Sui Blockchain Status:</span>
              <span className="text-white font-semibold">{verifyResult.blockchainStatus}</span>
              {verifyResult.anchoredDigest && (
                <p className="text-slate-400 text-[11px] mt-1 break-all">
                  Tx Digest: <span className="font-mono text-indigo-300">{verifyResult.anchoredDigest}</span>
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* AI Plain-Language Explanation Modal */}
      <Modal
        isOpen={!!aiModalRecord}
        onClose={() => setAiModalRecord(null)}
        title="AI Plain-Language Report Explanation"
        maxWidth="max-w-3xl"
      >
        {aiLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto" />
            <p className="text-sm text-slate-400">
              Redacting PII and generating patient-friendly explanation with validated schema...
            </p>
          </div>
        ) : aiError ? (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">AI Assistant Unavailable</p>
              <p className="text-xs text-amber-200/90 mt-1">{aiError}</p>
            </div>
          </div>
        ) : aiExplanation ? (
          <div className="space-y-4 text-sm">
            {/* Mandatory Disclaimer */}
            <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Medical Notice:</strong> {aiExplanation.disclaimer}
              </span>
            </div>

            {/* Summary */}
            <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                Summary
              </h4>
              <p className="text-slate-200">{aiExplanation.summary}</p>
            </div>

            {/* Plain-Language Explanation */}
            <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                Plain-Language Explanation
              </h4>
              <p className="text-slate-200 leading-relaxed">
                {aiExplanation.patientFriendlyExplanation}
              </p>
            </div>

            {/* Key Findings */}
            {aiExplanation.keyFindings?.length > 0 && (
              <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                  Key Findings
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                  {aiExplanation.keyFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medical Terminology */}
            {aiExplanation.terminology?.length > 0 && (
              <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                  Medical Terminology Glossary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {aiExplanation.terminology.map((t, idx) => (
                    <div key={idx} className="bg-navy-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-teal-300">{t.term}: </span>
                      <span className="text-slate-300">{t.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions for Clinician */}
            {aiExplanation.questionsForClinician?.length > 0 && (
              <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                  Questions to Ask Your Doctor
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {aiExplanation.questionsForClinician.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalRecord}
        onClose={() => setDeleteModalRecord(null)}
        title="Confirm Soft Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-300">
            Are you sure you want to delete{' '}
            <span className="text-white font-bold">{deleteModalRecord?.title}</span>?
          </p>
          <p className="text-xs text-slate-400">
            The record will be soft-deleted. The cryptographic audit trail will record this deletion
            event for compliance integrity.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteModalRecord(null)}
              className="px-4 py-2 bg-navy-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
