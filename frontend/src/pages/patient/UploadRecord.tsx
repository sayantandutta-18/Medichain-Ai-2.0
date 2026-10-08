import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { RecordType } from '../../types/records.js';
import {
  Upload,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE_MB = 10;

export const UploadRecord: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('LAB_REPORT');
  const [dateOfRecord, setDateOfRecord] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [clinicDoctorName, setClinicDoctorName] = useState('');
  const [notes, setNotes] = useState('');

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: string;
    sha256: string;
    title: string;
  } | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setErrorMessage(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setErrorMessage(
        `Unsupported file type: ${selectedFile.type || 'unknown'}. Only PDF, PNG, and JPEG files are allowed.`
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Auto-populate title with file name without extension
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a medical report file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter a document title.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('type', recordType);
    if (dateOfRecord) formData.append('dateOfRecord', dateOfRecord);
    if (clinicDoctorName) formData.append('clinicDoctorName', clinicDoctorName.trim());
    if (notes) formData.append('notes', notes.trim());

    try {
      const res = await apiClient.post('/records', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      setSuccessResult({
        id: res.data.record?.id || res.data.record?._id,
        sha256: res.data.record?.sha256,
        title: res.data.record?.title || title,
      });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to upload medical record. Please try again.'
      );
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setRecordType('LAB_REPORT');
    setDateOfRecord(new Date().toISOString().split('T')[0]);
    setClinicDoctorName('');
    setNotes('');
    setSuccessResult(null);
    setUploadProgress(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Medical Document</h1>
        <p className="text-sm text-slate-400 mt-1">
          Files are verified for magic bytes, encrypted with AES-256-GCM, and hashed with SHA-256.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successResult && (
        <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-white">Record Encrypted & Sealed Successfully</h2>
              <p className="text-xs text-emerald-200/90 mt-1">
                Your report <span className="font-semibold">{successResult.title}</span> is secured
                with authenticated AES-256-GCM encryption.
              </p>
              <div className="mt-3 bg-navy-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <p className="text-slate-400">
                  Record ID: <span className="text-slate-200">{successResult.id}</span>
                </p>
                <p className="text-slate-400 truncate">
                  SHA-256: <span className="text-teal-300">{successResult.sha256}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/records"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <span>View in My Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-navy-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              Upload Another Document
            </button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      {!successResult && (
        <form onSubmit={handleSubmit} className="bg-navy-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Dropzone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select or Drop Medical Report
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                file
                  ? 'border-teal-500/50 bg-teal-950/10'
                  : 'border-slate-700 hover:border-teal-500/50 bg-navy-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Document'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-teal-400">Click to upload</span> or drag and
                    drop
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF, PNG, JPG, or JPEG up to 10 MB (Magic-byte signature verified)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="record-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                Document Title *
              </label>
              <input
                id="record-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Blood Panel Report"
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="record-type" className="block text-xs font-medium text-slate-300 mb-1.5">
                Record Category *
              </label>
              <select
                id="record-type"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as RecordType)}
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="LAB_REPORT">Lab Report</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="IMAGING">Imaging / Radiology</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="CLINICAL_NOTE">Clinical Note</option>
                <option value="VACCINATION">Vaccination Record</option>
                <option value="OTHER">Other Health Document</option>
              </select>
            </div>

            <div>
              <label htmlFor="record-date" className="block text-xs font-medium text-slate-300 mb-1.5">
                Date of Document
              </label>
              <input
                id="record-date"
                type="date"
                value={dateOfRecord}
                onChange={(e) => setDateOfRecord(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="record-doctor" className="block text-xs font-medium text-slate-300 mb-1.5">
                Clinic / Physician Name (Optional)
              </label>
              <input
                id="record-doctor"
                type="text"
                value={clinicDoctorName}
                onChange={(e) => setClinicDoctorName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, City Hospital"
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="record-notes" className="block text-xs font-medium text-slate-300 mb-1.5">
              Personal Notes or Context (Optional)
            </label>
            <textarea
              id="record-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Routine checkup before surgery"
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Encrypting & Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-navy-950 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-500 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-teal-900/40 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{uploading ? 'Encrypting & Uploading...' : 'Encrypt & Upload'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
