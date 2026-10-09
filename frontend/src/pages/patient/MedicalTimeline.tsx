import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Calendar,
  Filter,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface TimelineRecord {
  _id: string;
  title: string;
  type: string;
  status: string;
  sha256: string;
  originalFilename?: string;
  sizeBytes?: number;
  createdAt: string;
}

interface TimelineYearGroup {
  year: number;
  records: TimelineRecord[];
}

export const MedicalTimeline: React.FC = () => {
  const [timelineGroups, setTimelineGroups] = useState<TimelineYearGroup[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // AI Timeline analysis states
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchTimeline = async (typeFilter = selectedType) => {
    try {
      setLoading(true);
      setError(null);
      const url =
        typeFilter && typeFilter !== 'ALL'
          ? `/records/timeline?type=${encodeURIComponent(typeFilter)}`
          : '/records/timeline';
      const res = await api.get(url);
      setTimelineGroups(res.data.timeline || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load medical timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline(selectedType);
  }, [selectedType]);

  const generateAiTimeline = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await api.post('/ai/timeline', {});
      if (res.data.status === 'SUCCESS') {
        setAiSummary(res.data.timeline);
      } else {
        setAiError(res.data.message || 'AI Timeline summary could not be generated');
      }
    } catch (err: any) {
      if (err?.response?.status === 503) {
        setAiError('AI service is currently unavailable: OPENAI_API_KEY is not configured');
      } else {
        setAiError(err?.response?.data?.message || 'Failed to generate AI timeline summary');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const recordTypes = [
    'ALL',
    'LAB_REPORT',
    'PRESCRIPTION',
    'DISCHARGE_SUMMARY',
    'VACCINATION',
    'RADIOLOGY',
    'OTHER',
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-teal-400" />
            Medical History Timeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chronological overview of all encrypted medical events and records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generateAiTimeline}
            disabled={aiLoading || loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-teal-200" />
            )}
            <span>Generate AI Timeline Summary</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <Filter className="w-4 h-4 text-slate-500 shrink-0 mr-1" />
        {recordTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              selectedType === type
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* AI Timeline Summary Card (if generated or errored) */}
      {aiError && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">AI Service Notice</p>
            <p className="mt-0.5">{aiError}</p>
          </div>
        </div>
      )}

      {aiSummary && (
        <div className="bg-gradient-to-br from-navy-900 to-teal-950/50 border border-teal-500/40 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-white">AI Health Chronology Summary</h2>
            </div>
            <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/30">
              Validated Schema
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{aiSummary.summary}</p>

          {aiSummary.chronology && aiSummary.chronology.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chronological Events Identified:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiSummary.chronology.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-navy-950/70 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-teal-300">{item.event}</span>
                      <span className="font-mono text-slate-400 text-[10px]">{item.date}</span>
                    </div>
                    {item.significance && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">{item.significance}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Non-Diagnostic Disclaimer */}
          <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-200 mt-4">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Non-Diagnostic Disclaimer:</strong> {aiSummary.disclaimer || 'This AI-generated chronology summary is for patient informational review only and does not constitute medical diagnosis, advice, or treatment.'}
            </p>
          </div>
        </div>
      )}

      {/* Timeline Stream */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading medical history...</div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-200 text-sm">
          {error}
        </div>
      ) : timelineGroups.length === 0 ? (
        <div className="text-center py-16 bg-navy-900 border border-slate-800 rounded-3xl p-8 space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No medical records match the selected filter. Upload medical records to build your timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-10 relative before:absolute before:inset-0 before:left-4 md:before:left-8 before:w-0.5 before:bg-slate-800">
          {timelineGroups.map((group) => (
            <div key={group.year} className="space-y-4 relative">
              {/* Year marker */}
              <div className="flex items-center gap-3">
                <div className="z-10 w-8 h-8 rounded-full bg-teal-500/20 border-2 border-teal-500 flex items-center justify-center font-bold text-xs text-teal-300 shadow-md">
                  {group.year.toString().slice(-2)}
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">{group.year}</h2>
                <span className="text-xs text-slate-500">({group.records.length} records)</span>
              </div>

              {/* Records in Year */}
              <div className="space-y-3 pl-12 md:pl-16">
                {group.records.map((rec) => (
                  <div
                    key={rec._id}
                    className="p-4 bg-navy-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-md uppercase">
                          {rec.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm">{rec.title}</h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>SHA-256: {rec.sha256.substring(0, 10)}...</span>
                        {rec.originalFilename && <span>{rec.originalFilename}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AES-256
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
