import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Mic, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { api, useApp } from '../context/AppContext';
import { orb, mono, raj } from '../theme';

function Toggle({ label, value, onChange, color = '#00f5ff' }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ ...raj, color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full relative cursor-pointer"
        style={{ background: value ? `${color}30` : 'rgba(255,255,255,0.06)', border: `1px solid ${value ? color : 'rgba(255,255,255,0.12)'}` }}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-5 h-5 rounded-full"
          style={{ background: value ? color : 'rgba(255,255,255,0.3)', boxShadow: value ? `0 0 8px ${color}` : 'none' }}
        />
      </button>
    </div>
  );
}

const label = { ...mono, color: 'rgba(255,255,255,0.4)', fontSize: '10px' };

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, status, refreshStatus, addNotification } = useApp();
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.6);
  const [speakTyped, setSpeakTyped] = useState(false);

  useEffect(() => {
    if (settingsOpen && status) {
      setModel(status.model);
      setTemperature(status.temperature);
      setSpeakTyped(status.speak_typed);
    }
  }, [settingsOpen, status]);

  const save = async () => {
    await api('/api/settings', 'POST', { model, temperature, speak_typed: speakTyped });
    refreshStatus();
    setSettingsOpen(false);
    addNotification({ type: 'success', title: 'SETTINGS SAVED', message: `Now using ${model}.` });
  };

  return (
    <AnimatePresence>
      {settingsOpen && status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 180, background: 'rgba(0, 4, 12, 0.92)', backdropFilter: 'blur(12px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg mx-6 rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh', background: 'rgba(0, 10, 25, 0.95)', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 60px rgba(0,245,255,0.1)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,245,255,0.12)' }}>
              <div>
                <h2 style={{ ...orb, color: '#00f5ff', fontSize: '15px', letterSpacing: '0.2em', margin: 0 }}>SETTINGS</h2>
                <p style={{ ...mono, color: 'rgba(0,245,255,0.4)', fontSize: '10px', marginTop: 4 }}>Names, wake words and voice live in the .env file</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <X className="w-4 h-4" style={{ color: '#ef4444' }} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: '#a855f7' }} />
                  <span style={{ ...mono, color: '#a855f7', fontSize: '11px' }}>BRAIN</span>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span style={label}>MODEL (FROM OLLAMA)</span>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                    style={{ background: 'rgba(0,5,15,0.9)', border: '1px solid rgba(168,85,247,0.25)', color: 'rgba(255,255,255,0.85)', ...raj, fontSize: '13px' }}
                  >
                    {(status.models.length ? status.models : [status.model]).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span style={{ ...raj, color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Web search, memory and Desktop tidy need a model with tool support, like qwen3.</span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span style={label}>CREATIVITY</span>
                    <span style={{ ...mono, color: '#a855f7', fontSize: '10px' }}>{temperature.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1.2" step="0.05" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full" />
                </label>
              </section>

              <section className="flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <span style={{ ...mono, color: '#22c55e', fontSize: '11px' }}>VOICE</span>
                </div>
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: status.voice ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${status.voice ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  {status.voice ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} /> : <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />}
                  <span style={{ ...raj, color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    {status.voice
                      ? `Listening for: ${status.wake_words.join(', ')}`
                      : status.voice_error ? `Voice is off: ${status.voice_error}` : 'Voice is starting up...'}
                  </span>
                </div>
                <Toggle label="Also speak replies to typed messages" value={speakTyped} onChange={setSpeakTyped} color="#22c55e" />
              </section>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,245,255,0.08)' }}>
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 rounded-xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', ...mono, color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>CANCEL</button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={save}
                className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer"
                style={{ background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.35)', boxShadow: '0 0 12px rgba(0,245,255,0.1)' }}
              >
                <Save className="w-3.5 h-3.5" style={{ color: '#00f5ff' }} />
                <span style={{ ...mono, color: '#00f5ff', fontSize: '10px' }}>SAVE</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
