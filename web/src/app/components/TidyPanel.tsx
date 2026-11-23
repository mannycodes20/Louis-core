import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderTree, X, Check, Undo2, FileText } from 'lucide-react';
import { api, useApp } from '../context/AppContext';
import { orb, mono, raj } from '../theme';

/** Shows Louis's Desktop tidy plan. Nothing moves until you press "Tidy now". */
export function TidyPanel() {
  const { tidyPlan, setTidyPlan, addNotification } = useApp();
  const [working, setWorking] = useState(false);

  const apply = async () => {
    setWorking(true);
    const r = await api<{ summary: string }>('/api/tidy/apply', 'POST');
    setWorking(false);
    setTidyPlan(null);
    addNotification({ type: 'success', title: 'DESKTOP TIDIED', message: r.summary });
  };

  const undo = async () => {
    const r = await api<{ summary: string }>('/api/tidy/undo', 'POST');
    addNotification({ type: 'info', title: 'DESKTOP', message: r.summary });
  };

  const grouped = (tidyPlan?.moves ?? []).reduce<Record<string, string[]>>((acc, m) => {
    (acc[m.folder] ??= []).push(m.file);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {tidyPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 170, background: 'rgba(0, 4, 12, 0.85)', backdropFilter: 'blur(10px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-6 rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '80vh', background: 'rgba(0, 10, 25, 0.95)', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 60px rgba(0,245,255,0.1)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,245,255,0.12)' }}>
              <div className="flex items-center gap-3">
                <FolderTree className="w-5 h-5" style={{ color: '#00f5ff' }} />
                <div>
                  <h2 style={{ ...orb, color: '#00f5ff', fontSize: '14px', letterSpacing: '0.2em', margin: 0 }}>DESKTOP SCAN</h2>
                  <p style={{ ...mono, color: 'rgba(0,245,255,0.4)', fontSize: '10px', marginTop: 2 }}>{tidyPlan.desktop}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTidyPlan(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <X className="w-4 h-4" style={{ color: '#ef4444' }} />
              </motion.button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex flex-col gap-3">
              <p style={{ ...raj, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.5 }}>{tidyPlan.summary}</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                {Object.entries(grouped).map(([folder, files]) => (
                  <div key={folder} className="rounded-xl p-3" style={{ background: 'rgba(0,8,20,0.5)', border: '1px solid rgba(0,245,255,0.12)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ ...mono, color: '#00f5ff', fontSize: '10px' }}>{folder.toUpperCase()}</span>
                      <span style={{ ...orb, color: '#00f5ff', fontSize: '11px' }}>{files.length}</span>
                    </div>
                    {files.slice(0, 5).map(f => (
                      <div key={f} className="flex items-center gap-1.5 py-0.5 min-w-0">
                        <FileText className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span className="truncate" style={{ ...raj, color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>{f}</span>
                      </div>
                    ))}
                    {files.length > 5 && <span style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>+{files.length - 5} more</span>}
                  </div>
                ))}
              </div>
              <p style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                {tidyPlan.kept} SHORTCUTS AND FOLDERS STAY PUT · FILES ARE NEVER DELETED OR OVERWRITTEN · YOU CAN UNDO
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,245,255,0.08)' }}>
              <button onClick={undo} className="flex items-center gap-2 cursor-pointer">
                <Undo2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ ...mono, color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>UNDO LAST TIDY</span>
              </button>
              <div className="flex gap-3">
                <button onClick={() => setTidyPlan(null)} className="px-4 py-2 rounded-xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', ...mono, color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>NOT NOW</button>
                {tidyPlan.moves.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={working}
                    onClick={apply}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 0 12px rgba(34,197,94,0.15)' }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                    <span style={{ ...mono, color: '#22c55e', fontSize: '10px' }}>{working ? 'MOVING...' : `TIDY NOW (${tidyPlan.moves.length} FILES)`}</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
