import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { MedicalRecord, VerifyResult, AiExplanation } from '../../types/records.js';
import { IntegrityBadge, BlockchainBadge } from '../../components/common/Badge.js';
import { CardSkeleton } from '../../components/common/Skeleton.js';
import { Modal } from '../../components/common/Modal.js';
import {
  FileText,
  Download,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Info,
  ArrowLeft,
  UserPlus,
  FileEdit,
  Save,
} from 'lucide-react';

export const DoctorPatientRecords: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [verifyModalRecord, setVerifyModalRecord] = useState<MedicalRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const [aiModalRecord, setAiModalRecord] = useState<MedicalRecord | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAuthorizedRecords = async () => {
    if (!patientId) return;

    setLoading(true);
    setAccessDenied(false);
    setErrorMessage(null);
    // Crucial rule: Never render from a cached unauthorized response
    setRecords([]);

    try {
      const res = await apiClient.get(`/records?patientId=${patientId}`);
      // Render ONLY after API returns 200
      setRecords(res.data.records || []);
      fetchClinicalNotes();
    } catch (err: any) {
      // Backend policy rejected access
      setAccessDenied(true);
      setRecords([]);
      setErrorMessage(
        err.response?.data?.message ||
          'Unauthorized: Doctor has no active approved consent for this patient.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Feature 12: Clinical Notes State
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteTags, setNewNoteTags] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const fetchClinicalNotes = async () => {
    if (!patientId) return;
    try {
      const res = await apiClient.get(`/clinical-notes/patient/${patientId}`);
      setClinicalNotes(res.data.notes || []);
    } catch {
      // ignore
    }
  };

  const handleAddClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !patientId) return;
    try {
      setSavingNote(true);
      const tags = newNoteTags.split(',').map((t) => t.trim()).filter(Boolean);
      await apiClient.post('/clinical-notes', {
        patientId,
        content: newNoteContent.trim(),
        tags,
      });
      setNewNoteContent('');
      setNewNoteTags('');
      await fetchClinicalNotes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add clinical note');
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    fetchAuthorizedRecords();
  }, [patientId]);

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
      alert(err.response?.data?.message || 'Download denied: Consent revoked or missing.');
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
          'AI assistance is unavailable or key not configured.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/doctor"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Doctor Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Authorized Clinical Records</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Patient ID: {patientId} • Read-Only Clinical View
          </p>
        </div>
      </div>

      {/* Access Denied State (403) */}
      {accessDenied ? (
        <div className="bg-navy-900 border border-red-500/40 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Access Denied by Central Security Policy</h3>
          <p className="text-sm text-red-200/90 max-w-md mx-auto">
            {errorMessage ||
              'Doctor has no active approved consent for this patient. Access was revoked or has expired.'}
          </p>
          <div className="pt-2">
            <Link
              to="/doctor/request-access"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Request New Patient Consent
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4">
            <FileQuestion className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-white">No records found for patient</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            This patient has not uploaded any medical records to their vault yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {records.map((record) => (
            <div
              key={record._id}
              className="bg-navy-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-2 bg-slate-800 rounded-xl text-indigo-400">
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

              {/* Read-Only Actions (No delete or update buttons for doctors) */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownload(record)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
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

                <button
                  onClick={() => handleOpenAi(record)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-700/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Clinical AI Explanation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature 12: Doctor Clinical Notes Section */}
      {!accessDenied && (
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Physician Clinical Notes & Annotations</h3>
                <p className="text-xs text-slate-400">
                  AES-256-GCM encrypted notes with AAD authentication bound to patient
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {clinicalNotes.length} Note(s)
            </span>
          </div>

          {/* New Note Form */}
          <form onSubmit={handleAddClinicalNote} className="space-y-3 bg-navy-950 p-4 rounded-2xl border border-slate-800">
            <textarea
              rows={2}
              required
              placeholder="Enter clinical assessment or note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full bg-navy-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <input
                type="text"
                placeholder="Tags (comma-separated, e.g. followup, vitals)"
                value={newNoteTags}
                onChange={(e) => setNewNoteTags(e.target.value)}
                className="w-full sm:w-72 bg-navy-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={savingNote}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNote ? 'Encrypting & Saving...' : 'Save Encrypted Note'}
              </button>
            </div>
          </form>

          {/* Notes List */}
          {clinicalNotes.length > 0 && (
            <div className="space-y-3 pt-2">
              {clinicalNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-navy-950 rounded-2xl border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Dr. {note.doctorId?.firstName ? `${note.doctorId.firstName} ${note.doctorId.lastName || ''}` : 'Verified Physician'}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap">{note.content}</p>
                  {note.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {note.tags.map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verification Modal */}
      <Modal
        isOpen={!!verifyModalRecord}
        onClose={() => setVerifyModalRecord(null)}
        title="Cryptographic Hash Verification"
      >
        {verifying ? (
          <div className="p-8 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto" />
            <p className="text-sm text-slate-400">Verifying cryptographic hash against server...</p>
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
                    : 'Tamper Detected! Hash mismatch.'}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  Stored: {verifyResult.storedHash.substring(0, 24)}...
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* AI Explanation Modal */}
      <Modal
        isOpen={!!aiModalRecord}
        onClose={() => setAiModalRecord(null)}
        title="Clinical AI Report Summary"
        maxWidth="max-w-3xl"
      >
        {aiLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto" />
            <p className="text-sm text-slate-400">Generating AI clinical summary with validated schema...</p>
          </div>
        ) : aiError ? (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">AI Service Unavailable</p>
              <p className="text-xs text-amber-200/90 mt-1">{aiError}</p>
            </div>
          </div>
        ) : aiExplanation ? (
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Clinician Notice:</strong> {aiExplanation.disclaimer}
              </span>
            </div>

            <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                Summary
              </h4>
              <p className="text-slate-200">{aiExplanation.summary}</p>
            </div>

            <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                Patient-Friendly Explanation
              </h4>
              <p className="text-slate-200">{aiExplanation.patientFriendlyExplanation}</p>
            </div>

            {aiExplanation.keyFindings?.length > 0 && (
              <div className="bg-navy-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Key Findings
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                  {aiExplanation.keyFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
