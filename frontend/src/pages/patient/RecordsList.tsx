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
  Share2,
  GitBranch,
  GitCompare,
  Copy,
  Check,
  Database,
  Key,
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

  // Feature 04: Share Modal State
  const [shareModalRecord, setShareModalRecord] = useState<MedicalRecord | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareDuration, setShareDuration] = useState<number>(60);
  const [shareSingleUse, setShareSingleUse] = useState<boolean>(true);
  const [shareGenerating, setShareGenerating] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Feature 08: Compare Modal State
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [compareRecordA, setCompareRecordA] = useState<string>('');
  const [compareRecordB, setCompareRecordB] = useState<string>('');
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Feature 10: Version History Modal State
  const [versionModalRecord, setVersionModalRecord] = useState<MedicalRecord | null>(null);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState<boolean>(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionNote, setNewVersionNote] = useState<string>('');
  const [uploadingVersion, setUploadingVersion] = useState<boolean>(false);

  // Feature 14: FHIR State
  const [fhirModalOpen, setFhirModalOpen] = useState<boolean>(false);
  const [fhirExporting, setFhirExporting] = useState<boolean>(false);
  const [fhirImportFile, setFhirImportFile] = useState<File | null>(null);
  const [fhirImporting, setFhirImporting] = useState<boolean>(false);
  const [fhirImportStatus, setFhirImportStatus] = useState<string | null>(null);

  // Feature 16: Proof State
  const [proofModalOpen, setProofModalOpen] = useState<boolean>(false);
  const [proofClaim, setProofClaim] = useState<string>('');
  const [proofBlinding, setProofBlinding] = useState<string>('');
  const [proofCommitment, setProofCommitment] = useState<string | null>(null);
  const [proofCommitLoading, setProofCommitLoading] = useState<boolean>(false);
  const [verifyProofCommitment, setVerifyProofCommitment] = useState<string>('');
  const [verifyProofStatus, setVerifyProofStatus] = useState<string | null>(null);

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

  // Feature 04: Share Handlers
  const handleOpenShare = (record: MedicalRecord) => {
    setShareModalRecord(record);
    setShareLink(null);
    setShareCopied(false);
    setShareDuration(60);
    setShareSingleUse(true);
  };

  const handleGenerateShareLink = async () => {
    if (!shareModalRecord) return;
    try {
      setShareGenerating(true);
      const res = await apiClient.post('/shares', {
        recordId: shareModalRecord._id,
        expiresInMinutes: shareDuration,
        singleUse: shareSingleUse,
      });
      const token = res.data.shareLink?.token;
      if (token) {
        setShareLink(`${window.location.origin}/share/${token}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setShareGenerating(false);
    }
  };

  // Feature 10: Version Handlers
  const handleOpenVersions = async (record: MedicalRecord) => {
    setVersionModalRecord(record);
    setVersionsList([]);
    setVersionsLoading(true);
    try {
      const res = await apiClient.get(`/records/${record._id}/versions`);
      setVersionsList(res.data.versions || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!versionModalRecord || !newVersionFile) return;
    try {
      setUploadingVersion(true);
      const formData = new FormData();
      formData.append('file', newVersionFile);
      if (newVersionNote.trim()) {
        formData.append('changeNote', newVersionNote.trim());
      }
      await apiClient.post(`/records/${versionModalRecord._id}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVersionModalRecord(null);
      setNewVersionFile(null);
      setNewVersionNote('');
      await fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload new version');
    } finally {
      setUploadingVersion(false);
    }
  };

  // Feature 08: Compare Handlers
  const handleRunCompare = async () => {
    if (!compareRecordA || !compareRecordB) return;
    try {
      setCompareLoading(true);
      setCompareError(null);
      setCompareResult(null);
      const res = await apiClient.post('/ai/records/compare', {
        recordIdA: compareRecordA,
        recordIdB: compareRecordB,
      });
      if (res.data.status === 'SUCCESS') {
        setCompareResult(res.data.comparison);
      } else {
        setCompareError(res.data.message || 'Comparison could not be completed');
      }
    } catch (err: any) {
      if (err.response?.status === 503) {
        setCompareError('AI service is currently unavailable: OPENAI_API_KEY is not configured');
      } else {
        setCompareError(err.response?.data?.message || 'Failed to compare records');
      }
    } finally {
      setCompareLoading(false);
    }
  };

  const handleExportFhir = async () => {
    try {
      setFhirExporting(true);
      const res = await apiClient.get('/fhir/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medichain-fhir-r4-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export FHIR bundle');
    } finally {
      setFhirExporting(false);
    }
  };

  const handleImportFhir = async () => {
    if (!fhirImportFile) return;
    try {
      setFhirImporting(true);
      setFhirImportStatus(null);
      const text = await fhirImportFile.text();
      const parsed = JSON.parse(text);
      const res = await apiClient.post('/fhir/import', parsed);
      setFhirImportStatus(`Successfully imported ${res.data.importedObservations} FHIR observation(s) into health metrics!`);
      setFhirImportFile(null);
    } catch (err: any) {
      setFhirImportStatus(err.response?.data?.message || 'Failed to import FHIR bundle (must be valid JSON bundle)');
    } finally {
      setFhirImporting(false);
    }
  };

  const handleCreateProofCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofClaim.trim() || !proofBlinding.trim()) return;
    try {
      setProofCommitLoading(true);
      const res = await apiClient.post('/proofs/commit', {
        claim: proofClaim.trim(),
        blindingFactor: proofBlinding.trim(),
      });
      setProofCommitment(res.data.commitment);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate cryptographic proof commitment');
    } finally {
      setProofCommitLoading(false);
    }
  };

  const handleVerifyProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofClaim.trim() || !proofBlinding.trim() || !verifyProofCommitment.trim()) return;
    try {
      const res = await apiClient.post('/proofs/verify', {
        claim: proofClaim.trim(),
        blindingFactor: proofBlinding.trim(),
        commitment: verifyProofCommitment.trim(),
      });
      if (res.data.verified) {
        setVerifyProofStatus('VERIFIED: The commitment matches the claim and secret blinding factor cryptographically.');
      } else {
        setVerifyProofStatus('INVALID: The commitment did not match the provided pre-image.');
      }
    } catch (err: any) {
      setVerifyProofStatus(err.response?.data?.message || 'Verification check failed');
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
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setFhirModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            FHIR R4 Bundle
          </button>
          <button
            onClick={() => setProofModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-teal-400" />
            ZK Proofs
          </button>
          <button
            onClick={() => {
              setCompareModalOpen(true);
              setCompareResult(null);
              setCompareError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-teal-400" />
            Compare Records
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-teal-900/30 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Record
          </Link>
        </div>
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenShare(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-400" />
                    Share Link
                  </button>

                  <button
                    onClick={() => handleOpenVersions(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                    v{record.currentVersion || 1} History
                  </button>
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

      {/* Share Link Modal */}
      <Modal
        isOpen={!!shareModalRecord}
        onClose={() => {
          setShareModalRecord(null);
          setShareLink(null);
        }}
        title={`Share Document: ${shareModalRecord?.title}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Generate an expiring cryptographic share token to grant temporary view access to this document.
          </p>

          {!shareLink ? (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1">Validity Duration</label>
                <select
                  value={shareDuration}
                  onChange={(e) => setShareDuration(Number(e.target.value))}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={1440}>24 hours</option>
                  <option value={4320}>3 days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="singleUseCheck"
                  checked={shareSingleUse}
                  onChange={(e) => setShareSingleUse(e.target.checked)}
                  className="rounded border-slate-700 bg-navy-950 text-teal-500 focus:ring-0"
                />
                <label htmlFor="singleUseCheck" className="text-slate-300 cursor-pointer">
                  Revoke automatically after single view (Single-use token)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShareModalRecord(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={shareGenerating}
                  onClick={handleGenerateShareLink}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shareGenerating ? 'Generating...' : 'Create Secure Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-navy-950 border border-teal-500/30 rounded-xl space-y-2">
                <span className="text-[10px] uppercase text-teal-400 font-mono block">Secure Share Link</span>
                <p className="font-mono text-slate-200 text-xs break-all">{shareLink}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium flex items-center gap-1.5"
                >
                  {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{shareCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={!!versionModalRecord}
        onClose={() => {
          setVersionModalRecord(null);
          setNewVersionFile(null);
          setNewVersionNote('');
        }}
        title={`Version History — ${versionModalRecord?.title}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-xs">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-300">Recorded Versions</h4>
            {versionsLoading ? (
              <p className="text-slate-400">Loading versions...</p>
            ) : versionsList.length === 0 ? (
              <p className="text-slate-500">Only initial version (v1) exists.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {versionsList.map((v: any) => (
                  <div key={v.versionNumber} className="p-3 bg-navy-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300">Version {v.versionNumber}</span>
                      <span className="font-mono text-slate-500 text-[10px]">
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono text-[10px]">SHA-256: {v.sha256.substring(0, 16)}...</p>
                    {v.changeNote && <p className="text-slate-300 text-xs italic">&ldquo;{v.changeNote}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-navy-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="font-semibold text-white">Upload New Version</h4>
            <input
              type="file"
              onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-slate-800 file:text-slate-200 file:cursor-pointer"
            />
            <input
              type="text"
              placeholder="Change note (e.g. Updated with lab re-test values)"
              value={newVersionNote}
              onChange={(e) => setNewVersionNote(e.target.value)}
              className="w-full bg-navy-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
            />
            <button
              disabled={!newVersionFile || uploadingVersion}
              onClick={handleUploadNewVersion}
              className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold disabled:opacity-40 transition-colors"
            >
              {uploadingVersion ? 'Encrypting & Committing...' : 'Commit New Version'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Compare Records Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="AI Document Comparison"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Select First Document (A)</label>
              <select
                value={compareRecordA}
                onChange={(e) => setCompareRecordA(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="">Choose Record...</option>
                {records.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title} ({r.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Select Second Document (B)</label>
              <select
                value={compareRecordB}
                onChange={(e) => setCompareRecordB(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="">Choose Record...</option>
                {records.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title} ({r.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={!compareRecordA || !compareRecordB || compareRecordA === compareRecordB || compareLoading}
              onClick={handleRunCompare}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-40"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {compareLoading ? 'Analyzing...' : 'Run Side-by-Side Comparison'}
            </button>
          </div>

          {compareError && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl">
              {compareError}
            </div>
          )}

          {compareResult && (
            <div className="p-4 bg-navy-950 border border-teal-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-teal-300">Comparison Findings</span>
                <span className="text-[10px] text-teal-400 font-mono">Validated Schema</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-navy-900 rounded-xl border border-slate-800">
                  <h5 className="font-semibold text-white mb-1">Record A Highlights</h5>
                  <p className="text-slate-300 leading-relaxed">{compareResult.recordAHighlights || 'None'}</p>
                </div>
                <div className="p-3 bg-navy-900 rounded-xl border border-slate-800">
                  <h5 className="font-semibold text-white mb-1">Record B Highlights</h5>
                  <p className="text-slate-300 leading-relaxed">{compareResult.recordBHighlights || 'None'}</p>
                </div>
              </div>

              {compareResult.differences && (
                <div className="p-3 bg-navy-900 rounded-xl border border-slate-800">
                  <h5 className="font-semibold text-white mb-1">Key Changes & Evolution</h5>
                  <p className="text-slate-300 leading-relaxed">{compareResult.differences}</p>
                </div>
              )}

              <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl text-[11px] text-amber-200">
                <strong>Non-Diagnostic Disclaimer:</strong> {compareResult.disclaimer || 'AI comparison is an informational review tool only and does not diagnose conditions or replace clinical review.'}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Feature 14: FHIR R4 Bundle Modal */}
      <Modal
        isOpen={fhirModalOpen}
        onClose={() => {
          setFhirModalOpen(false);
          setFhirImportStatus(null);
        }}
        title="FHIR R4 Interoperability (Import & Export)"
      >
        <div className="space-y-6 text-xs">
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-200">
            Export or import clinical records compliant with HL7 FHIR Release 4 (Bundle, Patient, DocumentReference, Observation).
          </div>

          {/* Export Section */}
          <div className="bg-navy-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm">Export Health Profile as FHIR R4</h4>
            <p className="text-slate-400">
              Download your complete encrypted records registry and recorded observations bundled as a standard FHIR JSON archive.
            </p>
            <button
              onClick={handleExportFhir}
              disabled={fhirExporting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {fhirExporting ? 'Generating Bundle...' : 'Export & Download FHIR Bundle'}
            </button>
          </div>

          {/* Import Section */}
          <div className="bg-navy-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm">Import FHIR R4 Bundle</h4>
            <p className="text-slate-400">
              Upload a valid FHIR R4 JSON file to parse clinical Observations into your health metrics vitals tracker.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFhirImportFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
            <button
              onClick={handleImportFhir}
              disabled={!fhirImportFile || fhirImporting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {fhirImporting ? 'Parsing Bundle...' : 'Import Observations into Vitals'}
            </button>

            {fhirImportStatus && (
              <div className="p-3 bg-navy-900 border border-teal-500/30 rounded-xl text-teal-300">
                {fhirImportStatus}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Feature 16: Zero-Knowledge / Cryptographic Proof Modal */}
      <Modal
        isOpen={proofModalOpen}
        onClose={() => {
          setProofModalOpen(false);
          setProofCommitment(null);
          setVerifyProofStatus(null);
        }}
        title="Zero-Knowledge Cryptographic Proof Commitments"
      >
        <div className="space-y-6 text-xs">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-200">
            Generate verifiable commitments for medical claims without disclosing sensitive record content.
          </div>

          {/* Generate Commitment */}
          <form onSubmit={handleCreateProofCommitment} className="bg-navy-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-400" />
              Generate Claim Commitment
            </h4>
            <div>
              <label className="block text-slate-400 mb-1">Medical Claim / Statement</label>
              <input
                type="text"
                required
                placeholder="e.g. COVID-19 mRNA vaccination series completed"
                value={proofClaim}
                onChange={(e) => setProofClaim(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Secret Blinding Factor / Salt (min 8 chars)</label>
              <input
                type="text"
                required
                placeholder="Keep this secret to prove claim later..."
                value={proofBlinding}
                onChange={(e) => setProofBlinding(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={proofCommitLoading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
            >
              {proofCommitLoading ? 'Computing...' : 'Create Commitment Hash'}
            </button>

            {proofCommitment && (
              <div className="p-3 bg-navy-900 border border-teal-500/30 rounded-xl space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">SHA-256 Commitment Hash</span>
                <p className="font-mono text-teal-300 break-all">{proofCommitment}</p>
              </div>
            )}
          </form>

          {/* Verify Commitment */}
          <form onSubmit={handleVerifyProof} className="bg-navy-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Verify Cryptographic Commitment
            </h4>
            <div>
              <label className="block text-slate-400 mb-1">Commitment Hash to Verify (64 hex characters)</label>
              <input
                type="text"
                required
                placeholder="Paste commitment hash..."
                value={verifyProofCommitment}
                onChange={(e) => setVerifyProofCommitment(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer"
            >
              Verify Proof Preimage
            </button>

            {verifyProofStatus && (
              <div
                className={`p-3 rounded-xl border font-semibold ${
                  verifyProofStatus.includes('VERIFIED')
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {verifyProofStatus}
              </div>
            )}
          </form>
        </div>
      </Modal>
    </div>
  );
};
