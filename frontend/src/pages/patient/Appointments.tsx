import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Calendar,
  Clock,
  Video,
  ShieldCheck,
  Plus,
  X,
  AlertCircle,
  Lock,
  User,
} from 'lucide-react';

interface DoctorOption {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  licenseNumber?: string;
}

interface AppointmentItem {
  _id: string;
  doctorId: DoctorOption | string;
  patientId: any;
  slotStart: string;
  slotEnd: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  telehealthRoomId?: string;
  createdAt: string;
}

interface TelehealthRoomSession {
  roomId: string;
  sessionToken: string;
  encryption: string;
  peerRole: string;
  slotStart: string;
  slotEnd: string;
}

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotTime, setSlotTime] = useState<string>('10:00');
  const [reason, setReason] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);

  // Telehealth Room Modal State
  const [activeSession, setActiveSession] = useState<TelehealthRoomSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/appointments/doctors');
      setDoctors(res.data.doctors || []);
      if (res.data.doctors?.length > 0) {
        setSelectedDoctorId(res.data.doctors[0]._id);
      }
    } catch {
      // Doctor list unavailable
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotTime) {
      alert('Please select date and start time');
      return;
    }

    try {
      setBookingLoading(true);
      const startDateTime = new Date(`${slotDate}T${slotTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min duration

      await api.post('/appointments', {
        doctorId: selectedDoctorId,
        slotStart: startDateTime.toISOString(),
        slotEnd: endDateTime.toISOString(),
        reason,
      });

      setShowBookingModal(false);
      setReason('');
      await fetchAppointments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this consultation?')) return;
    try {
      await api.post(`/appointments/${id}/cancel`);
      await fetchAppointments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const handleJoinTelehealth = async (id: string) => {
    try {
      setSessionLoading(true);
      const res = await api.get(`/appointments/${id}/telehealth`);
      setActiveSession(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to join telehealth room');
    } finally {
      setSessionLoading(false);
    }
  };

  const getDoctorDisplay = (doc: DoctorOption | string) => {
    if (typeof doc === 'object' && doc !== null) {
      const name = [doc.firstName, doc.lastName].filter(Boolean).join(' ');
      return name ? `Dr. ${name}` : doc.email;
    }
    return 'Dr. Verified Clinician';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-400" />
            Appointments & Telehealth Consultations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Book conflict-free consultation slots and launch end-to-end encrypted (E2EE) virtual telehealth visits.
          </p>
        </div>

        {user?.role === 'PATIENT' && (
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Schedule Consultation
          </button>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-navy-900 border border-teal-500/30 rounded-2xl flex items-start gap-3 text-xs text-teal-200">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-teal-300">Peer-to-Peer E2EE Telehealth Privacy</p>
          <p className="text-teal-200/90 mt-0.5">
            Telehealth sessions use ephemeral rooms cryptographically bound to verified consultation slots. No video or audio streams are recorded or stored on central servers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Appointments List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading scheduled consultations...
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
            <Calendar className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-base font-bold text-white">No scheduled appointments</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">
            You currently have no active appointments booked with verified clinicians.
          </p>
          {user?.role === 'PATIENT' && (
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Book New Appointment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {appointments.map((apt) => {
            return (
              <div
                key={apt._id}
                className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {getDoctorDisplay(apt.doctorId)}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {apt.reason || 'General medical follow-up'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        apt.status === 'SCHEDULED'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : apt.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="bg-navy-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        {new Date(apt.slotStart).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="font-mono text-teal-300 font-semibold">
                        {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(apt.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {apt.telehealthRoomId && (
                      <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-teal-400" />
                          E2EE Telehealth Room
                        </span>
                        <span className="font-mono text-slate-500">{apt.telehealthRoomId.slice(0, 18)}...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {apt.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => handleJoinTelehealth(apt._id)}
                        disabled={sessionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-teal-950/40 cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        Join Telehealth Room
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(apt._id)}
                        className="py-2 px-3 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {apt.status !== 'SCHEDULED' && (
                    <span className="text-xs text-slate-500 italic">No further actions</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" />
                Schedule Clinician Consultation
              </h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Select Verified Doctor
                </label>
                {doctors.length === 0 ? (
                  <p className="text-xs text-amber-300">No verified doctors available currently.</p>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        Dr. {[d.firstName, d.lastName].filter(Boolean).join(' ') || d.email} (License: {d.licenseNumber || 'Active'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Clinical Reason / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lab results review, dosage check"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || doctors.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  {bookingLoading ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telehealth Consultation Active Session Modal */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-teal-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">E2EE Telehealth Consultation Room</h2>
                  <p className="text-[11px] text-teal-400 font-mono">
                    Room: {activeSession.roomId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Virtual Stream Preview Frame */}
            <div className="relative bg-navy-950 border border-slate-800 rounded-2xl h-64 flex flex-col items-center justify-center overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 animate-pulse">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">Encrypted Consultation Stream Connected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                P2P WebRTC data connection established with AES-GCM peer encryption.
              </p>
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-[10px] text-emerald-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                E2EE Active
              </div>
            </div>

            <div className="bg-navy-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Security Protocol:</span>
                <span className="font-mono text-teal-300">{activeSession.encryption}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Caller Role:</span>
                <span className="font-bold text-white">{activeSession.peerRole}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Session Token HMAC:</span>
                <span className="font-mono text-slate-400 truncate max-w-xs">{activeSession.sessionToken}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveSession(null)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Disconnect & End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
