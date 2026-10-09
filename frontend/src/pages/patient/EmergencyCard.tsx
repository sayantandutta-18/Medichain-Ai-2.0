import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import {
  AlertTriangle,
  QrCode,
  HeartPulse,
  Save,
  Copy,
  Check,
  Edit2,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

interface EmergencyData {
  bloodGroup: string;
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  conditionsSummary: string;
  emergencyToken?: string;
}

export const EmergencyCard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<EmergencyData>({
    bloodGroup: '',
    allergies: [],
    emergencyContacts: [],
    conditionsSummary: '',
  });
  const [emergencyToken, setEmergencyToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Form edit states
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [allergyInput, setAllergyInput] = useState<string>('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [conditionsSummary, setConditionsSummary] = useState<string>('');

  const fetchEmergencyCard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/emergency/card');
      const card = res.data.card || {};
      setData(card);
      setEmergencyToken(res.data.emergencyToken || card.emergencyToken || '');
      setBloodGroup(card.bloodGroup || '');
      setAllergies(card.allergies || []);
      setContacts(card.emergencyContacts || []);
      setConditionsSummary(card.conditionsSummary || '');
    } catch (err: any) {
      console.error('Failed to load emergency card', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyCard();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post('/emergency/card', {
        bloodGroup,
        allergies,
        emergencyContacts: contacts,
        conditionsSummary,
      });
      setData(res.data.card);
      if (res.data.emergencyToken) {
        setEmergencyToken(res.data.emergencyToken);
      }
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save emergency card');
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const removeAllergy = (idx: number) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', relationship: '', phoneNumber: '' }]);
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const publicUrl = emergencyToken
    ? `${window.location.origin}/emergency/${emergencyToken}`
    : '';

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-400 text-sm">
        Loading emergency health card...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-400" />
            Emergency Health Card
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Allow-listed emergency profile accessible to first responders via secure token.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Card
          </button>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300">Strict Allow-List Safeguard (Master Rule 5 & 7)</p>
          <p className="text-amber-200/90 mt-0.5">
            Emergency view exposes strictly allow-listed triage fields (blood type, allergies, emergency
            contacts). All confidential medical records remain client-side encrypted with AES-256-GCM.
          </p>
        </div>
      </div>

      {/* Editing Form */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-6 bg-navy-900 border border-slate-800 rounded-3xl space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white">Edit Emergency Information</h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Allergies</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAllergy();
                  }
                }}
                className="flex-1 bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={addAllergy}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium"
              >
                Add
              </button>
            </div>
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allergies.map((all, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-xs"
                  >
                    {all}
                    <button
                      type="button"
                      onClick={() => removeAllergy(idx)}
                      className="hover:text-red-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400">Emergency Contacts</label>
              <button
                type="button"
                onClick={addContact}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>
            <div className="space-y-3">
              {contacts.map((c, idx) => (
                <div key={idx} className="p-3 bg-navy-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={c.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                    className="flex-1 bg-navy-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relation (e.g. Spouse)"
                    value={c.relationship}
                    onChange={(e) => updateContact(idx, 'relationship', e.target.value)}
                    className="w-full sm:w-36 bg-navy-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone"
                    value={c.phoneNumber}
                    onChange={(e) => updateContact(idx, 'phoneNumber', e.target.value)}
                    className="w-full sm:w-36 bg-navy-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Brief Critical Conditions Summary
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Type 1 Diabetic, Asthmatic"
              value={conditionsSummary}
              onChange={(e) => setConditionsSummary(e.target.value)}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Card'}
            </button>
          </div>
        </form>
      ) : (
        /* Virtual Emergency Card View */
        <div className="bg-gradient-to-br from-navy-900 via-navy-850 to-teal-950 border border-teal-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-red-500/20 rounded-2xl text-red-400 border border-red-500/30">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-wide text-white">EMERGENCY HEALTH CARD</h2>
                <p className="text-[10px] text-teal-300 font-mono">MediChain-AI Encrypted Vault</p>
              </div>
            </div>
            <div className="p-2 bg-navy-950/80 rounded-2xl border border-slate-700">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Patient</span>
              <p className="text-lg font-bold text-white">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
                <span className="text-base font-bold text-rose-400">
                  {data.bloodGroup || 'Not Specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Known Allergies</span>
                <span className="text-xs font-medium text-slate-200">
                  {data.allergies && data.allergies.length > 0
                    ? data.allergies.join(', ')
                    : 'None recorded'}
                </span>
              </div>
            </div>

            {data.conditionsSummary && (
              <div className="pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase">Conditions Summary</span>
                <p className="text-slate-300 mt-0.5">{data.conditionsSummary}</p>
              </div>
            )}

            {data.emergencyContacts && data.emergencyContacts.length > 0 && (
              <div className="pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Emergency Contacts</span>
                <div className="space-y-1">
                  {data.emergencyContacts.map((c, i) => (
                    <div key={i} className="flex justify-between text-slate-300 font-mono text-[11px]">
                      <span>{c.name} ({c.relationship})</span>
                      <span className="text-teal-400 font-bold">{c.phoneNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Public Access Link */}
          {publicUrl && (
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px] font-mono truncate max-w-xs">
                {publicUrl}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl transition-colors font-medium text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Emergency Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
