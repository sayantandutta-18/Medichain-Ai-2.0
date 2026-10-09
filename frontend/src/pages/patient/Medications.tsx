import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Pill,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionDoc {
  _id: string;
  doctorId: any;
  patientId: any;
  medications: MedicationItem[];
  notes?: string;
  createdAt: string;
}

interface InteractionWarning {
  title: string;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  drugA: string;
  drugB: string;
  description: string;
}

export const Medications: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refillLoadingId, setRefillLoadingId] = useState<string | null>(null);
  const [refillSuccessMsg, setRefillSuccessMsg] = useState<string | null>(null);

  // Drug Interaction Checker State
  const [drugInput, setDrugInput] = useState<string>('');
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [checkingInteractions, setCheckingInteractions] = useState<boolean>(false);
  const [interactionResults, setInteractionResults] = useState<{
    hasInteractions: boolean;
    interactions: InteractionWarning[];
    disclaimer: string;
  } | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data.prescriptions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleRequestRefill = async (id: string) => {
    try {
      setRefillLoadingId(id);
      const res = await api.post(`/prescriptions/${id}/refill`);
      setRefillSuccessMsg(res.data.message || 'Refill request submitted');
      setTimeout(() => setRefillSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit refill request');
    } finally {
      setRefillLoadingId(null);
    }
  };

  const handleAddMedToCheck = (name: string) => {
    if (name.trim() && !selectedMeds.includes(name.trim())) {
      setSelectedMeds([...selectedMeds, name.trim()]);
      setDrugInput('');
    }
  };

  const handleRemoveMed = (index: number) => {
    setSelectedMeds(selectedMeds.filter((_, i) => i !== index));
  };

  const handleCheckInteractions = async () => {
    try {
      setCheckingInteractions(true);
      const res = await api.post('/prescriptions/check-interactions', {
        medications: selectedMeds,
      });
      setInteractionResults(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to check drug interactions');
    } finally {
      setCheckingInteractions(false);
    }
  };

  const handleAutoLoadPrescriptions = () => {
    const activeNames: string[] = [];
    for (const rx of prescriptions) {
      for (const m of rx.medications) {
        if (!activeNames.includes(m.name)) activeNames.push(m.name);
      }
    }
    setSelectedMeds(activeNames);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Pill className="w-6 h-6 text-teal-400" />
          Medications & Automated Drug Interaction Screening
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review physician prescriptions, request refills, and screen for adverse clinical drug-drug interactions.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300">Non-Diagnostic Safety Notice (Master Rule 11)</p>
          <p className="text-amber-200/90 mt-0.5">
            This module provides informational screening only and does NOT constitute medical diagnosis or prescription advice. Never alter your medications without direct physician consultation.
          </p>
        </div>
      </div>

      {refillSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{refillSuccessMsg}</span>
        </div>
      )}

      {/* Feature 18: Drug-Drug Interaction Checker Widget */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Automated Drug-Drug Interaction Checker</h2>
              <p className="text-xs text-slate-400">Clinical cross-screening engine for adverse medication combinations</p>
            </div>
          </div>
          {prescriptions.length > 0 && (
            <button
              onClick={handleAutoLoadPrescriptions}
              className="text-xs text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
            >
              Load Active Rx Medications
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type drug name (e.g. Warfarin, Aspirin, Sildenafil, Lisinopril, Metformin)..."
              value={drugInput}
              onChange={(e) => setDrugInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMedToCheck(drugInput);
                }
              }}
              className="flex-1 bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => handleAddMedToCheck(drugInput)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Add Drug
            </button>
          </div>

          {selectedMeds.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-400">Selected medications:</span>
              {selectedMeds.map((med, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/15 border border-teal-500/30 text-teal-300 rounded-lg text-xs font-medium"
                >
                  {med}
                  <button
                    onClick={() => handleRemoveMed(idx)}
                    className="hover:text-red-300 ml-1 text-slate-400 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={handleCheckInteractions}
                disabled={checkingInteractions}
                className="ml-auto px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                {checkingInteractions ? 'Checking...' : 'Screen for Interactions'}
              </button>
            </div>
          )}

          {/* Interaction Results Display */}
          {interactionResults && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              {interactionResults.hasInteractions ? (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Warning: {interactionResults.interactions.length} significant drug-drug interaction(s) detected!</span>
                  </div>
                  {interactionResults.interactions.map((inter, i) => (
                    <div
                      key={i}
                      className="p-4 bg-navy-950 rounded-xl border border-rose-500/30 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{inter.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inter.severity === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {inter.severity} Risk
                        </span>
                      </div>
                      <p className="text-slate-300">{inter.description}</p>
                      <p className="text-[11px] text-teal-400/80 font-mono">
                        Interacting Agents: {inter.drugA} ⟷ {inter.drugB}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No known high-risk contraindications detected among selected medications.</span>
                </div>
              )}
              <p className="text-[10px] text-slate-500 italic mt-1">
                {interactionResults.disclaimer}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feature 17: Prescriptions List */}
      <div>
        <h2 className="text-base font-bold text-white mb-3">Active Doctor Prescriptions</h2>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading prescriptions...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
              <Pill className="w-10 h-10 text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-white">No active prescriptions</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              When verified physicians prescribe medications during consultations, they will appear here with automated refill tracking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {prescriptions.map((rx) => (
              <div
                key={rx._id}
                className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Pill className="w-4 h-4 text-teal-400" />
                        Prescription
                      </h3>
                      <p className="text-xs text-slate-400">
                        Issued: {new Date(rx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono">
                      {rx.medications.length} Med(s)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {rx.medications.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-navy-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-white">{m.name} ({m.dosage})</p>
                          <p className="text-slate-400 mt-0.5">{m.frequency} • {m.duration}</p>
                          {m.instructions && (
                            <p className="text-[11px] text-teal-400/80 mt-0.5 italic">{m.instructions}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {rx.notes && (
                    <div className="text-xs text-slate-400 italic bg-navy-950/60 p-2.5 rounded-lg border border-slate-850">
                      Physician Notes: {rx.notes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">ID: {rx._id.slice(0, 8)}...</span>
                  <button
                    onClick={() => handleRequestRefill(rx._id)}
                    disabled={refillLoadingId === rx._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refillLoadingId === rx._id ? 'animate-spin' : ''}`} />
                    Request Refill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
