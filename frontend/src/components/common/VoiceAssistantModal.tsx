import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal.js';
import { api } from '../../api/client.js';
import {
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
} from 'lucide-react';

interface VoiceIntentResponse {
  intent: 'SCHEDULE_APPOINTMENT' | 'LOG_VITAL' | 'SEARCH_RECORDS' | 'VIEW_MEDICATIONS' | 'CHECK_INTERACTIONS' | 'UNKNOWN';
  naturalLanguageSummary: string;
  requiresConfirmation: boolean;
  previewData: Record<string, any>;
  disclaimer: string;
}

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedIntent, setParsedIntent] = useState<VoiceIntentResponse | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Browser speech recognition not available. Please type your command below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setParsedIntent(null);
      setExecutionMessage(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  const handleProcessTranscript = async (textToProcess?: string) => {
    const text = textToProcess || transcript;
    if (!text || !text.trim()) {
      setError('Please provide a command or speak into the microphone.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setParsedIntent(null);
      setExecutionMessage(null);

      const res = await api.post('/ai/voice/parse-intent', { transcript: text.trim() });
      if (res.data?.intent) {
        setParsedIntent(res.data.intent);
      } else {
        setError('Could not parse voice command. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to process voice command with AI assistant.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmAndExecute = () => {
    if (!parsedIntent) return;

    if (parsedIntent.intent === 'SCHEDULE_APPOINTMENT') {
      setExecutionMessage('Redirecting to appointment booking scheduler...');
      setTimeout(() => {
        onClose();
        navigate('/appointments');
      }, 900);
    } else if (parsedIntent.intent === 'LOG_VITAL') {
      setExecutionMessage('Redirecting to health analytics vital logger...');
      setTimeout(() => {
        onClose();
        navigate('/analytics');
      }, 900);
    } else if (parsedIntent.intent === 'VIEW_MEDICATIONS' || parsedIntent.intent === 'CHECK_INTERACTIONS') {
      onClose();
      navigate('/medications');
    } else if (parsedIntent.intent === 'SEARCH_RECORDS') {
      onClose();
      navigate('/records');
    } else {
      setExecutionMessage('Intent processed.');
    }
  };

  const handleChipClick = (suggestion: string) => {
    setTranscript(suggestion);
    handleProcessTranscript(suggestion);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Voice Health Assistant" maxWidth="max-w-xl">
      <div className="space-y-5 text-sm">
        {/* Safety Header */}
        <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl flex items-center gap-3 text-xs text-teal-200">
          <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
          <div>
            <span className="font-bold text-white">Voice Command Preview Guardrail</span>
            <p className="text-teal-300/80 mt-0.5">
              Actions modifying data require an explicit visual preview and user confirmation (Rule 12).
            </p>
          </div>
        </div>

        {/* Mic Control & Live Status */}
        <div className="flex flex-col items-center justify-center p-6 bg-navy-950 rounded-2xl border border-slate-800 space-y-4 text-center">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500 animate-pulse'
                : 'bg-teal-500/20 text-teal-400 border border-teal-500/40 hover:bg-teal-500/30 hover:scale-105'
            }`}
            title={isListening ? 'Stop listening' : 'Start microphone'}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <div>
            <p className="text-xs font-semibold text-slate-200">
              {isListening ? 'Listening to your microphone...' : 'Click mic to speak, or type command below'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Speech is transcribed client-side and safely parsed for structured actions.
            </p>
          </div>
        </div>

        {/* Transcript Input & Submit */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400">Command Transcript</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProcessTranscript();
                }
              }}
              placeholder="e.g. Schedule an appointment with Dr. House next week"
              className="flex-1 bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => handleProcessTranscript()}
              disabled={processing || !transcript.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Parse</span>
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div>
          <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">Try asking:</span>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              'Schedule consultation with doctor tomorrow',
              'Record blood pressure 120/80',
              'Search my recent blood work reports',
              'View my active prescriptions',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700/60 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview & Guardrail Confirmation Section */}
        {parsedIntent && (
          <div className="p-4 bg-navy-950 border border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Parsed Intent: {parsedIntent.intent}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                  parsedIntent.requiresConfirmation
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                    : 'bg-teal-950 text-teal-300 border border-teal-600/40'
                }`}
              >
                {parsedIntent.requiresConfirmation ? 'Confirmation Required' : 'Direct Navigation'}
              </span>
            </div>

            <p className="text-xs text-slate-200">{parsedIntent.naturalLanguageSummary}</p>

            {/* Preview Parameters */}
            {parsedIntent.previewData && Object.keys(parsedIntent.previewData).length > 0 && (
              <div className="p-2.5 bg-navy-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Preview Parameters:</span>
                {Object.entries(parsedIntent.previewData).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-teal-400">{k}:</span>
                    <span className="text-white">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Master Rule 12 Confirmation CTA */}
            {parsedIntent.requiresConfirmation ? (
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setParsedIntent(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndExecute}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Execute Action
                </button>
              </div>
            ) : (
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleConfirmAndExecute}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                >
                  Proceed to View
                </button>
              </div>
            )}

            {executionMessage && (
              <p className="text-xs text-teal-300 font-semibold text-center mt-2 animate-pulse">
                {executionMessage}
              </p>
            )}

            <p className="text-[10px] text-slate-500 italic text-center">
              {parsedIntent.disclaimer}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
