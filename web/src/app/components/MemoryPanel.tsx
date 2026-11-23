import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Search, HardDrive, Tag, Clock, Plus, Trash2 } from 'lucide-react';
import { api, useApp } from '../context/AppContext';
import { orb, mono, raj } from '../theme';

export function MemoryPanel() {
  const { memories, reloadMemories, addNotification } = useApp();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const allTags = [...new Set(memories.flatMap(m => m.tags))];
  const filtered = [...memories].reverse().filter(m => {
    const q = query.toLowerCase();
    return (!q || m.content.toLowerCase().includes(q)) && (!activeTag || m.tags.includes(activeTag));
  });

  const fmtTime = (ts: number) => {
    const diff = Date.now() - ts * 1000;
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const save = async () => {
    if (!draft.trim()) return;
    await api('/api/memories', 'POST', { content: draft.trim(), tags: [] });
    setDraft(''); setAdding(false); reloadMemories();
    addNotification({ type: 'success', title: 'MEMORY', message: 'Saved. Louis will remember this.' });
  };

  const remove = async (id: string) => {
    await api(`/api/memories/${id}`, 'DELETE');
    reloadMemories();
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span style={{ ...orb, color: '#a855f7', fontSize: '11px', letterSpacing: '0.15em' }}>MEMORY CORE</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" style={{ color: '#22c55e' }} />
          <span style={{ ...mono, color: 'rgba(34,197,94,0.7)', fontSize: '9px' }}>LOCAL · {memories.length}</span>
        </div>
      </div>

      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(168,85,247,0.6)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full rounded-lg pl-9 pr-4 py-2.5 outline-none"
          style={{ background: 'rgba(0,8,25,0.6)', border: '1px solid rgba(168,85,247,0.2)', color: 'rgba(255,255,255,0.8)', ...raj, fontSize: '13px' }}
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 flex-shrink-0">
          {allTags.map(tag => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer"
              style={{
                background: activeTag === tag ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.08)',
                border: `1px solid ${activeTag === tag ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.15)'}`,
              }}
            >
              <Tag className="w-2.5 h-2.5" style={{ color: '#a855f7' }} />
              <span style={{ ...mono, color: activeTag === tag ? '#a855f7' : 'rgba(168,85,247,0.7)', fontSize: '9px' }}>{tag}</span>
            </motion.button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {filtered.length === 0 && (
          <p style={{ ...raj, color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.5 }}>
            Nothing here yet. Tell Louis things like “remember I'm learning Rust” and they'll appear here.
          </p>
        )}
        <AnimatePresence>
          {filtered.map((mem, i) => (
            <motion.div
              key={mem.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="rounded-xl p-3 group"
              style={{ background: 'rgba(0,8,25,0.5)', border: '1px solid rgba(168,85,247,0.12)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p style={{ ...raj, color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.4 }}>{mem.content}</p>
                <button onClick={() => remove(mem.id)} title="Forget this" className="opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0">
                  <Trash2 className="w-3 h-3" style={{ color: 'rgba(239,68,68,0.7)' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {mem.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', ...mono, color: '#a855f7', fontSize: '8px' }}>{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                  <span style={{ ...mono, color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>{fmtTime(mem.timestamp)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {adding ? (
        <div className="flex gap-2 flex-shrink-0">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Something Louis should remember..."
            className="flex-1 rounded-lg px-3 py-2 outline-none"
            style={{ background: 'rgba(0,8,25,0.6)', border: '1px solid rgba(168,85,247,0.3)', color: 'rgba(255,255,255,0.85)', ...raj, fontSize: '13px' }}
          />
          <button onClick={save} className="px-3 rounded-lg cursor-pointer" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', ...mono, color: '#a855f7', fontSize: '10px' }}>SAVE</button>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAdding(true)}
          className="w-full py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px dashed rgba(168,85,247,0.3)' }}
        >
          <Plus className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />
          <span style={{ ...mono, color: 'rgba(168,85,247,0.7)', fontSize: '10px' }}>ADD MEMORY</span>
        </motion.button>
      )}
    </div>
  );
}
